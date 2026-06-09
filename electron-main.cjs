const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;
const { spawn } = require('child_process');

// Global error logger to capture any packaged app crash
const logFile = path.join(app.getPath('userData'), 'deskpet-error.log');
function logError(message, error) {
  const time = new Date().toISOString();
  const logMessage = `[${time}] ${message}\n${error && error.stack ? error.stack : error}\n\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    // Ignore logging failures
  }
}

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception in Main Process', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection in Main Process', reason);
});

const appId = 'com.desktop.pet';
try {
  app.setAppUserModelId(appId);
} catch (error) {
  // Windows에서 앱 아이디 설정이 실패하더라도 계속 실행
}

let petWindow;
let serverProcess = null;
let calendarWindow = null;
let tray = null;
let isCalendarVisible = false;

const APP_INDEX_CACHE = {
  built: false,
  apps: [],
};

function normalizeAppKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandEnvVars(value) {
  return String(value || '').replace(/%([^%]+)%/g, (_, name) => process.env[name] || `%${name}%`);
}

function stripTrailingArgs(value) {
  let text = String(value || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  text = expandEnvVars(text);
  text = text.replace(/,\s*\d+\s*$/i, '');
  return text.trim();
}

function isUrlLike(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(String(value || '').trim());
}

function splitCommandAndArgs(command) {
  const text = stripTrailingArgs(command);
  if (!text) return { file: '', args: [] };
  if (isUrlLike(text)) return { file: text, args: [] };
  if (text.includes('"')) {
    const firstQuote = text.indexOf('"');
    const secondQuote = text.indexOf('"', firstQuote + 1);
    if (firstQuote === 0 && secondQuote > 0) {
      const file = text.slice(1, secondQuote);
      const args = text.slice(secondQuote + 1).trim().split(/\s+/).filter(Boolean);
      return { file, args };
    }
  }
  const parts = text.split(/\s+/);
  if (parts.length === 1) return { file: text, args: [] };
  return { file: parts[0], args: parts.slice(1) };
}

function uniqueByKey(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function walkLimited(rootDir, maxDepth, visitor, depth = 0) {
  if (depth > maxDepth) return;
  const entries = safeReadDir(rootDir);
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkLimited(fullPath, maxDepth, visitor, depth + 1);
      continue;
    }
    visitor(fullPath, entry.name, depth);
  }
}

function guessAliases(name) {
  const key = normalizeAppKey(name);
  const aliases = [];
  if (!key) return aliases;

  if (key.includes('youtube')) aliases.push('유튜브', '유투브', 'youtube');
  if (key.includes('kakao')) aliases.push('카카오톡', '카톡', 'kakaotalk');
  if (key.includes('discord')) aliases.push('디스코드');
  if (key.includes('chrome')) aliases.push('크롬', '구글 크롬');
  if (key.includes('steam')) aliases.push('스팀');
  if (key.includes('vscode') || key.includes('visual studio code') || key.includes('visualstudio')) aliases.push('vscode', '비주얼 스튜디오 코드');
  if (key.includes('notepad')) aliases.push('메모장');
  if (key.includes('spotify')) aliases.push('스포티파이');
  if (key.includes('edge')) aliases.push('엣지', 'microsoft edge');

  return uniqueByKey(aliases, normalizeAppKey);
}

function createAppRecord({ name, launchType, launchTarget, source, aliases = [] }) {
  const cleanName = String(name || '').trim();
  const cleanTarget = String(launchTarget || '').trim();
  const mergedAliases = uniqueByKey([cleanName, ...aliases, ...guessAliases(cleanName)], normalizeAppKey).filter(Boolean);
  return {
    name: cleanName,
    launchType,
    launchTarget: cleanTarget,
    source,
    aliases: mergedAliases,
  };
}

function mergeAppRecord(appMap, record) {
  const primaryKey = normalizeAppKey(record.name || record.launchTarget);
  if (!primaryKey) return;

  const existing = appMap.get(primaryKey);
  if (!existing) {
    appMap.set(primaryKey, record);
    return;
  }

  const merged = {
    ...existing,
    launchTarget: existing.launchTarget || record.launchTarget,
    launchType: existing.launchTarget ? existing.launchType : record.launchType,
    source: uniqueByKey([existing.source, record.source].filter(Boolean), normalizeAppKey).join(', '),
    aliases: uniqueByKey([...(existing.aliases || []), ...(record.aliases || [])], normalizeAppKey),
  };
  appMap.set(primaryKey, merged);
}

function addAliasIndex(appMap, aliasIndex, record) {
  const canonicalKey = normalizeAppKey(record.name || record.launchTarget);
  if (!canonicalKey) return;
  const aliases = uniqueByKey([record.name, ...(record.aliases || [])], normalizeAppKey);
  for (const alias of aliases) {
    const key = normalizeAppKey(alias);
    if (!key) continue;
    if (!aliasIndex.has(key)) aliasIndex.set(key, canonicalKey);
  }
}

function parseRegQueryOutput(output) {
  const entries = [];
  let current = null;

  for (const rawLine of String(output || '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue;

    if (/^HKEY_/i.test(rawLine.trim())) {
      if (current) entries.push(current);
      current = { key: rawLine.trim(), values: {} };
      continue;
    }

    const valueMatch = rawLine.match(/^\s{4}(.+?)\s+REG_[A-Z_]+\s+(.*)$/i);
    if (valueMatch && current) {
      const [, valueName, valueData] = valueMatch;
      current.values[valueName.trim()] = valueData.trim();
    }
  }

  if (current) entries.push(current);
  return entries;
}

function runRegQuery(rootKey) {
  try {
    return require('child_process').execFileSync('reg', ['query', rootKey, '/s'], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    return '';
  }
}

function findExecutableInFolder(folder, hintName) {
  const root = path.resolve(folder);
  if (!fs.existsSync(root)) return '';

  const hint = normalizeAppKey(hintName);
  let best = '';
  let bestScore = 0;
  let seen = 0;
  const MAX_FILES = 1200;

  walkLimited(root, 2, (fullPath, fileName) => {
    if (seen >= MAX_FILES) return;
    if (!fileName.toLowerCase().endsWith('.exe')) return;
    seen += 1;
    const base = normalizeAppKey(path.basename(fileName, '.exe'));
    let score = 0;
    if (!hint || !base) score = 1;
    else if (base === hint) score = 100;
    else if (base.includes(hint)) score = 80;
    else if (hint.includes(base)) score = 70;
    else {
      const distance = Math.abs(base.length - hint.length);
      if (distance <= 3 && (base[0] === hint[0] || base[base.length - 1] === hint[hint.length - 1])) {
        score = 40;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = fullPath;
    }
  });

  return best;
}

function scanStartMenuApps(appMap, aliasIndex) {
  const startMenuRoots = [
    path.join(process.env.PROGRAMDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ].filter(Boolean);

  for (const root of startMenuRoots) {
    if (!fs.existsSync(root)) continue;

    walkLimited(root, 4, (fullPath, fileName) => {
      const lower = fileName.toLowerCase();
      if (!lower.endsWith('.lnk') && !lower.endsWith('.url')) return;

      const name = path.basename(fileName, path.extname(fileName));
      let launchType = lower.endsWith('.url') ? 'url' : 'shortcut';
      let launchTarget = fullPath;

      if (lower.endsWith('.url')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const urlMatch = content.match(/^URL=(.+)$/mi);
          if (urlMatch && urlMatch[1]) {
            launchTarget = urlMatch[1].trim();
          }
        } catch {
          // Fallback if parsing fails.
        }
      }

      const record = createAppRecord({
        name,
        launchType,
        launchTarget,
        source: 'start-menu',
      });
      mergeAppRecord(appMap, record);
      addAliasIndex(appMap, aliasIndex, record);
    });
  }
}

function scanRegistryApps(appMap, aliasIndex) {
  const roots = [
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const root of roots) {
    const output = runRegQuery(root);
    if (!output) continue;

    const entries = parseRegQueryOutput(output);
    for (const entry of entries) {
      const values = entry.values || {};
      const displayName = values.DisplayName;
      if (!displayName) continue;

      const displayIcon = stripTrailingArgs(values.DisplayIcon || '');
      const installLocation = stripTrailingArgs(values.InstallLocation || '');
      const uninstallString = stripTrailingArgs(values.UninstallString || '');

      let launchTarget = '';
      let launchType = 'exe';

      if (displayIcon && (displayIcon.toLowerCase().endsWith('.exe') || displayIcon.toLowerCase().endsWith('.lnk') || displayIcon.toLowerCase().endsWith('.url'))) {
        launchTarget = displayIcon;
        if (launchTarget.toLowerCase().endsWith('.lnk')) launchType = 'shortcut';
        else if (launchTarget.toLowerCase().endsWith('.url') || isUrlLike(launchTarget)) launchType = 'url';
      }

      if (!launchTarget && installLocation) {
        const executable = findExecutableInFolder(installLocation, displayName);
        if (executable) {
          launchTarget = executable;
          launchType = 'exe';
        }
      }

      if (!launchTarget && uninstallString) {
        const candidate = splitCommandAndArgs(uninstallString).file;
        if (candidate && (candidate.toLowerCase().endsWith('.exe') || isUrlLike(candidate))) {
          launchTarget = candidate;
          launchType = isUrlLike(candidate) ? 'url' : 'exe';
        }
      }

      const record = createAppRecord({
        name: displayName,
        launchType,
        launchTarget,
        source: 'registry',
      });
      mergeAppRecord(appMap, record);
      addAliasIndex(appMap, aliasIndex, record);
    }
  }
}

function scanExecutableApps(appMap, aliasIndex) {
  const possibleRoots = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    path.join(process.env.LOCALAPPDATA || '', 'Programs'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps'),
  ].filter(Boolean);

  for (const root of possibleRoots) {
    if (!fs.existsSync(root)) continue;

    walkLimited(root, 3, (fullPath, fileName) => {
      if (!fileName.toLowerCase().endsWith('.exe')) return;
      const stat = safeStat(fullPath);
      if (!stat || !stat.isFile()) return;
      if (stat.size === 0) return;

      const name = path.basename(fileName, '.exe');
      const record = createAppRecord({
        name,
        launchType: 'exe',
        launchTarget: fullPath,
        source: 'exe-scan',
      });
      mergeAppRecord(appMap, record);
      addAliasIndex(appMap, aliasIndex, record);
    });
  }
}

function buildInstalledAppIndex() {
  if (APP_INDEX_CACHE.built) return APP_INDEX_CACHE.apps;

  const appMap = new Map();
  const aliasIndex = new Map();

  const builtinApps = [
    createAppRecord({ name: 'YouTube', launchType: 'url', launchTarget: 'https://www.youtube.com', source: 'builtin', aliases: ['유튜브', '유투브'] }),
    createAppRecord({ name: 'Google', launchType: 'url', launchTarget: 'https://www.google.com', source: 'builtin', aliases: ['구글'] }),
    createAppRecord({ name: 'Gmail', launchType: 'url', launchTarget: 'https://mail.google.com', source: 'builtin', aliases: ['지메일', '메일'] }),
    createAppRecord({ name: 'ChatGPT', launchType: 'url', launchTarget: 'https://chatgpt.com', source: 'builtin', aliases: ['챗지피티', '챗gpt'] }),
  ];

  for (const record of builtinApps) {
    mergeAppRecord(appMap, record);
    addAliasIndex(appMap, aliasIndex, record);
  }

  scanStartMenuApps(appMap, aliasIndex);
  scanRegistryApps(appMap, aliasIndex);
  scanExecutableApps(appMap, aliasIndex);

  const records = [...appMap.values()]
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  APP_INDEX_CACHE.apps = records;
  APP_INDEX_CACHE.aliasIndex = aliasIndex;
  APP_INDEX_CACHE.built = true;
  return records;
}

function scoreAppMatch(query, record) {
  const q = normalizeAppKey(query);
  if (!q) return 0;

  const names = [record.name, ...(record.aliases || [])].filter(Boolean);
  let best = 0;
  for (const name of names) {
    const n = normalizeAppKey(name);
    if (!n) continue;
    if (n === q) return 100;
    if (n.includes(q)) best = Math.max(best, 90);
    else if (q.includes(n)) best = Math.max(best, 80);
    else {
      const compactN = n.replace(/\s+/g, '');
      const compactQ = q.replace(/\s+/g, '');
      if (compactN === compactQ) best = Math.max(best, 95);
      else if (compactN.includes(compactQ)) best = Math.max(best, 85);
      else if (compactQ.includes(compactN)) best = Math.max(best, 75);
    }
  }

  return best;
}

function findBestAppMatch(query) {
  const apps = buildInstalledAppIndex();
  let best = null;
  let bestScore = 0;

  for (const record of apps) {
    const score = scoreAppMatch(query, record);
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  }

  return best && bestScore >= 70 ? best : null;
}

async function launchAppRecord(record) {
  if (!record) {
    return { success: false, message: '앱을 찾을 수 없습니다.' };
  }

  try {
    const target = stripTrailingArgs(record.launchTarget);

    if (!target) {
      return { success: false, message: `${record.name}의 실행 경로를 찾지 못했어요.` };
    }

    if (record.launchType === 'url' || isUrlLike(target)) {
      await shell.openExternal(target);
      return { success: true, opened: target, name: record.name };
    }

    if (record.launchType === 'shortcut') {
      const cmd = spawn('cmd', ['/c', 'start', '""', target], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      cmd.unref();
      return { success: true, opened: target, name: record.name };
    }

    const { file, args } = splitCommandAndArgs(target);
    const launchFile = target.toLowerCase().endsWith('.exe') ? target : file;
    const launchArgs = target.toLowerCase().endsWith('.exe') ? [] : args;
    const child = spawn(launchFile, launchArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return { success: true, opened: launchFile, name: record.name };
  } catch (error) {
    return { success: false, message: error && error.message ? error.message : '앱 실행에 실패했어요.' };
  }
}

function isWindowVisible(win) {
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

function togglePetWindow() {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (isWindowVisible(petWindow)) {
    petWindow.hide();
  } else {
    petWindow.show();
    petWindow.focus();
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }
}

function toggleCalendarWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('toggle-calendar-external');
  }
}

function getTrayIcon() {
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAQCAYAAADJViUEAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBwYWludC5uZXQgNC4yLjE6YxVVwQAAAGZJREFUOE9jZKAQMGL4z0AEYGBgYGJgYGBgYFBgYGJgYGBgYGAAAAAP//AwD//wMAQBo3GSYAAAAASUVORK5CYII='
  ).resize({ width: 16, height: 16 });
}

function updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: isWindowVisible(petWindow) ? 'Hide DeskPet' : 'Show DeskPet',
      click: () => {
        togglePetWindow();
        updateTrayMenu();
      },
    },
    {
      label: isCalendarVisible ? 'Hide Calendar' : 'Show Calendar',
      click: () => {
        toggleCalendarWindow();
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('AI DeskPet');
}

function createTray() {
  if (tray) return;

  tray = new Tray(getTrayIcon());
  tray.on('click', () => {
    togglePetWindow();
    updateTrayMenu();
  });
  tray.on('double-click', () => {
    togglePetWindow();
    updateTrayMenu();
  });

  updateTrayMenu();
}

function startServer() {
  // 개발 모드에서는 이미 npm run dev로 서버 실행 중
  if (!app.isPackaged) return;

  // Set NODE_ENV to production explicitly so server.cjs knows it's fully in production
  process.env.NODE_ENV = 'production';

  const serverPath = path.join(process.resourcesPath, 'server.cjs');
  console.log('Loading packaged server from:', serverPath);

  try {
    // Attempt to require the server in-process (extremely reliable, requires no global node installation!)
    require(serverPath);
    console.log('Server loaded successfully in-process');
  } catch (err) {
    console.error('Failed to run server in-process, trying spawn fallback:', err);
    logError('In-process server load failed, falling back to spawn', err);
    try {
      serverProcess = spawn('node', [serverPath], {
        detached: false,
        stdio: 'ignore'
      });
      serverProcess.on('error', (spawnErr) => {
        console.error('Spawn server process failed:', spawnErr);
        logError('Spawn server process error event', spawnErr);
      });
      serverProcess.unref();
    } catch (spawnErr) {
      console.error('Fatal spawn server error:', spawnErr);
      logError('Fatal spawn server failure', spawnErr);
    }
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (isDev) {
    petWindow.loadURL('http://localhost:3000');
  } else {
    petWindow.loadFile(indexPath);
  }

  petWindow.once('ready-to-show', () => {
    if (petWindow) {
      petWindow.show();
      petWindow.focus();
    }
  });

  petWindow.webContents.once('did-finish-load', () => {
    if (petWindow) {
      petWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  petWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Pet window failed to load:', errorCode, errorDescription, validatedURL);
    if (petWindow && !petWindow.isVisible()) {
      petWindow.show();
      petWindow.focus();
    }
  });

  setTimeout(() => {
    if (petWindow && !petWindow.isVisible()) {
      petWindow.show();
      petWindow.focus();
    }
  }, 3000);

  if (isDev) {
    // 개발자 도구는 필요할 때만 켜세요.
    // win.webContents.openDevTools({ mode: 'detach' });
  }
  petWindow.setVisibleOnAllWorkspaces(true);
}

function createCalendarWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  calendarWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    backgroundColor: '#00000000',

    transparent: true,
    frame: false,

    resizable: false,
    skipTaskbar: true,

    focusable: true,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (isDev) {
    calendarWindow.loadURL('http://localhost:3000/#/calendar');
  } else {
    calendarWindow.loadFile(indexPath, {
      hash: '/calendar',
    });
  }

  calendarWindow.webContents.once('did-finish-load', () => {
    if (calendarWindow) {
      calendarWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  calendarWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Calendar window failed to load:', errorCode, errorDescription, validatedURL);
  });

  calendarWindow.setVisibleOnAllWorkspaces(true);
  calendarWindow.setAlwaysOnTop(false);
}

ipcMain.on('pet-hover', () => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('pet-leave', () => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

ipcMain.on('calendar-state-changed', (event, visible) => {
  isCalendarVisible = visible;
  updateTrayMenu();
});

// IPC Handler to return a list of parsed installed apps for React
ipcMain.handle('get-installed-apps', async () => {
  try {
    return buildInstalledAppIndex();
  } catch (error) {
    console.error('Error listing installed apps:', error);
    return [];
  }
});

// IPC Handler to launch an app by name from React
ipcMain.handle('launch-installed-app', async (event, appName) => {
  try {
    const record = findBestAppMatch(appName);
    if (!record) {
      return { success: false, message: `"${appName}" 앱을 찾을 수 없었습니다.` };
    }
    return await launchAppRecord(record);
  } catch (error) {
    return { success: false, message: error && error.message ? error.message : '실행오류' };
  }
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
        name: 'AI DeskPet',
      });
    } catch (err) {
      console.error('Failed to set login item settings:', err);
      logError('Failed to set login item settings (openAtLogin)', err);
    }
  }

  try {
    startServer();
  } catch (err) {
    console.error('Failed to start server:', err);
    logError('Failed to start server', err);
  }

  try {
    createWindow();
  } catch (err) {
    console.error('Failed to create main window:', err);
    logError('Failed to create main window', err);
  }

  try {
    createTray();
  } catch (err) {
    console.error('Failed to create tray:', err);
    logError('Failed to create tray', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from './components/Calendar';
import { Pet } from './components/Pet';
import { Chat } from './components/Chat';
import { Status } from './components/Status';
import { PetStatus, CalendarEvent, ChatMessage } from './types';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Monitor, Bell, Settings, Power, Calendar as CalendarIcon, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';

const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;
const apiBase = isElectron ? 'http://localhost:3000' : '';

const currentPath = typeof window !== 'undefined' ? window.location.hash : '';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const statusDragControls = useDragControls();
  const calendarDragControls = useDragControls();
  const calendarWebDragControls = useDragControls();
  
  const [status, setStatus] = useState<PetStatus>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_status');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      hunger: 80,
      happiness: 90,
      energy: 100,
    };
  });
  
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_calendar_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      { id: '1', date: new Date().toISOString(), title: 'AI Pet Project Launch', description: 'Complete the AI Pet prototype!' },
      { id: '2', date: new Date(Date.now() + 86400000).toISOString(), title: 'User Feedback Review', description: 'Check user requests for Moni.' },
    ];
  });

  const [installedApps, setInstalledApps] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_chat_messages');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      { role: 'model', parts: [{ text: '안녕! 나는 네 모니터 속 비서 Moni야! 무엇을 도와줄까? ✨' }] }
    ];
  });

  const [isTalking, setIsTalking] = useState(false);
  const [isCalendarLocked, setIsCalendarLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moni_calendar_locked') === 'true';
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [lastModelMessage, setLastModelMessage] = useState('');
  const [calendarColor, setCalendarColor] = useState('#000000');
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showCalendarOverlay, setShowCalendarOverlay] = useState(false);

  // Status & customization states
  const [showStatusOverlay, setShowStatusOverlay] = useState(false);
  const [petLevel, setPetLevel] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_level');
      if (saved) return Number(saved);
    }
    return 1;
  });
  const [petExp, setPetExp] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_exp');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [petFavorability, setPetFavorability] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_favorability');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [petScale, setPetScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_scale');
      if (saved) return Math.max(30, Number(saved));
    }
    return 100; // default 100%
  });
  const [petHue, setPetHue] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_hue');
      if (saved) return Number(saved);
    }
    return 250; // default 250 (Indigo)
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moni_calendar_dark_mode') === 'true';
    }
    return false;
  });

  const rewardLockRef = useRef(0);

  const [isPetVisible, setIsPetVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_pet_visible');
      if (saved !== null) return saved === 'true';
    }
    return true; // default visible
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isElectron || !ipcRenderer) return;

    let cancelled = false;

    const loadApps = async () => {
      try {
        const result = await ipcRenderer.invoke('get-installed-apps');
        if (cancelled) return;

        const names = Array.isArray(result)
          ? result.map((item: any) => typeof item === 'string' ? item : item?.name).filter(Boolean)
          : [];

        setInstalledApps(names);
      } catch (error) {
        console.error('Failed to load installed apps:', error);
      }
    };

    loadApps();

    return () => {
      cancelled = true;
    };
  }, []);
  
  // Alarm clock schedule reminder check (every 5 seconds)
  useEffect(() => {
    const alarmTicker = setInterval(() => {
      const now = new Date();
      // Format today's date parts
      const todayStr = format(now, 'yyyy-MM-dd');
      const currentHM = format(now, 'HH:mm');

      // Find an event scheduled for today at the current time that has not run alert yet
      const dueEvent = events.find(event => {
        if (event.alerted) return false;
        if (event.alertEnabled === false) return false;

        const eventDate = new Date(event.date);
        const eventDateStr = format(eventDate, 'yyyy-MM-dd');
        const isToday = eventDateStr === todayStr;

        const eventTime = event.time; // "HH:MM"
        if (!eventTime) return false;

        return isToday && eventTime === currentHM;
      });

      if (dueEvent) {
        // Mark event as alerted
        setEvents(prev => prev.map(e => e.id === dueEvent.id ? { ...e, alerted: true } : e));

        // Create alert messages for Moni to voice out
        const alertMsg = `⏰ 따르릉! 지금은 ${dueEvent.time} 이에요! "${dueEvent.title}" 일정을 시작할 시간이에요! 📢${dueEvent.description ? `\n(메모: ${dueEvent.description})` : ''}`;
        
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: alertMsg }]
        }]);
        setLastModelMessage(`⏰ "${dueEvent.title}" 일정이 지금 시작해요!`);
        setIsTalking(true);

        // Sound alert tone with HTML5 Web Audio API Synth beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          // Cute twin notes scale pattern
          oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (e) {
          console.warn('Audio feedback failed', e);
        }

        setTimeout(() => {
          setIsTalking(false);
          setLastModelMessage('');
        }, 12000);
      }
    }, 5000);

    return () => clearInterval(alarmTicker);
  }, [events]);

  // Save status, events, and messages to localStorage on change
  useEffect(() => {
    localStorage.setItem('moni_pet_status', JSON.stringify(status));
  }, [status]);

  useEffect(() => {
    localStorage.setItem('moni_calendar_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('moni_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => { localStorage.setItem('moni_pet_exp', String(petExp)); }, [petExp]);
  useEffect(() => { localStorage.setItem('moni_pet_favorability', String(petFavorability)); }, [petFavorability]);

  useEffect(() => {
    localStorage.setItem('moni_pet_visible', String(isPetVisible));
    if (!isPetVisible) {
      setShowCalendarOverlay(false);
      setShowStatusOverlay(false);
    }
  }, [isPetVisible]);

  useEffect(() => {
    localStorage.setItem('moni_calendar_locked', String(isCalendarLocked));
  }, [isCalendarLocked]);

  useEffect(() => {
    const getLevelRequirement = (level:number) => 50 + level * 50;

    const onReward = () => {
      const now = Date.now();
      if (now - rewardLockRef.current < 300) return;
      rewardLockRef.current = now;

      setPetFavorability(prev => {
        const nextAffection = Math.min(100, prev + 2);
        const bonus = nextAffection >= 100 ? 0.5 : nextAffection >= 60 ? 0.3 : nextAffection >= 30 ? 0.1 : 0;
        const gain = Math.round(5 * (1 + bonus));

        setPetExp(prevExp => {
          let exp = prevExp + gain;
          let lvl = petLevel;
          let isLvlUp = false;

          while (lvl < 10 && exp >= getLevelRequirement(lvl)) {
            exp -= getLevelRequirement(lvl);
            lvl++;
            isLvlUp = true;
          }

          if (lvl !== petLevel) {
            setPetLevel(lvl);
          }

          // 귀여운 캐릭터 대사 및 경험치/호감도 상승 안내
          const dialogText = isLvlUp
            ? `축하해! 할 일을 마쳐서 내 레벨이 ${lvl}로 올랐어! 🎉 정말 고마워! 🎈💕 (경험치 +${gain}P, 호감도 +2)`
            : `와, 대단해! 할 일을 멋지게 끝마쳤구나! ✨ 하루하루 발전하는 네 모습이 너무 멋져! 😍 (경험치 +${gain}P, 호감도 +2)`;

          setMessages(prevMsgs => [...prevMsgs, { role: 'model', parts: [{ text: dialogText }] }]);
          setLastModelMessage(dialogText);
          setIsTalking(true);

          // 부드럽고 가벼운 효과음 재생 (Web Audio API Sine wave)
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sine';
            const t = audioCtx.currentTime;

            osc.frequency.setValueAtTime(523.25, t); // C5
            osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, t + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, t + 0.24); // C6

            gainNode.gain.setValueAtTime(0.012, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(t + 0.5);
          } catch (e) {
            console.warn('Audio feedback failed', e);
          }

          setTimeout(() => {
            setIsTalking(false);
            setLastModelMessage('');
          }, 5500);

          return exp;
        });

        return nextAffection;
      });
    };
    const onPenalty = () => setPetFavorability(v => Math.max(0, v - 5));
    window.addEventListener('moni-todo-complete', onReward);
    window.addEventListener('moni-todo-fail', onPenalty);
    return () => {
      window.removeEventListener('moni-todo-complete', onReward);
      window.removeEventListener('moni-todo-fail', onPenalty);
    };
  }, [petExp, petLevel, petFavorability]);

  useEffect(() => {
    localStorage.setItem('moni_pet_level', String(petLevel));
  }, [petLevel]);

  // Sync state between windows on storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'moni_pet_status' && e.newValue) {
          setStatus(JSON.parse(e.newValue));
        }
        if (e.key === 'moni_calendar_events' && e.newValue) {
          setEvents(JSON.parse(e.newValue));
        }
        if (e.key === 'moni_chat_messages' && e.newValue) {
          setMessages(JSON.parse(e.newValue));
        }
        if (e.key === 'moni_pet_level' && e.newValue) {
          setPetLevel(Number(e.newValue));
        }
        if (e.key === 'moni_pet_exp' && e.newValue) {
          setPetExp(Number(e.newValue));
        }
        if (e.key === 'moni_pet_favorability' && e.newValue) {
          setPetFavorability(Number(e.newValue));
        }
        if (e.key === 'moni_pet_scale' && e.newValue) {
          setPetScale(Math.max(30, Number(e.newValue)));
        }
        if (e.key === 'moni_pet_hue' && e.newValue) {
          setPetHue(Number(e.newValue));
        }
        if (e.key === 'moni_pet_visible' && e.newValue) {
          setIsPetVisible(e.newValue === 'true');
        }
        if (e.key === 'moni_calendar_dark_mode' && e.newValue) {
          setIsDarkMode(e.newValue === 'true');
        }
        if (e.key === 'moni_calendar_locked' && e.newValue) {
          setIsCalendarLocked(e.newValue === 'true');
        }
      } catch (err) {
        console.error("Storage sync parse error:", err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Electron: Sync showCalendarOverlay state to the main process
  useEffect(() => {
    if (isElectron && ipcRenderer) {
      ipcRenderer.send('calendar-state-changed', showCalendarOverlay);
    }
  }, [showCalendarOverlay]);

  // Electron: Receive tray menu toggle calendar events
  useEffect(() => {
    if (isElectron && ipcRenderer) {
      const handleExternalToggle = () => {
        setShowCalendarOverlay(prev => !prev);
      };
      ipcRenderer.on('toggle-calendar-external', handleExternalToggle);
      return () => {
        ipcRenderer.removeListener('toggle-calendar-external', handleExternalToggle);
      };
    }
  }, []);

  // Electron: Force click-through (ignore mouse events) when all interactive overlays are closed
  useEffect(() => {
    if (isElectron && ipcRenderer) {
      if (!showCalendarOverlay && !showStatusOverlay && !showChatInput) {
        ipcRenderer.send('pet-leave');
      }
    }
  }, [showCalendarOverlay, showStatusOverlay, showChatInput]);

  // Proactive check (every 30 seconds)
  useEffect(() => {
    const checkProactive = async () => {
      if (isLoading || isTalking) return;
      
      try {
        // Calculate date range: today 00:00:00 to [today + 2 days] 23:59:59
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 2);
        limitDate.setHours(23, 59, 59, 999);

        const filteredEvents = events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= limitDate;
        });

        const response = await fetch(`${apiBase}/api/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarEvents: filteredEvents
          })
        });
        const data = await response.json();
        if (data.message) {
          setLastModelMessage(data.message);
          setIsTalking(true);
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.message }] }]);
          setTimeout(() => {
            setIsTalking(false);
            setLastModelMessage('');
          }, 8000);
        }
      } catch (e) {
        // Silent fail for background tasks
      }
    };

    const interval = setInterval(checkProactive, 30000);
    return () => clearInterval(interval);
  }, [events, isLoading, isTalking]);

  const handleSendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setIsTalking(true);
    
    // UI feedback for sending
    setLastModelMessage('...'); 

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMsg],
          calendarEvents: events,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Server error');
      }
      
      const aiResponseText = data.text || '이해했어요! ✨';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiResponseText }] }]);
      setLastModelMessage(aiResponseText);

      // Handle app / website launch requests
      if (Array.isArray(data.launchApps) && data.launchApps.length > 0) {
        if (isElectron && ipcRenderer) {
          const launchResults = await Promise.all(
            data.launchApps.map((appName: string) => ipcRenderer.invoke('launch-installed-app', appName))
          );

          const failed = launchResults.filter((result: any) => !result?.success);
          if (failed.length > 0) {
            const reason = failed[0]?.message || '앱 실행에 실패했어요.';
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: reason }] }]);
            setLastModelMessage(reason);
          }
        } else {
          const msg = '앱 실행은 데스크톱 앱에서만 사용할 수 있어요.';
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: msg }] }]);
          setLastModelMessage(msg);
        }
      }
        
      // Handle new events
      if (data.newEvents && data.newEvents.length > 0) {
        const aiEvents: CalendarEvent[] = data.newEvents.map((e: any) => ({
          id: Math.random().toString(36).substring(2, 11),
          date: new Date(e.date).toISOString(),
          title: e.title,
          description: e.description || '',
          time: e.time || '12:00',
          alerted: false,
          alertEnabled: e.alertEnabled !== undefined ? e.alertEnabled : true,
        }));
        setEvents(prev => [...prev, ...aiEvents]);
      }

      // Handle removed events
      if (data.removedEventIds && data.removedEventIds.length > 0) {
        setEvents(prev => prev.filter(e => !data.removedEventIds.includes(e.id)));
      }

      // Handle updated events
      if (data.updatedEvents && data.updatedEvents.length > 0) {
        setEvents(prev => prev.map(e => {
          const update = data.updatedEvents.find((u: any) => u.id === e.id);
          if (update) {
            return {
              ...e,
              date: update.date ? new Date(update.date).toISOString() : e.date,
              title: update.title || e.title,
              description: update.description !== undefined ? update.description : e.description,
              time: update.time || e.time,
              alerted: false,
              alertEnabled: update.alertEnabled !== undefined ? update.alertEnabled : (e.alertEnabled !== undefined ? e.alertEnabled : true),
            };
          }
          return e;
        }));
      }
      
      setTimeout(() => setLastModelMessage(''), 8000);
    } catch (error) {
      console.error(error);
      setLastModelMessage('모니가 잠시 연결이 끊겼어요! 😿');
    } finally {
      setIsLoading(false);
      setShowChatInput(false);
      setTimeout(() => setIsTalking(false), 2000);
    }
  };

  const addEvent = (date: Date, title: string, description: string, time: string, alertEnabled: boolean = true) => {
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substring(2, 11),
      date: date.toISOString(),
      title,
      description,
      time: time || '12:00',
      alerted: false,
      alertEnabled,
    };
    setEvents(prev => [...prev, newEvent]);
    
    // Moni reacts to new event
    const timeDisplay = time ? ` ${time}분에` : '';
    const alertMessageEnding = alertEnabled ? ' 가르쳐준 시간에 꼭 알려줄게! 📝⏰' : ' (알림은 꺼져 있어) 📝';
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: `오! "${title}" 일정을${timeDisplay} 캘린더에 적어뒀어.${alertMessageEnding}` }] 
    }]);
    setLastModelMessage(`"${title}" 일정을 추가했어!`);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...updatedEvent, alerted: false } : e));
    const msg = `"${updatedEvent.title}" 일정을 수정했어! 확인해봐. ✨`;
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: msg }] 
    }]);
    setLastModelMessage(msg);
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);
  };

  const removeEvent = (id: string) => {
    const event = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (event) {
      const msg = `"${event.title}" 일정을 삭제했어. 🗑️`;
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: msg }] 
      }]);
      setLastModelMessage(msg);
      setIsTalking(true);
      setTimeout(() => setIsTalking(false), 3000);
    }
  };

  const handleDoubleClickPet = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const lastDoubleClickedDate = localStorage.getItem('moni_last_double_click_date');
    
    // 이쁜 하트/반짝임 느낌의 화음 사운드 (Web Audio API Sine wave)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      const t = audioCtx.currentTime;

      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
      osc.frequency.setValueAtTime(880.00, t + 0.16); // A5

      gainNode.gain.setValueAtTime(0.015, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(t + 0.45);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }

    if (lastDoubleClickedDate === todayStr) {
      const msg = "히힛, 쓰다듬어줘서 정말 기분 좋아! 💕 (오늘의 쓰다듬기 호감도는 이미 올랐어!)";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: msg }] }]);
      setLastModelMessage(msg);
      setIsTalking(true);
      setTimeout(() => {
        setIsTalking(false);
        setLastModelMessage('');
      }, 4000);
    } else {
      localStorage.setItem('moni_last_double_click_date', todayStr);
      setPetFavorability(prev => Math.min(100, prev + 1));

      const msg = "앗! 나를 더블클릭해서 쓰다듬어준 거야? 정말 따뜻해... 💖 (오늘 첫 쓰다듬기! 호감도 +1)";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: msg }] }]);
      setLastModelMessage(msg);
      setIsTalking(true);
      setTimeout(() => {
        setIsTalking(false);
        setLastModelMessage('');
      }, 4000);
    }
  };

  if (currentPath === '#/calendar' || currentPath === '#calendar') {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 bg-transparent overflow-hidden pointer-events-none"
      >
        <div className="absolute top-12 left-12 pointer-events-none origin-top">
          <motion.div
            drag={!isCalendarLocked}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={containerRef}
            className="pointer-events-auto"
          >
            <Calendar
              events={events}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onRemoveEvent={removeEvent}
              isLocked={isCalendarLocked}
              onToggleLock={() => setIsCalendarLocked(!isCalendarLocked)}
              textColor={calendarColor}
              onOpenSettings={(color) => setCalendarColor(color)}
              onClose={() => {
                if (ipcRenderer) {
                  ipcRenderer.send('calendar-close');
                }
              }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-transparent text-black font-sans overflow-hidden select-none pointer-events-none" id="desktop-boundary">

      {/* Pet Widget */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="pointer-events-none flex flex-col items-center gap-4">
          <AnimatePresence>
            {isPetVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 56 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 56 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="pointer-events-auto"
              >
                <Pet
                   status={status}
                   isTalking={isTalking}
                   lastMessage={lastModelMessage}
                   onDoubleClickPet={handleDoubleClickPet}
                   showChatInput={showChatInput}
                   onToggleChat={() => setShowChatInput(prev => !prev)}
                   showCalendar={showCalendarOverlay}
                   onToggleCalendar={() => setShowCalendarOverlay(prev => !prev)}
                   onSendMessage={handleSendMessage}
                   isLoading={isLoading}
                   messages={messages}
                   dragConstraints={containerRef}
                   showStatus={showStatusOverlay}
                   onToggleStatus={() => {
                     setIsDarkMode(localStorage.getItem('moni_calendar_dark_mode') === 'true');
                     setShowStatusOverlay(prev => !prev);
                   }}
                   petScale={petScale}
                   petHue={petHue}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Draggable Status Overlay (Draggable Anywhere!) */}
      <AnimatePresence>
        {showStatusOverlay && (
          <div className="absolute left-[calc(100%-344px)] top-1/4 z-[80] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              drag
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={containerRef}
              onMouseEnter={() => ipcRenderer?.send('pet-hover')}
              onMouseLeave={() => ipcRenderer?.send('pet-leave')}
              className="pointer-events-auto origin-top"
            >
              <Status 
                level={petLevel}
                exp={petExp}
                favorability={petFavorability}
                scale={petScale}
                hue={petHue}
                onClose={() => setShowStatusOverlay(false)}
                onUpdateScale={setPetScale}
                onUpdateHue={setPetHue}
                onUpdateExp={setPetExp}
                onUpdateLevel={setPetLevel}
                onUpdateFavorability={setPetFavorability}
                isDarkMode={isDarkMode}
                isPetVisible={isPetVisible}
                onTogglePetVisibility={() => setIsPetVisible(!isPetVisible)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Draggable Calendar Overlay */}
      <AnimatePresence>
        {showCalendarOverlay && (
          <div className="absolute left-6 top-1/4 z-[80] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              drag={!isCalendarLocked}
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={containerRef}
              onMouseEnter={() => ipcRenderer?.send('pet-hover')}
              onMouseLeave={() => ipcRenderer?.send('pet-leave')}
              className="pointer-events-auto origin-top"
            >
              <Calendar
                events={events}
                onAddEvent={addEvent}
                onUpdateEvent={updateEvent}
                onRemoveEvent={removeEvent}
                isLocked={isCalendarLocked}
                onToggleLock={() => setIsCalendarLocked(!isCalendarLocked)}
                textColor={calendarColor}
                onOpenSettings={(color) => setCalendarColor(color)}
                onClose={() => setShowCalendarOverlay(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pet Visibility Toggle Button in bottom-right floor */}
      <div className="absolute bottom-6 right-6 z-[100] pointer-events-auto">
        <button 
          onClick={() => setIsPetVisible(!isPetVisible)}
          onMouseEnter={() => ipcRenderer?.send('pet-hover')}
          onMouseLeave={() => ipcRenderer?.send('pet-leave')}
          className={cn(
            "px-2.5 py-1.5 backdrop-blur-sm rounded-xl text-[10px] font-extrabold opacity-25 hover:opacity-100 hover:scale-105 active:scale-95 transition-all duration-350 shadow-sm flex items-center gap-1.5 border cursor-pointer select-none",
            isPetVisible
              ? isDarkMode
                ? "bg-slate-900/80 hover:bg-slate-900/90 text-slate-300 hover:text-white border-white/10"
                : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border-black/10 shadow-slate-200/50"
              : isDarkMode
                ? "bg-indigo-950/80 hover:bg-indigo-950 text-indigo-400 hover:text-indigo-300 border-indigo-900/40"
                : "bg-indigo-50/95 hover:bg-indigo-100 text-indigo-750 hover:text-indigo-850 border-indigo-100"
          )}
        >
          {isPetVisible ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              캐릭터 숨기기
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 animate-bounce" />
              캐릭터 나타내기
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import { isSameDay } from 'date-fns';

interface TodoProps {
  events: CalendarEvent[];
  textColor?: string;
  isLocked?: boolean;
  isDarkMode: boolean;
  todoResetWarnMinutes: number;
}

interface CustomTodo {
  id: string;
  text: string;
  completed: boolean;
  rewardClaimed?: boolean;
  category: 'daily' | 'weekly' | 'monthly';
  createdAt: number;
  resetConfig?: {
    dailyHour?: number;
    weeklyDay?: number;
    monthlyDate?: number;
  };
  lastResetTimestamp?: number;
}

const WEEKDAYS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

export const Todo: React.FC<TodoProps> = ({ 
  events, 
  textColor = '#000000', 
  isLocked,
  isDarkMode,
  todoResetWarnMinutes
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'daily' | 'weekly' | 'monthly'>('today');
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_custom_todos');
      if (saved) {
        try {
          return JSON.parse(saved).map((todo:any) => ({
            ...todo,
            rewardClaimed: todo.rewardClaimed ?? false,
}));
        } catch (e) {}
      }
    }
    return [];
  });

  const [warnedResets, setWarnedResets] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_todo_warned_resets');
      if (saved) {
        try { 
          return JSON.parse(saved); 
        } catch (e) {}
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('moni_todo_warned_resets', JSON.stringify(warnedResets));
  }, [warnedResets]);

  const getMinutesToNextReset = (todo: CustomTodo): number => {
    const now = new Date();
    const nowEpoch = now.getTime();
    const config = todo.resetConfig || {
      dailyHour: 9,
      weeklyDay: 1,
      monthlyDate: 1
    };
    
    let nextResetTime = 0;
    
    if (todo.category === 'daily') {
      const hour = config.dailyHour ?? 9;
      const targetToday = new Date(now);
      targetToday.setHours(hour, 0, 0, 0);
      if (nowEpoch >= targetToday.getTime()) {
        targetToday.setDate(targetToday.getDate() + 1);
      }
      nextResetTime = targetToday.getTime();
    } else if (todo.category === 'weekly') {
      const targetWD = config.weeklyDay ?? 1;
      const currentWD = now.getDay();
      let diff = targetWD - currentWD;
      if (diff < 0) diff += 7;
      else if (diff === 0) {
        diff = 7;
      }
      const nextResetDate = new Date(now);
      nextResetDate.setDate(now.getDate() + diff);
      nextResetDate.setHours(0, 0, 0, 0);
      nextResetTime = nextResetDate.getTime();
    } else if (todo.category === 'monthly') {
      const targetMD = config.monthlyDate ?? 1;
      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth();
      
      const thisMonthTarget = new Date(targetYear, targetMonth, targetMD, 0, 0, 0, 0);
      if (thisMonthTarget.getMonth() !== targetMonth) {
        thisMonthTarget.setDate(0);
      }
      
      if (nowEpoch >= thisMonthTarget.getTime()) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }
      
      const nextResetDate = new Date(targetYear, targetMonth, targetMD, 0, 0, 0, 0);
      if (nextResetDate.getMonth() !== targetMonth) {
        nextResetDate.setDate(0);
      }
      nextResetTime = nextResetDate.getTime();
    }

    const diffMs = nextResetTime - nowEpoch;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const checkAndNotifySoonResets = (todos: CustomTodo[], warnMinutes: number) => {
    if (warnMinutes <= 0) return;
    
    const now = new Date();
    const nowEpoch = now.getTime();
    let alertedAny = false;
    const newWarned = { ...warnedResets };
    const currentMessagesJson = localStorage.getItem('moni_chat_messages');
    let messagesList: any[] = [];
    try {
      messagesList = currentMessagesJson ? JSON.parse(currentMessagesJson) : [];
    } catch (e) {}

    todos.forEach((todo) => {
      const minsLeft = getMinutesToNextReset(todo);
      const config = todo.resetConfig || { dailyHour: 9, weeklyDay: 1, monthlyDate: 1 };
      let nextResetTime = 0;
      if (todo.category === 'daily') {
        const hour = config.dailyHour ?? 9;
        const targetToday = new Date(now);
        targetToday.setHours(hour, 0, 0, 0);
        if (nowEpoch >= targetToday.getTime()) targetToday.setDate(targetToday.getDate() + 1);
        nextResetTime = targetToday.getTime();
      } else if (todo.category === 'weekly') {
        const targetWD = config.weeklyDay ?? 1;
        const currentWD = now.getDay();
        let diff = targetWD - currentWD;
        if (diff < 0) diff += 7;
        else if (diff === 0) diff = 7;
        const nextResetDate = new Date(now);
        nextResetDate.setDate(now.getDate() + diff);
        nextResetDate.setHours(0, 0, 0, 0);
        nextResetTime = nextResetDate.getTime();
      } else if (todo.category === 'monthly') {
        const targetMD = config.monthlyDate ?? 1;
        let targetYear = now.getFullYear();
        let targetMonth = now.getMonth();
        const thisMonthTarget = new Date(targetYear, targetMonth, targetMD, 0, 0, 0, 0);
        if (thisMonthTarget.getMonth() !== targetMonth) thisMonthTarget.setDate(0);
        if (nowEpoch >= thisMonthTarget.getTime()) {
          targetMonth += 1;
          if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
        }
        const nextResetDate = new Date(targetYear, targetMonth, targetMD, 0, 0, 0, 0);
        if (nextResetDate.getMonth() !== targetMonth) nextResetDate.setDate(0);
        nextResetTime = nextResetDate.getTime();
      }

      if (minsLeft > 0 && minsLeft <= warnMinutes) {
        if (newWarned[todo.id] !== nextResetTime) {
          newWarned[todo.id] = nextResetTime;
          alertedAny = true;

          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(698.46, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
          } catch (e) {}

          let categoryDisplay = '';
          if (todo.category === 'daily') categoryDisplay = '일간';
          else if (todo.category === 'weekly') categoryDisplay = '주간';
          else if (todo.category === 'monthly') categoryDisplay = '월간';

          const warnMessage = `⏳ 알림: ${categoryDisplay} 할 일 "${todo.text}" 항목의 초기화 주기까지 약 ${minsLeft}분 남았습니다! 서둘러 완료 상태를 확인해 주세요! 📝`;
          messagesList.push({
            role: 'model',
            parts: [{ text: warnMessage }]
          });
        }
      }
    });

    if (alertedAny) {
      setWarnedResets(newWarned);
      localStorage.setItem('moni_chat_messages', JSON.stringify(messagesList));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'moni_chat_messages',
        newValue: JSON.stringify(messagesList)
      }));
    }
  };

  useEffect(() => {
    const notifyCheck = () => {
      checkAndNotifySoonResets(customTodos, todoResetWarnMinutes);
    };
    notifyCheck();
    const interval = setInterval(notifyCheck, 20000);
    return () => clearInterval(interval);
  }, [customTodos, todoResetWarnMinutes, warnedResets]);

  // Reset Configuration States for the active creation mode
  const [dailyHour, setDailyHour] = useState<number>(9); // default 9 o'clock
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // default Monday
  const [monthlyDate, setMonthlyDate] = useState<number>(1); // default 1st day

  const [completedEventIds, setCompletedEventIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_completed_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });


  const [rewardedEventIds, setRewardedEventIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_rewarded_events');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');

  // Persist custom todos
  useEffect(() => {
    localStorage.setItem('moni_custom_todos', JSON.stringify(customTodos));
  }, [customTodos]);

  // Persist completed events mapping for Today
  useEffect(() => {
    localStorage.setItem('moni_completed_events', JSON.stringify(completedEventIds));
  }, [completedEventIds]);

  useEffect(() => {
    localStorage.setItem('moni_rewarded_events', JSON.stringify(rewardedEventIds));
  }, [rewardedEventIds]);


  // Automated reset checker and processor
  const checkAndRunResets = (todos: CustomTodo[]): CustomTodo[] => {
    let changed = false;
    const nowEpoch = Date.now();
    const now = new Date();

    const updated = todos.map((todo) => {

      const lastReset = todo.lastResetTimestamp || todo.createdAt;
      const wasCompleted = todo.completed;
      let targetTime = 0;
      const config = todo.resetConfig || {
        dailyHour: 9,
        weeklyDay: 1,
        monthlyDate: 1
      };

      if (todo.category === 'daily') {
        const hour = config.dailyHour ?? 9;
        const targetToday = new Date(now);
        targetToday.setHours(hour, 0, 0, 0);
        targetTime = targetToday.getTime();
        if (nowEpoch < targetTime) {
          const targetYesterday = new Date(targetToday);
          targetYesterday.setDate(targetYesterday.getDate() - 1);
          targetTime = targetYesterday.getTime();
        }
      } else if (todo.category === 'weekly') {
        const targetWD = config.weeklyDay ?? 1; // 1 = Monday
        const currentWD = now.getDay();
        let diff = currentWD - targetWD;
        if (diff < 0) diff += 7;
        const targetThisWeek = new Date(now);
        targetThisWeek.setDate(now.getDate() - diff);
        targetThisWeek.setHours(0, 0, 0, 0);
        targetTime = targetThisWeek.getTime();
      } else if (todo.category === 'monthly') {
        const targetMD = config.monthlyDate ?? 1;
        const todayVal = new Date(now);
        const targetThisMonth = new Date(todayVal.getFullYear(), todayVal.getMonth(), targetMD, 0, 0, 0, 0);
        
        // Handle end of month overflows safely
        let actualTargetThisMonth = targetThisMonth;
        if (actualTargetThisMonth.getMonth() !== todayVal.getMonth()) {
          actualTargetThisMonth = new Date(todayVal.getFullYear(), todayVal.getMonth() + 1, 0, 0, 0, 0, 0);
        }

        if (nowEpoch >= actualTargetThisMonth.getTime()) {
          targetTime = actualTargetThisMonth.getTime();
        } else {
          const targetLastMonth = new Date(todayVal.getFullYear(), todayVal.getMonth() - 1, targetMD, 0, 0, 0, 0);
          let actualTargetLastMonth = targetLastMonth;
          const expectedMonth = (todayVal.getMonth() - 1 + 12) % 12;
          if (actualTargetLastMonth.getMonth() !== expectedMonth) {
            actualTargetLastMonth = new Date(todayVal.getFullYear(), todayVal.getMonth(), 0, 0, 0, 0, 0);
          }
          targetTime = actualTargetLastMonth.getTime();
        }
      }

      if (lastReset < targetTime) {
        changed = true;
        if (!todo.completed) { window.dispatchEvent(new Event('moni-todo-fail')); }
        return {
          ...todo,
          completed: false,
          rewardClaimed: false,
          lastResetTimestamp: nowEpoch,
        };
      }

      return todo;
    });

    return changed ? updated : todos;
  };

  // Run periodic automated check & reset
  useEffect(() => {
    setCustomTodos((prev) => {
      const reseted = checkAndRunResets(prev);
      if (JSON.stringify(reseted) !== JSON.stringify(prev)) {
        return reseted;
      }
      return prev;
    });

    const timer = setInterval(() => {
      setCustomTodos((prev) => {
        const reseted = checkAndRunResets(prev);
        if (JSON.stringify(reseted) !== JSON.stringify(prev)) {
          return reseted;
        }
        return prev;
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(timer);
  }, []);

  // Filter events scheduled for today
  const todayEvents = events.filter((event) => {
    try {
      return isSameDay(new Date(event.date), new Date());
    } catch (e) {
      return false;
    }
  });

  // Handle adding new custom todo
  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || activeTab === 'today') return;

  const newTodo: CustomTodo = {
    id: crypto.randomUUID(),
    text: inputValue.trim(),
    completed: false,
    rewardClaimed: false,
    category: activeTab,
    createdAt: Date.now(),
    lastResetTimestamp: Date.now(),
    resetConfig: {
      dailyHour: activeTab === 'daily' ? dailyHour : undefined,
      weeklyDay: activeTab === 'weekly' ? weeklyDay : undefined,
      monthlyDate: activeTab === 'monthly' ? monthlyDate : undefined,
  }
};

    setCustomTodos((prev) => [newTodo, ...prev]);
    setInputValue('');
  };

  // Toggle custom todo checked status
const toggleTodo = (id: string) => {
  setCustomTodos((prev) =>
    prev.map((todo) => {
      if (todo.id !== id) return todo;

      const next = !todo.completed;

      // 처음 완료했을 때만 경험치 지급
      if (next && !todo.rewardClaimed) {
        window.dispatchEvent(new Event('moni-todo-complete'));

        return {
          ...todo,
          completed: true,
          rewardClaimed: true,
        };
      }

      // 체크 해제
      return {
        ...todo,
        completed: next,
      };
    })
  );
};

  // Delete custom todo
  const deleteTodo = (id: string) => {
    setCustomTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // Toggle automated today event checklist status
  const toggleTodayEvent = (id: string) => {
    const alreadyRewarded = rewardedEventIds.includes(id);

    if (!alreadyRewarded) {
      window.dispatchEvent(new Event('moni-todo-complete'));
      setRewardedEventIds((prev) => [...prev, id]);
    }

    setCompletedEventIds((prev) => {
      const already = prev.includes(id);
      return already ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  // Filtered lists depending on active tab with automatic sorting!
  const getFilteredItems = () => {
    if (activeTab === 'today') {
      return todayEvents;
    }
    const filtered = customTodos.filter((todo) => todo.category === activeTab);
    
    return [...filtered].sort((a, b) => {
      const configA = a.resetConfig || {};
      const configB = b.resetConfig || {};

      if (activeTab === 'daily') {
        const hourA = configA.dailyHour ?? 9;
        const hourB = configB.dailyHour ?? 9;
        if (hourA !== hourB) {
          return hourA - hourB;
        }
      } else if (activeTab === 'weekly') {
        const dayA = configA.weeklyDay ?? 1;
        const dayB = configB.weeklyDay ?? 1;
        if (dayA !== dayB) {
          return dayA - dayB;
        }
      } else if (activeTab === 'monthly') {
        const dateA = configA.monthlyDate ?? 1;
        const dateB = configB.monthlyDate ?? 1;
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      }
      
      return b.createdAt - a.createdAt;
    });
  };

  const filteredItems = getFilteredItems();

  return (
    <div className={cn(
      "backdrop-blur-md border rounded-3xl p-6 shadow-2xl w-80 h-[500px] flex flex-col pointer-events-auto shrink-0 relative transition-all duration-500",
      isDarkMode 
        ? "bg-[#141416]/95 border-white/5 text-white shadow-black/85" 
        : "bg-white/90 border-black/10 text-black shadow-2xl"
    )}>
      
      {/* Tab Selectors with neat Pill animated background */}
      <div className={cn(
        "flex justify-between p-1 rounded-2xl mb-4 relative z-0",
        isDarkMode ? "bg-white/5" : "bg-black/5"
      )}>
        {(['today', 'daily', 'weekly', 'monthly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setInputValue('');
            }}
            className={cn(
              "relative px-3 py-1.5 text-[13px] font-bold rounded-xl capitalize transition-colors flex-1 text-center select-none cursor-pointer",
              activeTab === tab 
                ? (isDarkMode ? "text-zinc-950 font-black" : "text-white") 
                : (isDarkMode ? "text-zinc-400 hover:text-white" : "text-black/60 hover:text-black")
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTodoTab"
                className={cn("absolute inset-0 rounded-xl -z-10", isDarkMode ? "bg-white" : "bg-black")}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {tab === 'today' && todayEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Title */}
      <div className="mb-4">
        <h3 className="text-[17px] font-black flex items-center gap-1.5 capitalize" style={{ color: isDarkMode ? '#ffffff' : textColor }}>
          {activeTab === 'today' ? (
            <>
              <Clock className={cn("w-4.5 h-4.5 animate-pulse", isDarkMode ? "text-indigo-400" : "text-indigo-600")} />
              오늘의 알림 일정
            </>
          ) : (
            <>
              <CalendarIcon className="w-4.5 h-4.5" />
              {activeTab} 계획표
            </>
          )}
        </h3>
        <p className={cn("text-[11px] font-bold uppercase tracking-wider mt-0.5", isDarkMode ? "text-zinc-400" : "text-black/40")}>
          {activeTab === 'today' ? '자동 동기화 알람 일정' : '나만의 맞춤 할 일 목록'}
        </p>
      </div>

      {/* To-Do Quick Input Bar (Disabled for automated 'Today' tab) */}
      {activeTab !== 'today' && (
        <>
          <form onSubmit={handleAddTodo} className="flex gap-2 mb-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="할 일을 입력하세요..."
              className={cn(
                "flex-1 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2",
                isDarkMode 
                  ? "bg-zinc-800 text-white focus:ring-white/10 placeholder-zinc-500" 
                  : "bg-black/5 text-black focus:ring-black/15 placeholder-zinc-400"
              )}
              maxLength={100}
            />
            <button
              type="submit"
              className={cn(
                "p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 shadow-md",
                isDarkMode 
                  ? "bg-white text-zinc-950 hover:bg-zinc-200" 
                  : "bg-black text-white hover:bg-zinc-900"
              )}
              title="할 일 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Reset Configuration Bar */}
          <div className={cn(
            "flex items-center justify-between gap-1 px-3 py-2 mb-4 rounded-2xl border text-[11px] font-bold select-none",
            isDarkMode 
              ? "bg-white/5 border-white/5 text-zinc-300" 
              : "bg-black/5 border-black/5 text-black/60"
          )}>
            <span className={cn("shrink-0 flex items-center gap-1", isDarkMode ? "text-zinc-400" : "text-black/40")}>
              ⏳ 초기화 주기
            </span>
            {activeTab === 'daily' && (
              <div className="flex items-center gap-1.5">
                <span>매일</span>
                <select
                  value={dailyHour}
                  onChange={(e) => setDailyHour(Number(e.target.value))}
                  className={cn(
                    "border rounded-lg px-2 py-0.5 text-[11px] font-black focus:outline-none cursor-pointer",
                    isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white" 
                      : "bg-white border-black/10 text-black"
                  )}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{i}시</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'weekly' && (
              <div className="flex items-center gap-1.5">
                <span>매주</span>
                <select
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(Number(e.target.value))}
                  className={cn(
                    "border rounded-lg px-2 py-0.5 text-[11px] font-black focus:outline-none cursor-pointer",
                    isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white" 
                      : "bg-white border-black/10 text-black"
                  )}
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'monthly' && (
              <div className="flex items-center gap-1.5">
                <span>매달</span>
                <select
                  value={monthlyDate}
                  onChange={(e) => setMonthlyDate(Number(e.target.value))}
                  className={cn(
                    "border rounded-lg px-2 py-0.5 text-[11px] font-black focus:outline-none cursor-pointer",
                    isDarkMode 
                      ? "bg-zinc-800 border-zinc-700 text-white" 
                      : "bg-white border-black/10 text-black"
                  )}
                >
                  {Array.from({ length: 31 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}일</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "h-full flex flex-col items-center justify-center text-center p-4 py-8 border border-dashed select-none rounded-2xl",
                isDarkMode ? "bg-white/5 border-white/5" : "bg-black/5 border-black/10"
              )}
            >
              {activeTab === 'today' ? (
                <div className="space-y-1">
                  <p className={cn("text-[13px] font-bold", isDarkMode ? "text-zinc-300" : "text-black/40")}>오늘 등록된 알림 일정이 없습니다.</p>
                  <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-black/30")}>캘린더 일정을 추가해 보세요! ✨</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className={cn("text-[13px] font-bold", isDarkMode ? "text-zinc-300" : "text-black/40")}>등록된 할 일이 없습니다.</p>
                  <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-black/30")}>여기에 해야할 일을 기록해 보세요!</p>
                </div>
              )}
            </motion.div>
          ) : (
            filteredItems.map((item) => {
              if (activeTab === 'today') {
                // Render Automatic Today Clock Alarm Events
                const event = item as CalendarEvent;
                const isCompleted = completedEventIds.includes(event.id);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-2xl transition-all cursor-pointer group",
                      isDarkMode 
                        ? (isCompleted ? "bg-[#18181c] border-white/5 opacity-50" : "bg-indigo-950/20 border-indigo-900/50 hover:bg-indigo-950/30")
                        : (isCompleted ? "bg-indigo-50/30 border-indigo-100 opacity-65" : "bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50")
                    )}
                    onClick={() => toggleTodayEvent(event.id)}
                  >
                    <button className={cn(isDarkMode ? "text-indigo-400" : "text-indigo-600", "focus:outline-none shrink-0")} title={isCompleted ? "미완료로 표시" : "완료로 표시"}>
                      {isCompleted ? (
                        <CheckCircle className={cn("w-5 h-5", isDarkMode ? "fill-indigo-400 text-zinc-950" : "fill-indigo-600 text-white")} />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[13px] font-black truncate transition-all",
                        isCompleted 
                          ? (isDarkMode ? "line-through text-zinc-600" : "line-through text-black/40") 
                          : (isDarkMode ? "text-zinc-200" : "text-black")
                      )}>
                        {event.title}
                      </p>
                      {event.time && (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-black mt-0.5 uppercase px-1.5 py-0.5 rounded-md",
                          event.alertEnabled === false
                            ? (isDarkMode ? "text-zinc-500 bg-white/5" : "text-black/40 bg-black/5")
                            : (isDarkMode ? "text-indigo-300 bg-indigo-950/70" : "text-indigo-600/80 bg-indigo-50")
                        )}>
                          <Clock className="w-2.5 h-2.5" />
                          {event.time}
                          {event.alertEnabled === false && (
                            <span className="text-[9px] font-bold">🔔 OFF</span>
                          )}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              } else {
                // Render Manual Checklist Items
                const todo = item as CustomTodo;
                const config = todo.resetConfig || {
                  dailyHour: 9,
                  weeklyDay: 1,
                  monthlyDate: 1
                };

                let resetLabelDetail = '';
                if (todo.category === 'daily') {
                  resetLabelDetail = `매일 ${config.dailyHour ?? 9}시`;
                } else if (todo.category === 'weekly') {
                  const dayName = WEEKDAYS.find((d) => d.value === (config.weeklyDay ?? 1))?.label || '월요일';
                  resetLabelDetail = `매주 ${dayName}`;
                } else if (todo.category === 'monthly') {
                  resetLabelDetail = `매달 ${config.monthlyDate ?? 1}일`;
                }

                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 border rounded-2xl transition-all group",
                      isDarkMode 
                        ? (todo.completed ? "opacity-50 bg-[#18181c]/50 border-white/5" : "bg-white/5 border-white/5 hover:bg-white/10")
                        : (todo.completed ? "opacity-60 bg-black/2.5 border-black/5" : "bg-black/5 border-black/10 hover:bg-[#eaeaea]")
                    )}
                  >
                    <div 
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleTodo(todo.id)}
                    >
                      <button className={cn(isDarkMode ? "text-zinc-400" : "text-black/60", "focus:outline-none shrink-0")}>
                        {todo.completed ? (
                          <CheckCircle className={cn("w-5 h-5", isDarkMode ? "fill-zinc-400 text-[#141416]" : "fill-black text-white")} />
                        ) : (
                          <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[13px] font-bold truncate leading-normal transition-all",
                          todo.completed 
                            ? (isDarkMode ? "line-through text-zinc-500 font-normal" : "line-through text-black/40")
                            : (isDarkMode ? "text-zinc-200" : "text-black")
                        )}>
                          {todo.text}
                        </p>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 uppercase px-1.5 py-0.5 rounded",
                          isDarkMode ? "text-zinc-400 bg-white/5" : "text-black/40 bg-black/5"
                        )}>
                          ⏳ {resetLabelDetail} 초기화
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTodo(todo.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0",
                        isDarkMode ? "text-zinc-500 hover:text-red-400" : "text-black/30 hover:text-red-500"
                      )}
                      title="지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              }
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* Tiny descriptive footer */}
      <div className="mt-2 text-center select-none">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-zinc-400" : "text-black/25")}>
          {activeTab === 'today' ? '총 ' + todayEvents.length + '개의 알림 일정' : '완료 ' + customTodos.filter(t => t.category === activeTab && t.completed).length + '개 / 전체 ' + customTodos.filter(t => t.category === activeTab).length + '개'}
        </span>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings, Lock, Unlock, X, ChevronDown, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import { Todo } from './Todo';

const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

interface CalendarProps {
  dragControls?: any;
  events: CalendarEvent[];
  onAddEvent: (date: Date, title: string, description: string, time: string, alertEnabled?: boolean) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (id: string) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  textColor?: string;
  onOpenSettings?: (color: string) => void;
  onClose?: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  dragControls,
  events, 
  onAddEvent, 
  onUpdateEvent,
  onRemoveEvent,
  isLocked,
  onToggleLock,
  textColor = '#000000',
  onOpenSettings,
  onClose
}) => {
  const [showSettingsInternal, setShowSettingsInternal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEventsExpanded, setIsEventsExpanded] = useState(true);
  const [showTodo, setShowTodo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_calendar_show_todo');
      return saved === 'true';
    }
    return false;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_calendar_dark_mode');
      return saved === 'true';
    }
    return false;
  });

  const [todoResetWarnMinutes, setTodoResetWarnMinutes] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_todo_reset_warn_minutes');
      return saved ? Number(saved) : 10;
    }
    return 10;
  });

  useEffect(() => {
    localStorage.setItem('moni_calendar_show_todo', String(showTodo));
  }, [showTodo]);

  useEffect(() => {
    localStorage.setItem('moni_calendar_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('moni_todo_reset_warn_minutes', String(todoResetWarnMinutes));
  }, [todoResetWarnMinutes]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [todoTab, setTodoTab] = useState<'today' | 'daily' | 'weekly' | 'monthly'>('today');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTime, setFormTime] = useState('12:00');
  const [formAlertEnabled, setFormAlertEnabled] = useState<boolean>(true);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDayOfWeek = startOfMonth(currentMonth).getDay();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (modalMode === 'add' && selectedDay) {
      onAddEvent(selectedDay, formTitle, formDesc, formTime, formAlertEnabled);
    } else if (modalMode === 'edit' && editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        title: formTitle,
        description: formDesc,
        time: formTime,
        alertEnabled: formAlertEnabled,
      });
    }

    setIsModalOpen(false);
    setFormTitle('');
    setFormDesc('');
    setFormTime('12:00');
    setFormAlertEnabled(true);
    setEditingEvent(null);
  };

  return (
    <div 
      onMouseEnter={() => ipcRenderer?.send('pet-hover')}
      onMouseLeave={() => ipcRenderer?.send('pet-leave')}
      className="flex items-start gap-4 pointer-events-auto"
    >
      <div className={cn(
        "backdrop-blur-md border rounded-3xl p-6 shadow-2xl w-[350px] shrink-0 pointer-events-auto group/calendar relative transition-all duration-500 select-none",
        isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDarkMode 
          ? "bg-[#141416]/95 text-white border-white/5 shadow-black/80" 
          : "bg-white/90 text-black border-black/10"
      )}>
      
      <AnimatePresence>
        {showSettingsInternal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-0 z-50 rounded-3xl p-6 flex flex-col justify-between border transition-colors duration-300",
              isDarkMode 
                ? "bg-[#18181c]/98 text-white border-white/10 shadow-lg" 
                : "bg-white/95 text-black border-black/5 shadow-lg"
            )}
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-lg font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-black")}>
                  <Settings className="w-4 h-4" />
                  설정 (Settings)
                </h3>
                <button 
                  onClick={() => setShowSettingsInternal(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-black"
                  )}
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-5">
                {/* 1. 다크모드 설정 */}
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                  <div>
                    <h4 className="text-[13px] font-bold">🌙 다크 모드 (Dark Theme)</h4>
                    <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-zinc-400" : "text-black/40")}>
                      캘린더 창을 어두운 계열의 테마로 전환합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={cn(
                      "w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-350 focus:outline-none cursor-pointer",
                      isDarkMode ? "bg-indigo-600 justify-end" : "bg-black/15 justify-start"
                    )}
                  >
                    <motion.div 
                      layout 
                      className="w-4 h-4 rounded-full bg-white shadow-md cursor-pointer" 
                    />
                  </button>
                </div>

                {/* 2. To-Do 초기화 알림 설정 */}
                <div className="space-y-2">
                  <div>
                    <h4 className="text-[13px] font-bold">⏳ To-Do 갱신 전 알림주기</h4>
                    <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-zinc-400" : "text-black/40")}>
                      일간·주간·월간 할 일이 초기화되기 직전 캐릭터 알림을 발송합니다.
                    </p>
                  </div>
                  <select
                    value={todoResetWarnMinutes}
                    onChange={(e) => setTodoResetWarnMinutes(Number(e.target.value))}
                    className={cn(
                      "w-full px-3 py-2 border rounded-xl text-[13px] font-bold focus:outline-none cursor-pointer transition-colors",
                      isDarkMode 
                        ? "bg-zinc-800 border-zinc-700 text-white focus:ring-1 focus:ring-white/10" 
                        : "bg-black/5 border-black/10 text-black focus:ring-1 focus:ring-black/10"
                    )}
                  >
                    <option value={0}>알림 안 함 (해제)</option>
                    <option value={5}>5분 전 알림</option>
                    <option value={10}>10분 전 알림</option>
                    <option value={15}>15분 전 알림</option>
                    <option value={20}>20분 전 알림</option>
                    <option value={30}>30분 전 알림</option>
                    <option value={60}>1시간 전 알림</option>
                  </select>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowSettingsInternal(false)}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition-all cursor-pointer shadow-md",
                isDarkMode 
                  ? "bg-white text-zinc-950 hover:bg-zinc-200" 
                  : "bg-black text-white hover:bg-zinc-900"
              )}
            >
              완료 (Done)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 bg-white/95 rounded-3xl p-6 flex flex-col justify-between text-black"
          >
            <form onSubmit={handleFormSubmit} className="flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-black">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    {modalMode === 'add' ? '새 일정 추가' : '일정 수정'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingEvent(null);
                    }}
                    className="p-2 hover:bg-black/5 rounded-full text-black"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-black/40 block mb-1 font-black uppercase tracking-widest">일정 날짜</label>
                    <div className="bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold">
                      {selectedDay ? format(selectedDay, 'yyyy년 MM월 dd일') : ''}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-black/40 block mb-1 font-black uppercase tracking-widest">일정 제목</label>
                    <input 
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="*제목을 입력해주세요."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-black/40 block mb-1 font-black uppercase tracking-widest">시간 설정</label>
                      <input 
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black/40 block mb-1 font-black uppercase tracking-widest">일정 알림</label>
                      <button
                        type="button"
                        onClick={() => setFormAlertEnabled(!formAlertEnabled)}
                        className={cn(
                          "w-full h-[38px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border cursor-pointer select-none",
                          formAlertEnabled 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-650 hover:bg-indigo-100/50" 
                            : "bg-black/5 border-black/10 text-black/40 hover:bg-black/10"
                        )}
                      >
                        {formAlertEnabled ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-indigo-500" />
                            알림 ON
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-black/40" />
                            알림 OFF
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-black/40 block mb-1 font-black uppercase tracking-widest">일정 설명</label>
                    <textarea 
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm text-black font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-16 resize-none"
                      placeholder="상세 내용을 입력하세요..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform cursor-pointer hover:bg-indigo-500"
                >
                  저장
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-6 py-3 bg-black/5 text-black rounded-xl text-sm font-bold active:scale-95 transition-transform cursor-pointer hover:bg-black/10"
                >
                  취소
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 최상단 행: 연월, 잠금, 설정, x표시 */}
      <div 
        className="flex items-center justify-between mb-4 animate-fade-in select-none"
      >
        <div className="flex items-center gap-2">
          <h2 className={cn("text-[17px] font-black flex items-center gap-1.5", isDarkMode ? "text-white" : "text-zinc-900")}>
            <CalendarIcon className={cn("w-4.5 h-4.5", isDarkMode ? "text-zinc-300" : "text-zinc-800")} />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button 
            onClick={onToggleLock}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              isLocked 
                ? "bg-red-600 text-white shadow-md scale-100" 
                : (isDarkMode ? "bg-white/5 text-zinc-300 hover:bg-white/10" : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"),
              "scale-90 hover:scale-100"
            )}
            title={isLocked ? "캘린더 잠금 풀기" : "캘린더 위치 고정"}
          >
            {isLocked ? (
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Lock className="w-3.5 h-3.5" />
              </motion.div>
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button 
              onClick={() => setShowSettingsInternal(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "p-2 rounded-full transition-colors group cursor-pointer",
                isDarkMode ? "hover:bg-white/10 text-zinc-300 hover:text-white" : "hover:bg-black/5 text-black/60 hover:text-black"
              )}
              title="캘린더 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              ipcRenderer?.send('calendar-close');
              onClose?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "p-2 rounded-full transition-colors group cursor-pointer",
              isDarkMode ? "hover:bg-red-500/20 text-red-400 hover:text-red-300" : "hover:bg-red-500 hover:text-white text-black/60"
            )}
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1">

      {/* 그 아랫줄: 좌우 화살표로 개월 변경 */}
      <div className={cn(
        "flex items-center justify-center gap-8 mb-4 rounded-xl py-2 px-4 transition-colors duration-300",
        isDarkMode ? "bg-white/5" : "bg-black/5"
      )}>
        <button 
          onClick={prevMonth} 
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "p-1.5 rounded-lg transition-colors group flex items-center gap-1.5 cursor-pointer",
            isDarkMode ? "hover:bg-white/10 text-zinc-300 hover:text-white" : "hover:bg-white text-black"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-xs font-bold select-none">이전달</span>
        </button>
        <span className={cn("text-[11px] font-black uppercase tracking-widest select-none", isDarkMode ? "text-zinc-500" : "text-black/40")}>Month</span>
        <button 
          onClick={nextMonth} 
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "p-1.5 rounded-lg transition-colors group flex items-center gap-1.5 cursor-pointer",
            isDarkMode ? "hover:bg-white/10 text-zinc-300 hover:text-white" : "hover:bg-white text-black"
          )}
        >
          <span className="text-xs font-bold select-none">다음달</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2 select-none">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
          let dayColorClass = '';
          if (index === 0) {
            dayColorClass = 'text-red-500 font-black'; // Sunday Red
          } else if (index === 6) {
            dayColorClass = 'text-blue-500 font-black'; // Saturday Blue
          } else {
            dayColorClass = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';
          }
          return (
            <div key={`${day}-${index}`} className={cn("text-center text-xs font-black py-1 uppercase", dayColorClass)}>
              {day}
            </div>
          );
        })}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-start-${index}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const hasEvent = events.some((e) => isSameDay(new Date(e.date), day));
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const dayOfWeek = day.getDay();
          
          let dateTextColorClass = '';
          if (isToday) {
            dateTextColorClass = isDarkMode ? 'text-zinc-950 font-black' : 'text-white font-black';
          } else if (isSelected) {
            dateTextColorClass = isDarkMode ? 'text-indigo-300 font-black' : 'text-indigo-800 font-black';
          } else if (dayOfWeek === 0) {
            dateTextColorClass = 'text-red-500 font-black'; // Sunday Red in both modes
          } else if (dayOfWeek === 6) {
            dateTextColorClass = 'text-blue-500 font-black'; // Saturday Blue in both modes
          } else {
            dateTextColorClass = isDarkMode ? 'text-zinc-200' : 'text-zinc-800';
          }

          return (
            <button
              key={day.toString()}
              onClick={() => {
                setSelectedDay(day);
                setShowTodo(true);
                setTodoTab('today');
                localStorage.setItem('moni_calendar_show_todo', 'true');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "aspect-square relative flex flex-col items-center justify-center rounded-xl transition-all group cursor-pointer border",
                isToday 
                  ? (isDarkMode ? "bg-white text-zinc-950 font-black border-transparent" : "bg-black text-white font-black border-transparent") 
                  : isSelected
                    ? (isDarkMode ? "bg-indigo-950/40 border-indigo-500/50" : "bg-indigo-50 border-indigo-300/80 shadow-sm")
                    : "border-transparent " + (isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"),
                isSelected && isToday && (isDarkMode ? "ring-2 ring-indigo-400" : "ring-2 ring-indigo-600")
              )}
            >
              <span className={cn("text-sm font-bold", dateTextColorClass)}>
                {format(day, 'd')}
              </span>
              {hasEvent && (
                <div className={cn(
                  "absolute bottom-1.5 w-1.5 h-1.5 rounded-full transition-colors", 
                  isToday 
                    ? (isDarkMode ? "bg-zinc-950" : "bg-white") 
                    : isSelected
                      ? (isDarkMode ? "bg-indigo-400" : "bg-indigo-600")
                      : "bg-indigo-500"
                )} />
              )}
            </button>
          );
        })}
        {Array.from({ length: (42 - startDayOfWeek - days.length) }).map((_, index) => (
          <div key={`empty-end-${index}`} className="aspect-square" />
        ))}
      </div>

      <div className={cn("mt-6 border-t pt-4 transition-colors", isDarkMode ? "border-white/15" : "border-black/5")}>
        <div className="flex items-center justify-between px-1 mb-3">
          <p className={cn("text-[13px] font-black uppercase tracking-widest", isDarkMode ? "text-zinc-400" : "text-black/60")}>Upcoming Events</p>
          <button 
            onClick={() => setIsEventsExpanded(!isEventsExpanded)}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer",
              isDarkMode ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-black/60 hover:text-black"
            )}
            title={isEventsExpanded ? "접기" : "펼치기"}
          >
            <motion.div
              animate={{ rotate: isEventsExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isEventsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                className="h-44 overflow-y-auto pr-1 scrollbar-hide flex flex-col gap-3"
              >
                {(() => {
                  const now = new Date();
                  const filteredEvents = events
                    .filter(e => {
                      const eventDate = new Date(e.date);
                      if (e.time) {
                        const [hours, minutes] = e.time.split(':').map(Number);
                        eventDate.setHours(hours, minutes, 0, 0);
                      } else {
                        eventDate.setHours(23, 59, 59, 999);
                      }
                      return eventDate.getTime() >= now.getTime();
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a.date);
                      if (a.time) {
                        const [h, m] = a.time.split(':').map(Number);
                        dateA.setHours(h, m, 0, 0);
                      } else {
                        dateA.setHours(0, 0, 0, 0);
                      }
                      const dateB = new Date(b.date);
                      if (b.time) {
                        const [h, m] = b.time.split(':').map(Number);
                        dateB.setHours(h, m, 0, 0);
                      } else {
                        dateB.setHours(0, 0, 0, 0);
                      }
                      return dateA.getTime() - dateB.getTime();
                    });

                  if (filteredEvents.length === 0) {
                    return (
                      <div className={cn(
                        "text-center border border-dashed select-none animate-fade-in flex flex-col justify-center flex-1 h-full py-6 px-4 min-h-[100px] rounded-2xl",
                        isDarkMode ? "bg-white/5 border-white/5" : "bg-black/5 border-black/10"
                      )}>
                        <p className={cn("text-[13px] font-semibold", isDarkMode ? "text-zinc-500" : "text-black/40")}>등록된 다가오는 일정이 없습니다. ✨</p>
                      </div>
                    );
                  }

                  return filteredEvents.map((event) => (
                    <div 
                      key={event.id} 
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        "border rounded-2xl p-4 transition-all cursor-pointer group relative hover:shadow-md shrink-0",
                        isDarkMode 
                          ? "bg-white/5 border-white/5 hover:bg-white/10" 
                          : "bg-black/5 border-black/10 hover:bg-black/10"
                      )}
                      onClick={() => {
                        setEditingEvent(event);
                        setModalMode('edit');
                        setFormTitle(event.title);
                        setFormDesc(event.description);
                        setFormTime(event.time || '12:00');
                        setFormAlertEnabled(event.alertEnabled !== false);
                        setSelectedDay(new Date(event.date));
                        setIsModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={cn("text-[15px] font-black transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>{event.title}</p>
                          {event.time && (
                            <p className="text-[12px] font-bold text-indigo-500 dark:text-indigo-400 mt-0.5 flex items-center gap-1.5">
                              {event.time}
                              {event.alertEnabled === false ? (
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md",
                                  isDarkMode ? "bg-white/5 text-zinc-500" : "bg-black/5 text-black/40"
                                )}>
                                  <BellOff className="w-2.5 h-2.5" /> 꺼짐
                                </span>
                              ) : (
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md",
                                  isDarkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-50 text-indigo-650"
                                )}>
                                  <Bell className="w-2.5 h-2.5 animate-pulse" /> 켬
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <p className={cn("text-[11px] font-bold", isDarkMode ? "text-zinc-500" : "text-black/60")}>{format(new Date(event.date), 'MMM d')}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveEvent(event.id);
                            }}
                            className="text-xs text-red-500 hover:text-red-600 font-bold hover:underline mt-1 transition-colors p-1 cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <p className={cn("text-[13px] mt-1 line-clamp-1 font-medium", isDarkMode ? "text-zinc-400" : "text-zinc-700")}>{event.description}</p>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* To-Do Panel Toggle Arrow */}
      <button
        onClick={() => setShowTodo(!showTodo)}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute -right-3.5 top-1/2 -translate-y-1/2 z-[45] border w-7 h-7 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center pointer-events-auto",
          isDarkMode 
            ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" 
            : "bg-white border-black/10 text-zinc-700 hover:bg-zinc-50 hover:text-black"
        )}
        title={showTodo ? "할 일 목록 닫기" : "할 일 목록 열기"}
      >
        {showTodo ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
    </div>

    {/* To-Do list on the right */}
    <AnimatePresence>
      {showTodo && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="origin-left"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Todo 
            events={events} 
            textColor={textColor} 
            isLocked={isLocked} 
            isDarkMode={isDarkMode}
            todoResetWarnMinutes={todoResetWarnMinutes}
            selectedDate={selectedDay || new Date()}
            activeTab={todoTab}
            onActiveTabChange={setTodoTab}
            onAddEventClick={() => {
              if (!selectedDay) {
                setSelectedDay(new Date());
              }
              setModalMode('add');
              setFormTitle('');
              setFormDesc('');
              setFormTime('12:00');
              setFormAlertEnabled(true);
              setIsModalOpen(true);
            }}
            onRemoveEvent={onRemoveEvent}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetStatus, CalendarEvent, ChatMessage } from '../types';
import { Heart, Zap, Dessert, MessageCircle, MessageCircleOff, CalendarDays, X, Sparkles } from 'lucide-react';
import { Chat } from './Chat';
import { cn } from '../lib/utils';
const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

interface PetProps {
  status: PetStatus;
  isTalking: boolean;
  lastMessage: string;
  onDoubleClickPet?: () => void;
  showChatInput?: boolean;
  onToggleChat: () => void;
  showCalendar?: boolean;
  onToggleCalendar: () => void;
  onSendMessage?: (text: string) => void;
  isLoading?: boolean;
  messages: ChatMessage[];
  dragConstraints?: React.RefObject<HTMLDivElement>;
  
  // Customization & State props
  showStatus?: boolean;
  onToggleStatus: () => void;
  petScale?: number; // 10 to 100 (%)
  petHue?: number; // 0 to 360
}

export const Pet: React.FC<PetProps> = ({ 
  status, isTalking, lastMessage, onDoubleClickPet,
  showChatInput, onToggleChat, showCalendar, onToggleCalendar, onSendMessage, isLoading, messages, dragConstraints,
  showStatus = false, onToggleStatus, petScale = 100, petHue = 250
}) => {
  return (
    <div className="flex flex-col items-center gap-6 relative pointer-events-none">
      
      {/* The Main Pet Unit - EVERYTHING HERE DRAGS TOGETHER */}
      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0.05}
        whileDrag={{ scale: 1.05 }}
        onMouseEnter={() => ipcRenderer?.send('pet-hover')}
        onMouseLeave={() => ipcRenderer?.send('pet-leave')}
        className="group relative flex flex-col items-center z-50 pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        {/* Speech Bubble - Relative to current position */}
        <AnimatePresence>
          {lastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 w-64 bg-white text-slate-900 p-4 rounded-3xl shadow-2xl z-[60] border-2 border-indigo-100 pointer-events-none mb-4 transition-all duration-300"
              style={{ bottom: '100%' }}
            >
              <p className="text-sm font-medium leading-relaxed">{lastMessage}</p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r-2 border-b-2 border-indigo-100" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Visual */}
        <div 
          onDoubleClick={onDoubleClickPet}
          className="relative pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-300"
          style={{ 
            width: `${192 * (petScale / 100)}px`, 
            height: `${192 * (petScale / 100)}px` 
          }}
          title="더블클릭으로 쓰다듬어 주기"
        >
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom transition-all duration-300"
            style={{ 
              width: '192px', 
              height: '192px', 
              transform: `scale(${petScale / 100})` 
            }}
          >
            <motion.div
              animate={{
                y: [-5, 5],
                scale: isTalking ? [1, 1.05] : 1,
              }}
              transition={{
                y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                scale: { duration: 0.2, repeat: isTalking ? Infinity : 0, repeatType: "reverse" }
              }}
              className="w-full h-full"
            >
              <div 
                className="absolute inset-0 rounded-[50%_50%_40%_40%] shadow-xl border-4 border-white/20 overflow-hidden transition-all duration-300"
                style={{ background: `linear-gradient(135deg, hsl(${petHue}, 85%, 60%), hsl(${(petHue + 40) % 360}, 90%, 50%))` }}
              >
                <div className="absolute top-[50%] left-[15%] w-6 h-3 bg-red-400/30 blur-sm rounded-full" />
                <div className="absolute top-[50%] right-[15%] w-6 h-3 bg-red-400/30 blur-sm rounded-full" />
                <div className="absolute top-[35%] left-[25%] flex flex-col items-center gap-1">
                  <motion.div 
                    animate={{ 
                      scaleY: [1, 0.1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, times: [0.95, 0.98, 1] }}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-slate-900 rounded-full" />
                  </motion.div>
                </div>
                <div className="absolute top-[35%] right-[25%] flex flex-col items-center gap-1">
                  <motion.div 
                    animate={{ 
                      scaleY: [1, 0.1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, times: [0.96, 0.99, 1] }}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-slate-900 rounded-full" />
                  </motion.div>
                </div>
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2">
                  <motion.div 
                    animate={{
                      height: isTalking ? [8, 16] : 8,
                      width: isTalking ? [12, 16] : 12,
                      borderRadius: isTalking ? "50%" : "0 0 10px 10px"
                    }}
                    className="bg-slate-900"
                  />
                </div>
              </div>
              <div 
                className="absolute -top-4 left-6 w-8 h-12 rounded-full -rotate-12 -z-10 transition-all duration-300" 
                style={{ backgroundColor: `hsl(${petHue}, 80%, 50%)` }}
              />
              <div 
                className="absolute -top-4 right-6 w-8 h-12 rounded-full rotate-12 -z-10 transition-all duration-300" 
                style={{ backgroundColor: `hsl(${petHue}, 80%, 50%)` }}
              />
            </motion.div>
          </div>
        </div>

        {/* Action Buttons - These follow the pet */}
        <div 
          className="absolute flex flex-col gap-3 p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-[70]"
          style={{ 
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)' 
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent parent drag when clicking buttons
        >
          {/* CHAT TOGGLE */}
          <button 
            onClick={onToggleChat}
            className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="모니와 대화"
          >
            {showChatInput ? (
              <MessageCircleOff className="w-6 h-6" />
            ) : (
              <MessageCircle className="w-6 h-6" />
            )}
          </button>

          {/* CALENDAR TOGGLE */}
          <button 
            onClick={() => {
              if (ipcRenderer) {
                if (showCalendar) {
                  ipcRenderer.send('calendar-close');
                } else {
                  ipcRenderer.send('calendar-open');
                }
              }
              onToggleCalendar();
            }}
            className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="일정 토글"
          >
            {showCalendar ? (
              <X className="w-6 h-6" />
            ) : (
              <CalendarDays className="w-6 h-6" />
            )}
          </button>

          {/* STATUS TOGGLE */}
          <button 
            onClick={onToggleStatus}
            className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title={showStatus ? "상태창 닫기" : "상태창 열기"}
          >
            {showStatus ? (
              <X className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Chat Input - Stays absolute below character and does not impact center position */}
        <AnimatePresence>
          {showChatInput && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-1/2 -translate-x-1/2 w-80 z-[100] mt-4"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag while typing/clicking chat
            >
              <div className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-4 shadow-2xl h-80 flex flex-col">
                 <div className="flex-1 overflow-hidden pointer-events-auto">
                   <Chat 
                    messages={messages.slice(-10)} // Show last 10 messages for context
                    onSendMessage={onSendMessage || (() => {})} 
                    isLoading={isLoading || false} 
                    variant="floating"
                  />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

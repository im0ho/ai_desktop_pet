import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetStatus, CalendarEvent, ChatMessage } from '../types';
import { MessageCircle, MessageCircleOff, CalendarDays, X, Sparkles } from 'lucide-react';
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
  petScale?: number; // 30 to 100 (%)
  petColor?: string;
  characterType?: 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear';
  equippedItem?: 'none' | 'sunglasses' | 'hat' | 'ribbon';
}

type CharacterType = 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear';
type EquippedItem = 'none' | 'sunglasses' | 'hat' | 'ribbon';

const PetCharacter = ({
  characterType,
  petColor,
  equippedItem,
}: {
  characterType: CharacterType;
  petColor: string;
  equippedItem: EquippedItem;
}) => {
  const body = petColor;
  const dark = petColor;
  const isWhite = petColor.toLowerCase() === '#ffffff' || petColor.toLowerCase() === 'white';
  const strokeColor = '#cbd5e1';
  const strokeW = '1.5';

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
      <defs>
        {/* Soft natural airbrush blush filter */}
        <filter id="blush-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        {/* Muzzle gradient for soft textures */}
        <linearGradient id="muzzle-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(243,244,246,0.9)" />
        </linearGradient>

        {/* Gold bell gradient */}
        <radialGradient id="bell-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>

        {/* Seed gradient for hamster */}
        <linearGradient id="seed-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Floating Sparkles for the Original (Blob) to make it feel magical & complete */}
      {characterType === 'original' && (
        <>
          {/* Top-Left sparkles */}
          <path d="M32 72 Q36 72 36 68 Q36 72 40 72 Q36 72 36 76 Q36 72 32 72 Z" fill="#fbbf24" opacity="0.8" className="animate-pulse" />
          {/* Right sparkles */}
          <path d="M168 100 Q171 100 171 97 Q171 100 174 100 Q171 100 171 103 Q171 100 168 100 Z" fill="#38bdf8" opacity="0.8" />
          {/* Bottom-left sparkles */}
          <path d="M42 144 Q44 144 44 142 Q44 144 46 144 Q44 144 44 146 Q44 144 42 144 Z" fill="#f472b6" opacity="0.75" />
        </>
      )}

      {/* Tails */}
      {characterType === 'rabbit' && (
        <>
          <circle cx="154" cy="144" r="14" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {characterType === 'dog' && (
        <>
          {isWhite && (
            <path d="M155 120 C190 100, 185 145, 158 135" fill="none" stroke={strokeColor} strokeWidth="19" strokeLinecap="round" />
          )}
          <path d="M155 120 C190 100, 185 145, 158 135" fill="none" stroke={dark} strokeWidth="16" strokeLinecap="round" />
        </>
      )}

      {characterType === 'cat' && (
        <>
          {isWhite && (
            <path d="M158 128 C190 110, 185 70, 160 85" fill="none" stroke={strokeColor} strokeWidth="17" strokeLinecap="round" />
          )}
          <path d="M158 128 C190 110, 185 70, 160 85" fill="none" stroke={dark} strokeWidth="14" strokeLinecap="round" />
        </>
      )}

      {characterType === 'bear' && (
        <>
          <circle cx="152" cy="142" r="13" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {/* Ears */}
      {characterType === 'rabbit' && (
        <>
          {/* Rabbit Left Ear */}
          <rect x="54" y="6" width="28" height="82" rx="14" fill={body} transform="rotate(-12 68 47)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Rabbit Right Ear */}
          <rect x="118" y="6" width="28" height="82" rx="14" fill={body} transform="rotate(12 132 47)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Inner Pink */}
          <rect x="61" y="16" width="14" height="54" rx="7" fill="#fbcfe8" transform="rotate(-12 68 47)" />
          <rect x="125" y="16" width="14" height="54" rx="7" fill="#fbcfe8" transform="rotate(12 132 47)" />
        </>
      )}

      {characterType === 'cat' && (
        <>
          {/* Cat Left Ear */}
          <path d="M44 74 L65 24 L88 74 Z" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Cat Right Ear */}
          <path d="M112 74 L135 24 L156 74 Z" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Inner Pink */}
          <path d="M57 66 L66 41 L76 66 Z" fill="#fda4af" />
          <path d="M124 66 L134 41 L143 66 Z" fill="#fda4af" />
        </>
      )}

      {characterType === 'hamster' && (
        <>
          {/* Left Round Ear */}
          <circle cx="56" cy="62" r="22" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          <circle cx="56" cy="62" r="12" fill="#fda4af" opacity="0.85" />
          {/* Right Round Ear */}
          <circle cx="144" cy="62" r="22" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          <circle cx="144" cy="62" r="12" fill="#fda4af" opacity="0.85" />
        </>
      )}

      {characterType === 'dog' && (
        <>
          {/* Drooping Puppy Ear Left */}
          <ellipse cx="44" cy="82" rx="22" ry="36" fill={dark} transform="rotate(15 44 82)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Drooping Puppy Ear Right */}
          <ellipse cx="156" cy="82" rx="22" ry="36" fill={dark} transform="rotate(-15 156 82)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {characterType === 'bear' && (
        <>
          {/* Bear Ear Left */}
          <circle cx="60" cy="55" r="20" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          <circle cx="60" cy="55" r="10" fill="#fda4af" opacity="0.85" />
          {/* Bear Ear Right */}
          <circle cx="140" cy="55" r="20" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          <circle cx="140" cy="55" r="10" fill="#fda4af" opacity="0.85" />
        </>
      )}

      {/* Body Core */}
      <ellipse cx="100" cy="110" rx="66" ry="62" fill={body} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />

      {/* Cute White Tummy patch */}
      {characterType !== 'original' && (
        <ellipse cx="100" cy="135" rx="38" ry="28" fill="rgba(255,255,255,0.45)" />
      )}

      {/* Arms & Hands (Not for original blob) */}
      {characterType !== 'original' && characterType !== 'hamster' && (
        <>
          {/* Left Arm */}
          <ellipse cx="48" cy="125" rx="16" ry="22" fill={dark} transform="rotate(-25 48 125)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Right Arm */}
          <ellipse cx="152" cy="125" rx="16" ry="22" fill={dark} transform="rotate(25 152 125)" stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {/* Feet & Legs (Not for original blob) */}
      {characterType !== 'original' && (
        <>
          {/* Left Foot */}
          <ellipse cx="72" cy="166" rx="18" ry="12" fill={dark} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Right Foot */}
          <ellipse cx="128" cy="166" rx="18" ry="12" fill={dark} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {/* Hamster Special: Holding a Sunflower Seed */}
      {characterType === 'hamster' && (
        <>
          {/* Sunflower seed */}
          <path d="M100 130 C94 140, 94 146, 100 152 C106 146, 106 140, 100 130" fill="url(#seed-grad)" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M100 130 L100 152" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          {/* Hamster Left Paw */}
          <ellipse cx="86" cy="144" rx="8" ry="6" fill={dark} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
          {/* Hamster Right Paw */}
          <ellipse cx="114" cy="144" rx="8" ry="6" fill={dark} stroke={isWhite ? strokeColor : 'none'} strokeWidth={isWhite ? strokeW : '0'} />
        </>
      )}

      {/* Deep Button Eyes - Safe and high-end aesthetic */}
      <circle cx="76" cy="95" r="5.5" fill="#1e293b" />
      <circle cx="124" cy="95" r="5.5" fill="#1e293b" />

      {/* Gorgeous Soft Airbrushed Blush (Using filter blurs!) */}
      <circle cx="63" cy="113" r="10" fill="#fb7185" filter="url(#blush-blur)" opacity="0.55" />
      <circle cx="137" cy="113" r="10" fill="#fb7185" filter="url(#blush-blur)" opacity="0.55" />

      {/* Character Specific Muzzles and Mouth Details */}
      {characterType === 'bear' && (
        <>
          <ellipse cx="100" cy="113" rx="15" ry="11" fill="url(#muzzle-grad)" />
          <circle cx="100" cy="109" r="3.5" fill="#1e293b" />
          <path d="M100 112 Q97 116 94 114" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100 112 Q103 116 106 114" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}

      {characterType === 'dog' && (
        <>
          <ellipse cx="100" cy="112" rx="17" ry="12" fill="url(#muzzle-grad)" />
          <circle cx="100" cy="107" r="3.5" fill="#1e293b" />
          <path d="M100 110 Q97 114 94 112" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100 110 Q103 114 106 112" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Tiny adorable pink tongue clicking out */}
          <path d="M98 111 Q100 118 102 111 Z" fill="#fda4af" stroke="#1e293b" strokeWidth="1" />
        </>
      )}

      {characterType === 'rabbit' && (
        <>
          <circle cx="100" cy="107" r="2.5" fill="#fda4af" />
          <path d="M100 109 Q97 114 94 112" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100 109 Q103 114 106 112" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}

      {characterType === 'cat' && (
        <>
          <circle cx="100" cy="106" r="2.5" fill="#1e293b" />
          <path d="M100 108 Q96 113 92 111" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100 108 Q104 113 108 111" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Whiskers */}
          <line x1="48" y1="112" x2="72" y2="115" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="48" y1="122" x2="72" y2="118" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="152" y1="112" x2="128" y2="115" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="152" y1="122" x2="128" y2="118" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}

      {characterType === 'hamster' && (
        <>
          <ellipse cx="100" cy="111" rx="12" ry="8" fill="url(#muzzle-grad)" />
          <circle cx="100" cy="107" r="2" fill="#fda4af" />
          <path d="M100 109 Q97 113 94 111" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M100 109 Q103 113 106 111" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Adorable little buck tooth */}
          <rect x="98.5" y="109" width="3" height="2.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
        </>
      )}

      {characterType === 'original' && (
        <>
          {/* Simple cozy blob smile */}
          <path d="M94 110 Q100 116 106 110" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Cat Collar with gold bell to look high-quality */}
      {characterType === 'cat' && (
        <>
          <path d="M72 121 Q100 128 128 121" stroke="#f43f5e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="126" r="6" fill="url(#bell-grad)" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="98.5" cy="124" r="1.2" fill="#ffffff" opacity="0.8" />
        </>
      )}

      {/* Equipped Accessories */}
      {equippedItem === 'sunglasses' && (
        <>
          <rect x="62" y="84" width="32" height="18" rx="8" fill="#1e293b" />
          <rect x="106" y="84" width="32" height="18" rx="8" fill="#1e293b" />
          <line x1="94" y1="93" x2="106" y2="93" stroke="#1e293b" strokeWidth="4.5" />
          {/* Reflection details on sunglasses */}
          <path d="M66 88 L74 88" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
          <path d="M110 88 L118 88" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {equippedItem === 'hat' && (
        <>
          <rect x="70" y="21" width="60" height="34" rx="6" fill="#1e293b" />
          <rect x="58" y="53" width="84" height="10" rx="5" fill="#1e293b" />
          <rect x="70" y="45" width="60" height="8" fill="#f43f5e" />
          {/* Decorative hat band reflection */}
          <line x1="72" y1="26" x2="72" y2="40" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
        </>
      )}

      {equippedItem === 'ribbon' && (
        <>
          {/* Pretty ribbon bow with shading */}
          <path d="M128 45 L152 33 L150 59 Z" fill="#f43f5e" />
          <path d="M128 45 L104 33 L106 59 Z" fill="#f43f5e" />
          <circle cx="128" cy="45" r="9" fill="#e11d48" />
        </>
      )}
    </svg>
  );
};

export const Pet: React.FC<PetProps> = ({ 
  status, isTalking, lastMessage, onDoubleClickPet,
  showChatInput, onToggleChat, showCalendar, onToggleCalendar, onSendMessage, isLoading, messages, dragConstraints,
  showStatus = false, onToggleStatus, petScale = 100, petColor = '#6366f1', characterType = 'rabbit', equippedItem = 'none',
}) => {
  const [petBubble, setPetBubble] = useState('');

  const handlePetDoubleClick = () => {
    const bubbles = [
      '쓰다듬어줘서 좋아! 💕',
      '헤헤 기분 좋아!',
      '더 쓰다듬어줘!',
      '고마워!'
    ];

    setPetBubble(bubbles[Math.floor(Math.random() * bubbles.length)]);
    if (onDoubleClickPet) {
      onDoubleClickPet();
    }

    setTimeout(() => {
      setPetBubble('');
    }, 3000);
  };

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
          {(lastMessage || petBubble) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 w-64 bg-white text-slate-900 p-4 rounded-3xl shadow-2xl z-[60] border-2 border-indigo-100 pointer-events-none mb-4 transition-all duration-300"
              style={{ bottom: '100%' }}
            >
              <p className="text-sm font-medium leading-relaxed">
                {petBubble || lastMessage}
              </p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r-2 border-b-2 border-indigo-100" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Visual */}
        <div 
          onDoubleClick={handlePetDoubleClick}
          className="relative pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-300 shadow-sm rounded-full"
          style={{ 
            width: `${192 * (petScale / 100)}px`, 
            height: `${192 * (petScale / 100)}px` 
          }}
          title="더블클릭으로 쓰다듬어 주기"
        >
          <motion.div
            animate={{
              y: [-5, 5],
              scale: isTalking ? [1, 1.02] : 1,
            }}
            transition={{
              y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              scale: { duration: 0.2, repeat: isTalking ? Infinity : 0, repeatType: "reverse" }
            }}
            className="w-full h-full"
          >
            <PetCharacter
              characterType={(characterType || 'bear') as CharacterType}
              petColor={petColor}
              equippedItem={(equippedItem || 'none') as EquippedItem}
            />
          </motion.div>
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

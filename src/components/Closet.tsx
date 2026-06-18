import React from 'react';
import { motion } from 'motion/react';
import { Palette, Shirt, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface ClosetProps {
  level: number;
  hue: number;
  onUpdateHue: (hue: number) => void;
  petColor: string;
  onUpdatePetColor: (color: string) => void;
  characterType: 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear';
  onUpdateCharacterType: (type: 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear') => void;
  equippedItem: 'none' | 'sunglasses' | 'hat' | 'ribbon';
  onUpdateEquippedItem: (item: 'none' | 'sunglasses' | 'hat' | 'ribbon') => void;
  isDarkMode?: boolean;
}

export const Closet: React.FC<ClosetProps> = ({
  level,
  hue,
  onUpdateHue,
  petColor,
  onUpdatePetColor,
  characterType,
  onUpdateCharacterType,
  equippedItem,
  onUpdateEquippedItem,
  isDarkMode = false,
}) => {
  const colorPresets = [
    { name: '보라', color: '#7c3aed', class: 'bg-indigo-600' },
    { name: '빨강', color: '#ef4444', class: 'bg-red-500' },
    { name: '주황', color: '#f97316', class: 'bg-orange-500' },
    { name: '초록', color: '#22c55e', class: 'bg-green-500' },
    { name: '파랑', color: '#3b82f6', class: 'bg-blue-500' },
    { name: '갈색', color: '#8B5A2B', class: 'bg-amber-800' },
    { name: '검정', color: '#000000', class: 'bg-black' },
    { name: '흰색', color: '#ffffff', class: 'bg-white border border-gray-400 dark:border-white/20' },
  ];

  return (
    <div
      className={cn(
        "w-80 rounded-[2.5rem] p-6 shadow-2xl border backdrop-blur-2xl transition-all duration-300",
        isDarkMode
          ? "bg-slate-900/90 border-white/10 text-white"
          : "bg-white/95 border-black/10 text-slate-800 shadow-slate-200/50"
      )}
      id="closet-window"
    >
      <div className="flex items-center gap-1.5 mb-5 relative z-10 select-none">
        <Shirt className="w-5 h-5 text-indigo-500 animate-pulse" />
        <h3 className="text-[17px] font-black uppercase tracking-wide flex items-center gap-1">
          Moni 옷장 & 스타일
        </h3>
      </div>

      <div className="space-y-5 relative z-10">
        {/* Character Select */}
        <div className={cn("p-4 rounded-3xl space-y-3", isDarkMode ? "bg-white/5" : "bg-black/5")}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider opacity-60">
              🐾 캐릭터 일러스트 외형
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'original', emoji: '✨', label: '기존형' },
              { type: 'bear', emoji: '🐻', label: '아기곰' },
              { type: 'rabbit', emoji: '🐰', label: '토끼' },
              { type: 'cat', emoji: '🐱', label: '고양이' },
              { type: 'hamster', emoji: '🐹', label: '햄스터' },
              { type: 'dog', emoji: '🐶', label: '강아지' },
            ].map((character) => (
              <button
                key={character.type}
                id={`btn-character-type-${character.type}`}
                onClick={() => onUpdateCharacterType(character.type as 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear')}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "py-2 rounded-2xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                  characterType === character.type
                    ? "bg-amber-500 text-white border-amber-500 shadow-lg scale-102"
                    : "border-zinc-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <span className="text-lg">
                  {character.emoji}
                </span>
                <span className="text-[11px]">
                  {character.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette customization */}
        <div className={cn("p-4 rounded-3xl space-y-3", isDarkMode ? "bg-white/5" : "bg-black/5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Palette className="w-4.5 h-4.5 text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider opacity-60">컬러 팔레트</span>
            </div>
            <span className="text-xs font-bold" style={{ color: `hsl(${hue}, 80%, 55%)` }}>
              Hue: {hue}°
            </span>
          </div>

          {/* Preset Buttons Grid */}
          <div className="flex justify-between items-center gap-1">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                id={`btn-color-preset-${preset.name}`}
                onClick={() => onUpdatePetColor(preset.color)}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  preset.class,
                  "w-6 h-6 rounded-full cursor-pointer transition-all border-2",
                  petColor === preset.color
                    ? "border-amber-400 scale-125 shadow-md"
                    : "border-transparent hover:scale-110"
                )}
                title={preset.name}
              />
            ))}
          </div>

          {/* Hue Slider Regulation */}
          <input
            type="range"
            min="0"
            max="360"
            id="slider-hue-range"
            value={hue}
            style={{
              background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)'
            }}
            onChange={(e) => onUpdateHue(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Item Shop */}
        <div className={cn("p-4 rounded-3xl space-y-3", isDarkMode ? "bg-white/5" : "bg-black/5")}>
          <span className="text-[11px] font-black uppercase tracking-wider opacity-60 block">
            🛍️ 치장 아이템 상점
          </span>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'none', label: '❌ 해제', needLevel: 1 },
              { id: 'sunglasses', label: '선글라스 🕶️', needLevel: 3 },
              { id: 'hat', label: '신사 모자 🎩', needLevel: 5 },
              { id: 'ribbon', label: '이쁜 리본 🎀', needLevel: 7 },
            ].map((item) => {
              const locked = level < item.needLevel;

              return (
                <button
                  key={item.id}
                  id={`btn-shop-item-${item.id}`}
                  disabled={locked}
                  onClick={() => onUpdateEquippedItem(item.id as 'none' | 'sunglasses' | 'hat' | 'ribbon')}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                    equippedItem === item.id
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                      : locked
                        ? "opacity-45 cursor-not-allowed border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-black/20 text-slate-500"
                        : "border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                >
                  <div>{item.label}</div>
                  {locked && (
                    <div className="text-[10px] text-rose-500">
                      LV.{item.needLevel} 해제
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

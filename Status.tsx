import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Heart, Sliders, Zap, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Closet } from './Closet';

interface StatusProps {
  level: number;
  exp: number;
  favorability: number;
  scale: number; // 30 to 100 (%)
  hue: number; // 0 to 360
  onClose: () => void;
  onUpdateScale: (scale: number) => void;
  onUpdateHue: (hue: number) => void;
  onUpdateExp: (exp: number) => void;
  onUpdateLevel: (level: number) => void;
  onUpdateFavorability: (fav: number) => void;
  isDarkMode?: boolean;
  isPetVisible: boolean;
  onTogglePetVisibility: () => void;
  characterType: 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear';
  onUpdateCharacterType: (type: 'original' | 'rabbit' | 'cat' | 'hamster' | 'dog' | 'bear') => void;
  equippedItem: 'none' | 'sunglasses' | 'hat' | 'ribbon';
  onUpdateEquippedItem: (item: 'none' | 'sunglasses' | 'hat' | 'ribbon') => void;
  petColor: string;
  onUpdatePetColor: (color: string) => void;

  customPetImage: string | null;
  onUpdateCustomPetImage: (image: string | null) => void;

  onPhotoEditorOpenChange?: (open: boolean) => void;
}

export const Status: React.FC<StatusProps> = ({
  level,
  exp,
  favorability,
  scale,
  hue,
  onClose,
  onUpdateScale,
  onUpdateHue,
  petColor,
  onUpdatePetColor,
  customPetImage,
  onUpdateCustomPetImage,
  onUpdateExp,
  onUpdateLevel,
  onUpdateFavorability,
  isDarkMode = false,
  isPetVisible,
  onTogglePetVisibility,
  characterType,
  onUpdateCharacterType,
  equippedItem,
  onUpdateEquippedItem,
  onPhotoEditorOpenChange,
}) => {
  const maxExp = 50 + level * 50;
  const expPercent = Math.min(100, Math.max(0, (exp / maxExp) * 100));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [photoLoaded, setPhotoLoaded] = useState(false);

  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);

  const [showCloset, setShowCloset] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moni_status_show_closet');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('moni_status_show_closet', String(showCloset));
  }, [showCloset]);

  // Determine favorability description & color
  let favStatus = "어색한 사이 ❄️";
  let favColor = "from-rose-400 to-pink-500";
  if (favorability > 80) {
    favStatus = "운명 공동체 ❤️";
    favColor = "from-red-500 to-rose-600 animate-pulse";
  } else if (favorability > 50) {
    favStatus = "든든한 친구 🌟";
    favColor = "from-amber-400 to-rose-50";
  } else if (favorability > 20) {
    favStatus = "친근한 대화 상대 🌱";
    favColor = "from-emerald-400 to-teal-500";
  }

  return (
    <>
      <div className="relative pointer-events-auto" id="status-panel-composite">
        <div 
          className={cn(
            "w-80 rounded-[2.5rem] p-6 shadow-2xl transition-all duration-300 border cursor-grab active:cursor-grabbing select-none relative shrink-0",
            !photoEditorOpen && "cursor-grab active:cursor-grabbing",
            isDarkMode 
              ? "bg-slate-900/90 border-white/10 text-white backdrop-blur-2xl" 
              : "bg-white/95 border-black/10 text-slate-800 shadow-slate-200/50 backdrop-blur-2xl"
          )}
          id="status-window"
        >
          {/* Dynamic hue-styled glow accent */}
          <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none transition-colors duration-500"
            style={{ backgroundColor: `hsl(${hue}, 80%, 65%)` }}
          />

          {/* Header */}
          <div 
            className="flex items-center justify-between mb-5 relative z-10 select-none"
          >
            <h3 className="text-[17px] font-black flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
              Moni 상태창
            </h3>
            <button 
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                isDarkMode ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-800"
              )}
              id="status-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div 
            className="space-y-5 relative z-10"
          >
          
            {/* EXP & Level */}
            <div className={cn("p-4 rounded-3xl", isDarkMode ? "bg-white/5" : "bg-black/5")} id="level-container">
              <div className="flex justify-between items-end mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4.5 h-4.5 text-indigo-500 fill-indigo-500/20" />
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-60">Level</span>
                </div>
                <span className="text-2xl font-black text-indigo-500">LV.{level}</span>
              </div>
            
              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-black/10 dark:bg-white/15 rounded-full overflow-hidden mb-1.5 relative">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${expPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            
              <div className="flex justify-between text-[11px] font-bold">
                <span className="opacity-60">다음 레벨까지</span>
                <span className="text-indigo-500">{exp} / {maxExp} EXP ({Math.round(expPercent)}%)</span>
              </div>
            </div>

            {/* Favorability (호감도) */}
            <div className={cn("p-4 rounded-3xl", isDarkMode ? "bg-white/5" : "bg-black/5")} id="favorability-container">
              <div className="flex justify-between items-end mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500/20" />
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-60">호감도 (Affection)</span>
                </div>
                <span className="text-lg font-black text-rose-500">{favorability} / 100</span>
              </div>

              <div className="w-full h-3 bg-black/10 dark:bg-white/15 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className={cn("h-full bg-gradient-to-r rounded-full", favColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${favorability}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="opacity-60">관계 상태</span>
                <span className="text-rose-500 font-extrabold">{favStatus}</span>
              </div>
            </div>

            {/* Physical Scale Customizable Option */}
            <div className={cn("p-4 rounded-3xl space-y-3", isDarkMode ? "bg-white/5" : "bg-black/5")} id="scale-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-4.5 h-4.5 text-teal-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-60">크기 조절 (30% ~ 100%)</span>
                </div>
                <span className="text-xs font-black text-teal-500">{scale}%</span>
              </div>
              <input 
                type="range" 
                min="30" 
                max="100" 
                value={scale} 
                id="slider-scale-range"
                onChange={(e) => onUpdateScale(Number(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full accent-teal-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Photo Pet Maker */}
            <div className={cn("p-4 rounded-3xl space-y-3", isDarkMode ? "bg-white/5" : "bg-black/5")}>
              <span className="text-[11px] font-black uppercase tracking-wider opacity-60">
               📷 반려동물 사진
              </span>

              <label
                className={cn(
                  "w-full py-3 rounded-2xl text-xs font-black border flex items-center justify-center cursor-pointer transition-all",
                  isDarkMode
                )}
                onPointerDown={(e) => e.stopPropagation()}
              >
                사진 불러오기
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = () => {
                      setEditorImage(reader.result as string);
                      setPhotoEditorOpen(true);
                      onPhotoEditorOpenChange?.(true);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              {customPetImage && (
                <button
                  onClick={() => onUpdateCustomPetImage(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full py-2 rounded-2xl text-xs font-black bg-rose-500 text-white"
                >
                  기본 캐릭터로 돌아가기
                </button>
              )}
            </div>

            {/* Pet Visibility Toggle */}
            <div className="flex flex-col items-center gap-1.5 w-full" id="visibility-toggle-container">
              <button
                onClick={onTogglePetVisibility}
                onPointerDown={(e) => e.stopPropagation()}
                id="btn-toggle-pet-visibility-status"
                className={cn(
                  "w-full py-3.5 rounded-3xl font-extrabold text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer select-none border shadow-sm",
                  isPetVisible
                    ? isDarkMode
                      ? "bg-rose-955/40 text-rose-450 hover:bg-rose-950 border-rose-900/40"
                      : "bg-rose-50 text-rose-650 hover:bg-rose-100 border-rose-100"
                    : isDarkMode
                      ? "bg-emerald-955/40 text-emerald-400 hover:bg-emerald-950 border-emerald-900/40"
                      : "bg-emerald-50 text-emerald-650 hover:bg-emerald-100 border-emerald-100"
                )}
              >
                {isPetVisible ? (
                  <>
                    <EyeOff className="w-4 h-4 animate-pulse" />
                    캐릭터 숨기기
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    캐릭터 나타내기
                  </>
                )}
              </button>
              <span className={cn(
                "text-[10px] font-semibold opacity-60 text-center mt-1",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                ※ 화면 오른쪽 아래에도 캐릭터 숨기기/나타내기 버튼이 있습니다.
              </span>
            </div>

          </div>

          {/* Closet Panel Toggle Arrow */}
          <button
            onClick={() => setShowCloset(!showCloset)}
            onPointerDown={(e) => e.stopPropagation()}
            id="btn-closet-toggle"
            className={cn(
              "absolute -right-3.5 top-1/2 -translate-y-1/2 z-[45] border w-7 h-7 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center pointer-events-auto",
              isDarkMode 
                ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" 
                : "bg-white border-black/10 text-zinc-700 hover:bg-zinc-50 hover:text-black"
            )}
            title={showCloset ? "옷장 스타일창 닫기" : "옷장 스타일창 열기"}
          >
            {showCloset ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Closet right side-by-side expansion panel */}
        <AnimatePresence>
          {showCloset && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="origin-left select-none absolute left-[calc(100%+16px)] top-0 z-[50]"
              onPointerDown={(e) => e.stopPropagation()}
              id="closet-expansion-container"
            >
              <Closet
                level={level}
                hue={hue}
                onUpdateHue={onUpdateHue}
                petColor={petColor}
                onUpdatePetColor={onUpdatePetColor}
                characterType={characterType}
                onUpdateCharacterType={onUpdateCharacterType}
                equippedItem={equippedItem}
                onUpdateEquippedItem={onUpdateEquippedItem}
                isDarkMode={isDarkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {photoEditorOpen && editorImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white text-slate-900 rounded-[2rem] p-5 shadow-2xl w-[560px] space-y-4 cursor-default"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">📷 반려동물 영역 선택</h3>
              <button
                onClick={() => {
                  setPhotoEditorOpen(false);
                  onPhotoEditorOpenChange?.(false);
                }}
                className="px-3 py-1 rounded-xl bg-slate-200 font-black text-xs"
              >
                닫기
              </button>
            </div>

            <p className="text-xs opacity-70">
              사용할 반려동물 부분을 마우스로 칠한 뒤 도트펫 생성을 누르세요.
            </p>

            <div className="relative w-[480px] h-[480px] mx-auto rounded-2xl overflow-hidden border bg-slate-100">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              <canvas
                ref={maskRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDrawingMask(true);

                  const canvas = maskRef.current;
                  if (!canvas) return;

                  const rect = canvas.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;

                  ctx.fillStyle = 'rgba(255, 193, 7, 0.45)';
                  ctx.beginPath();
                  ctx.arc(x, y, 22, 0, Math.PI * 2);
                  ctx.fill();
                }}
                onMouseMove={(e) => {
                  e.stopPropagation();
                  if (!isDrawingMask) return;

                  const canvas = maskRef.current;
                  if (!canvas) return;

                  const rect = canvas.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;

                  ctx.fillStyle = 'rgba(255, 193, 7, 0.45)';
                  ctx.beginPath();
                  ctx.arc(x, y, 22, 0, Math.PI * 2);
                  ctx.fill();
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  setIsDrawingMask(false);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  setIsDrawingMask(false);
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const mask = maskRef.current;
                  const ctx = mask?.getContext('2d');
                  if (!mask || !ctx) return;
                  ctx.clearRect(0, 0, mask.width, mask.height);
                }}
                className="py-3 rounded-2xl text-xs font-black border"
              >
                선택 지우기
              </button>

              <button
                onClick={() => {
                  const img = new Image();

                  img.onload = () => {
                    const canvas = canvasRef.current;
                    const mask = maskRef.current;
                    if (!canvas || !mask) return;

                    const size = 480;
                    canvas.width = size;
                    canvas.height = size;
                    mask.width = size;
                    mask.height = size;

                    const ctx = canvas.getContext('2d');
                    const maskCtx = mask.getContext('2d');
                    if (!ctx || !maskCtx) return;

                    ctx.clearRect(0, 0, size, size);
                    maskCtx.clearRect(0, 0, size, size);

                    const scale = Math.min(size / img.width, size / img.height);
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const x = (size - drawWidth) / 2;
                    const y = (size - drawHeight) / 2;

                    ctx.drawImage(img, x, y, drawWidth, drawHeight);
                  };

                  img.src = editorImage;
                }}
                className="py-3 rounded-2xl text-xs font-black border"
              >
                사진 다시 표시
              </button>

              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  const mask = maskRef.current;
                  if (!canvas || !mask) return;

                  const sourceCtx = canvas.getContext('2d');
                  const maskCtx = mask.getContext('2d');
                  if (!sourceCtx || !maskCtx) return;

                  const size = canvas.width;
                  const sourceData = sourceCtx.getImageData(0, 0, size, size);
                  const maskData = maskCtx.getImageData(0, 0, size, size);

                  let minX = size;
                  let minY = size;
                  let maxX = 0;
                  let maxY = 0;

                  for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                      const i = (y * size + x) * 4;
                      const selected = maskData.data[i + 3] > 0;

                      if (!selected) {
                        sourceData.data[i + 3] = 0;
                      } else {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                      }
                    }
                  }

                  if (minX >= maxX || minY >= maxY) return;

                  const cutCanvas = document.createElement('canvas');
                  cutCanvas.width = size;
                  cutCanvas.height = size;
                  const cutCtx = cutCanvas.getContext('2d');
                  if (!cutCtx) return;
                  cutCtx.putImageData(sourceData, 0, 0);

                  const padding = 16;
                  minX = Math.max(0, minX - padding);
                  minY = Math.max(0, minY - padding);
                  maxX = Math.min(size, maxX + padding);
                  maxY = Math.min(size, maxY + padding);

                  const cropWidth = maxX - minX;
                  const cropHeight = maxY - minY;

                  const smallSize = 48;
                  const finalSize = 192;

                  const smallCanvas = document.createElement('canvas');
                  smallCanvas.width = smallSize;
                  smallCanvas.height = smallSize;
                  const smallCtx = smallCanvas.getContext('2d');
                  if (!smallCtx) return;

                  smallCtx.imageSmoothingEnabled = false;
                  smallCtx.clearRect(0, 0, smallSize, smallSize);

                  const scale = Math.min(smallSize / cropWidth, smallSize / cropHeight);
                  const drawWidth = cropWidth * scale;
                  const drawHeight = cropHeight * scale;
                  const x = (smallSize - drawWidth) / 2;
                  const y = (smallSize - drawHeight) / 2;

                  smallCtx.drawImage(
                    cutCanvas,
                    minX,
                    minY,
                    cropWidth,
                    cropHeight,
                    x,
                    y,
                    drawWidth,
                    drawHeight
                  );

                  const finalCanvas = document.createElement('canvas');
                  finalCanvas.width = finalSize;
                  finalCanvas.height = finalSize;
                  const finalCtx = finalCanvas.getContext('2d');
                  if (!finalCtx) return;

                  finalCtx.imageSmoothingEnabled = false;
                  finalCtx.clearRect(0, 0, finalSize, finalSize);
                  finalCtx.drawImage(smallCanvas, 0, 0, finalSize, finalSize);

                  onUpdateCustomPetImage(finalCanvas.toDataURL('image/png'));
                  setPhotoEditorOpen(false);
                  onPhotoEditorOpenChange?.(false);
                }}
                className="py-3 rounded-2xl text-xs font-black bg-yellow-400 text-black"
              >
                도트펫 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  variant?: 'floating' | 'log';
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, variant = 'floating' }) => {
  const [input, setInput] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLogMode = variant === 'log';

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If we are scrolled up by more than 80px, show the scroll-to-bottom button
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
      setShowScrollBottomBtn(!isNearBottom);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;

      // Only auto-scroll on messages change IF the user is already near the bottom,
      // or if it is the very first load.
      const isInitialLoad = messages.length > 0 && scrollTop === 0 && scrollHeight === clientHeight;

      if (isNearBottom || isInitialLoad) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Scroll to bottom once on mount (when chat window is opened)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      // Force scroll to bottom immediately upon sending message
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
    }
  };

  return (
    <div className={cn(
      "flex flex-col w-full transition-all relative",
      isLogMode ? "h-full bg-transparent border-none p-0" : "h-full rounded-[2.5rem] max-w-lg bg-black/40 backdrop-blur-xl border border-white/10 p-6 shadow-2xl"
    )}>
      {!isLogMode && (
        <div className="flex items-center gap-2 mb-4 px-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Talk to Moni</h3>
        </div>
      )}

      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide relative",
          messages.length > 0 ? "mb-4" : ""
        )}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white/10 text-white border border-white/5 rounded-tl-none"
              )}>
                {msg.parts[0].text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showScrollBottomBtn && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 5 }}
            onClick={() => scrollToBottom('smooth')}
            className={cn(
              "absolute p-2.5 rounded-full shadow-lg border flex items-center justify-center transition-all cursor-pointer z-10 active:scale-90",
              isLogMode 
                ? "bottom-16 right-2 bg-indigo-600 border-indigo-400 text-white hover:bg-indigo-500" 
                : "bottom-20 right-6 bg-[#252830]/90 border-white/20 text-white hover:bg-indigo-600"
            )}
            title="최하단으로 이동"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Moni에게 말을 걸어보세요..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-5 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
        />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-400 transition-colors disabled:opacity-50"
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};


"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, User, Bot, RotateCcw } from "lucide-react";
import api from "@/lib/api";

export default function FloatingAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hi! I'm the ZENITH intelligent interface. How can I help you refine your profile or prepare for your next interview today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus input when chat opens (works on mobile)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 350);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.post("/chat", {
        message: userMessage,
        context: "The user is currently browsing their dashboard. Help them with career advice, resume tips, or interview kit refinements."
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{ role: 'assistant', content: "Hi! I'm the ZENITH intelligent interface. How can I help you refine your profile or prepare for your next interview today?" }]);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[2000] font-sans">
      {isOpen ? (
        <div 
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 md:inset-auto md:relative bg-card border border-border w-full h-[100dvh] md:w-[400px] md:h-[550px] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 z-[2000]"
        >
          {/* Header */}
          <div className="bg-foreground p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md relative shrink-0 border border-background/20">
                <img src="/assistant_avatar.png" alt="Neural Navigator" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-background">Neural Navigator</h3>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="text-[11px] text-background/70 font-semibold uppercase tracking-wider">Active Operation</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="text-background/60 hover:text-background transition-colors p-1" title="Reset conversation">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                className="text-background/60 hover:text-background transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4.5 py-3 rounded-2xl text-[14px] leading-relaxed font-normal ${
                  m.role === 'user' 
                    ? 'bg-foreground text-background rounded-tr-none shadow-md' 
                    : 'bg-secondary text-foreground/90 border border-border rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary p-4 rounded-2xl rounded-tl-none border border-border shadow-sm">
                  <Loader2 className="w-4 h-4 text-foreground/40 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-5 bg-card border-t border-border flex gap-2 sticky bottom-0 z-20 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the system..."
              ref={inputRef}
              className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted-foreground/50 font-normal shadow-inner"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-foreground p-3 rounded-xl text-background hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-90"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-2xl transition-all hover:scale-110 active:scale-95 group relative border-4 border-background ring-1 ring-border p-0"
        >
          <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-lg shadow-green-500/20 z-10 animate-pulse"></div>
          <img src="/assistant_avatar.png" alt="AI Assistant" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </button>
      )}
    </div>
  );
}

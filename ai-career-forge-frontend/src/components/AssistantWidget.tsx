"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, X, MessageSquare, Sparkles, 
  ChevronRight, BrainCircuit, Terminal, Globe 
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import { toast } from "sonner";

interface ChatAction {
  label: string;
  action: string;
  payload: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  actions?: ChatAction[];
}

const getGuestId = () => {
  if (typeof window === 'undefined') return 'guest_server';
  let gid = sessionStorage.getItem('assistant_guest_id');
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('assistant_guest_id', gid);
  }
  return gid;
};

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [isTucked, setIsTucked] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchDeltaRef = useRef<number>(0);

  const handleTuck = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTucked(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    touchDeltaRef.current = currentX - touchStartRef.current;
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null) return;
    const delta = touchDeltaRef.current;
    
    // Swipe right (positive delta) to tuck in
    if (delta > 30 && !isTucked) {
      setIsTucked(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
    // Swipe left (negative delta) to untuck/slide out
    else if (delta < -30 && isTucked) {
      setIsTucked(false);
      resetInactivityTimer();
    }
    
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
  };


  const resetInactivityTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isOpen) {
      setIsTucked(false);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setIsTucked(true);
    }, 10000); // 10 seconds of inactivity
  };

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    setIsTucked(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    resetInactivityTimer();
  };

  useEffect(() => {
    // Initial greeting for a fresh session
    setMessages([{
      id: "welcome",
      role: "ASSISTANT",
      content: "Hello! I'm your AI Career Assistant. How can I help you optimize your trajectory today?"
    }]);
    scrollToBottom();
  }, [isOpen]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "USER",
      content: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.post("/assistant/chat", {
        sessionId,
        message: input
      }, {
        headers: { 'X-Guest-ID': getGuestId() }
      });
      
      setMessages(prev => [...prev, res.data]);
      if (!sessionId) setSessionId(res.data.sessionId);
    } catch (err) {
      console.error("Chat failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: ChatAction) => {
    if (action.action === "NAVIGATE") {
      router.push(action.payload);
      setIsOpen(false);
    } else {
      console.log("Custom action:", action);
    }
  };



  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[400px] h-[600px] bg-card/80 backdrop-blur-3xl border border-border rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div className="p-6 border-b border-border bg-foreground/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tighter">Zenith Core AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Active</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.role === "USER" ? "items-end" : "items-start"} gap-2`}
              >
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                  msg.role === "USER" 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-secondary text-foreground rounded-tl-none border border-border"
                }`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({node, ...props}) => <span className="font-black text-blue-500" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                
                {/* Actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAction(action)}
                        className="px-4 py-2 bg-foreground/5 hover:bg-blue-600 hover:text-white border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-border bg-foreground/5">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Zenith anything..."
                className="w-full bg-background border border-border rounded-2xl py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 w-10 h-10 bg-foreground text-background rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen ? (
        <div 
          className="relative group/toggle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isTucked && (
            <button
              onClick={handleTuck}
              className="absolute -top-2 -left-2 bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground border border-border rounded-full p-1 shadow-md opacity-0 group-hover/toggle:opacity-100 transition-opacity z-50 hidden md:flex items-center justify-center"
              title="Tuck into side"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 ${
              isOpen 
                ? "bg-foreground text-background" 
                : "bg-blue-600 text-white shadow-blue-600/40"
            } ${
              !isOpen && isTucked 
                ? "translate-x-[80px] opacity-35 hover:translate-x-0 hover:opacity-100" 
                : "translate-x-0 opacity-100"
            }`}
          >
            {isOpen ? <X className="w-8 h-8" /> : <Bot className="w-8 h-8" />}
            {!isOpen && !isTucked && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-background rounded-full"></div>
            )}
          </button>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 ${
            isOpen 
              ? "bg-foreground text-background" 
              : "bg-blue-600 text-white shadow-blue-600/40"
          }`}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Bot className="w-8 h-8" />}
        </button>
      )}
    </div>
  );
}

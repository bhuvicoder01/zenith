"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, X, 
  ChevronRight, BrainCircuit, RotateCcw 
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  // Draggable states and handlers
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const buttonStart = useRef({ x: 0, y: 0 });
  const [isSnappedLeft, setIsSnappedLeft] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Initial position on right edge, vertically centered
    const buttonWidth = 45;
    const initialX = window.innerWidth - buttonWidth;
    const initialY = window.innerHeight / 2 - 40;
    setPosition({ x: initialX, y: initialY });
  }, []);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only drag with left click/primary touch
    setIsDragging(true);
    setHasMoved(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    buttonStart.current = { x: position.x, y: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasMoved(true);
    }
    
    let newX = buttonStart.current.x + deltaX;
    let newY = buttonStart.current.y + deltaY;
    
    const buttonWidth = 45;
    const buttonHeight = 80;
    const maxX = window.innerWidth - buttonWidth;
    const maxY = window.innerHeight - buttonHeight;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const buttonWidth = 45;
    const middleX = window.innerWidth / 2;
    const snapLeft = position.x + buttonWidth / 2 < middleX;
    
    const finalX = snapLeft ? 0 : window.innerWidth - buttonWidth;
    const buttonHeight = 80;
    const maxY = window.innerHeight - buttonHeight;
    const finalY = Math.max(0, Math.min(position.y, maxY));
    
    setPosition({ x: finalX, y: finalY });
    setIsSnappedLeft(snapLeft);
  };

  useEffect(() => {
    if (!isMounted) return;
    const handleResize = () => {
      const buttonWidth = 45;
      const finalX = isSnappedLeft ? 0 : window.innerWidth - buttonWidth;
      const buttonHeight = 80;
      const maxY = window.innerHeight - buttonHeight;
      const finalY = Math.max(0, Math.min(position.y, maxY));
      setPosition({ x: finalX, y: finalY });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMounted, isSnappedLeft, position.y]);

  // Set welcome message only on first mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "ASSISTANT",
        content: "Hello! I'm your AI Career Assistant. How can I help you optimize your trajectory today?"
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus input when chat opens (works on mobile)
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 350);
    }
  }, [isOpen]);

  const handleReset = () => {
    setMessages([{
      id: "welcome",
      role: "ASSISTANT",
      content: "Hello! I'm your AI Career Assistant. How can I help you optimize your trajectory today?"
    }]);
    setSessionId(null);
    setInput("");
    scrollToBottom();
  };

  const scrollToBottom = () => {
    // Delay to let React render the messages first
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
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
    scrollToBottom();

    try {
      const res = await api.post("/assistant/chat", {
        sessionId,
        message: input
      }, {
        headers: { 'X-Guest-ID': getGuestId() }
      });
      
      setMessages(prev => [...prev, res.data]);
      if (!sessionId) setSessionId(res.data.sessionId);
      scrollToBottom();
    } catch (err) {
      console.error("Chat failed", err);
      toast.error("Failed to connect to Neural Network");
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
    <>
      {/* Draggable Floating Toggle Button */}
      {!isOpen && isMounted && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!hasMoved) {
              setIsOpen(true);
            }
          }}
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: "none",
            transition: isDragging ? "none" : "left 0.35s cubic-bezier(.4,0,.2,1), top 0.35s cubic-bezier(.4,0,.2,1)",
          }}
          className={`z-[1000] bg-foreground text-background border border-border/20 py-4 px-2.5 flex flex-col items-center gap-2.5 shadow-xl shadow-foreground/10 group select-none ${
            isDragging ? "cursor-grabbing scale-110 opacity-80" : "cursor-grab hover:scale-105"
          } ${
            isSnappedLeft
              ? "rounded-r-2xl rounded-l-none"
              : "rounded-l-2xl rounded-r-none"
          } transition-[transform,opacity,border-radius] duration-300`}
          title="Drag to reposition · Tap to open"
        >
          <div className="w-7 h-7 rounded-lg border border-border/15 overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-110">
            <img 
              src="/assistant_avatar.png" 
              alt="AI Logo" 
              className={`w-full h-full object-cover ${isDragging ? "animate-pulse" : ""}`} 
            />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest flex flex-col items-center leading-[1.1] opacity-75 group-hover:opacity-100 transition-opacity">
            <span>A</span>
            <span>I</span>
            <span className="h-1"></span>
            <span>C</span>
            <span>O</span>
            <span>R</span>
            <span>E</span>
          </span>
        </button>
      )}

      {/* Slide-out Side Drawer */}
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed right-0 top-0 bottom-0 h-[100dvh] w-full md:max-w-[400px] bg-card/85 backdrop-blur-3xl border-l border-border shadow-2xl flex flex-col z-[1200] animate-in slide-in-from-right duration-300"
        >
          {/* Left Edge Tucked-In Close Tab (Desktop only to prevent off-screen positioning on mobile) */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-foreground text-background border-l border-t border-b border-border/20 rounded-l-2xl py-4 px-2.5 hover:bg-foreground/90 transition-all shadow-xl flex flex-col items-center gap-2 cursor-pointer"
            title="Close Assistant"
          >
            <ChevronRight className="w-4 h-4 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest flex flex-col items-center leading-[1.1]">
              <span>C</span>
              <span>L</span>
              <span>O</span>
              <span>S</span>
              <span>E</span>
            </span>
          </button>

          {/* Chat Container */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border bg-foreground/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl border border-border bg-muted flex items-center justify-center overflow-hidden shadow-lg relative group">
                  <img src="/assistant_avatar.png" alt="Zenith Core AI" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tighter">Zenith Core AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleReset}
                  className="p-2 hover:bg-foreground/10 rounded-full transition-colors group"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scrollbar-hide"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "USER" ? "items-end" : "items-start"} gap-2`}
                >
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
                    msg.role === "USER" 
                      ? "bg-foreground text-background rounded-tr-none" 
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        strong: ({node, ...props}) => <span className="font-black text-foreground" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction(action);
                          }}
                          className="px-4 py-2 bg-foreground/5 hover:bg-foreground hover:text-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
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
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 border-t border-border bg-card sticky bottom-0 z-20 shrink-0">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask Zenith anything..."
                  ref={inputRef}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-4 pr-12 md:py-4 md:pl-6 md:pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1.5 top-1.5 w-9 h-9 md:right-2 md:top-2 md:w-10 md:h-10 bg-foreground text-background rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

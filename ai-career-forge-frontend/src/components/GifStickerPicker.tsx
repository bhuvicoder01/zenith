"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Flame, Sparkles, Smile, MessageSquare, Loader2 } from "lucide-react";

interface GifStickerPickerProps {
  onSelect: (url: string, type: "gif" | "sticker") => void;
  onClose: () => void;
}

// ------- Expanded Curated Collections -------
const CURATED_GIFS = [
  // Coding / Work
  { url: "https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif", title: "Hacker Typing", tags: ["coding", "work", "hacker", "typing"] },
  { url: "https://media.giphy.com/media/13GIgrGdslD9oQ/giphy.gif", title: "Coding Struggle", tags: ["coding", "work", "frustrated", "bug"] },
  { url: "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif", title: "Cat on Computer", tags: ["coding", "work", "cat", "funny"] },
  { url: "https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif", title: "Loading Spinner", tags: ["coding", "loading", "wait"] },
  // Success / Celebration
  { url: "https://media.giphy.com/media/g9582DNuQppazNm433/giphy.gif", title: "DiCaprio Cheers", tags: ["success", "celebrate", "cheers", "yes"] },
  { url: "https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif", title: "Party Confetti", tags: ["success", "celebrate", "party"] },
  { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", title: "Victory Dance", tags: ["success", "dance", "celebrate", "happy"] },
  { url: "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif", title: "Nailed It", tags: ["success", "nailed it", "perfect"] },
  // Reactions
  { url: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif", title: "Shocked Pikachu", tags: ["shocked", "surprise", "reaction", "pikachu"] },
  { url: "https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif", title: "Mind Blown", tags: ["mind blown", "shocked", "reaction"] },
  { url: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif", title: "Thumbs Up", tags: ["agree", "yes", "thumbs up", "ok"] },
  { url: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Gc0/giphy.gif", title: "Applause", tags: ["clap", "agree", "applause", "yes"] },
  { url: "https://media.giphy.com/media/26xBI73gWquGHjRU4/giphy.gif", title: "Steve Carell Yes", tags: ["yes", "agree", "reaction"] },
  { url: "https://media.giphy.com/media/d2lcHJTG5TGI2kQH/giphy.gif", title: "Crying Sad", tags: ["sad", "cry", "error", "stress"] },
  // Funny
  { url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", title: "Cat Typing", tags: ["cat", "typing", "funny", "coding"] },
  { url: "https://media.giphy.com/media/H4DjXQXamtTiIuCcRU/giphy.gif", title: "Awkward Smile", tags: ["awkward", "nervous", "smile"] },
  { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", title: "Mic Drop", tags: ["mic drop", "cool", "boss"] },
  { url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", title: "Deal With It", tags: ["cool", "deal with it", "sunglasses"] },
  // Tech / AI
  { url: "https://media.giphy.com/media/IcGkqdUmYLFGE/giphy.gif", title: "Robot Dance", tags: ["robot", "ai", "tech", "dance"] },
  { url: "https://media.giphy.com/media/RbDKaczqWovIugyJmW/giphy.gif", title: "AI Brain", tags: ["ai", "brain", "tech", "future"] },
];

const CURATED_STICKERS = [
  { url: "https://media.giphy.com/media/lnlAifQdenMxW/giphy.gif", title: "Rocket Launch", tags: ["success", "launch", "rocket", "go"] },
  { url: "https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif", title: "Thumbs Up Star", tags: ["agree", "yes", "like", "star"] },
  { url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", title: "Cool Doge", tags: ["cool", "doge", "funny", "meme"] },
  { url: "https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif", title: "Heart Sparkle", tags: ["love", "heart", "sparkle", "like"] },
  { url: "https://media.giphy.com/media/fxI1G5PNC5esyNlIUs/giphy.gif", title: "Celebration Stars", tags: ["celebrate", "stars", "party", "success"] },
  { url: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif", title: "Surprised Pikachu", tags: ["shocked", "surprise", "pikachu"] },
  { url: "https://media.giphy.com/media/l2JhpjWPccQhsAMfu/giphy.gif", title: "Fire Hot", tags: ["fire", "hot", "lit", "amazing"] },
  { url: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif", title: "Lightning Bolt", tags: ["energy", "lightning", "power", "fast"] },
  { url: "https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif", title: "Dancing Cat", tags: ["funny", "cat", "dance", "happy"] },
  { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Sparkle Star", tags: ["sparkle", "star", "magic", "shine"] },
  { url: "https://media.giphy.com/media/lMameLIF8voLu8HxWV/giphy.gif", title: "Coding Developer", tags: ["coding", "developer", "work", "laptop"] },
  { url: "https://media.giphy.com/media/KzDqC8LvVC4lshCsGJ/giphy.gif", title: "High Five", tags: ["agree", "high five", "team", "success"] },
];

// -------- Tenor API (Google's free GIF API, no key needed for web) --------
const TENOR_API_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"; // Google public Tenor key
const TENOR_CLIENT_KEY = "ai_career_forge";

async function searchTenor(
  query: string,
  type: "gif" | "sticker",
  limit = 24
): Promise<{ url: string; title: string }[]> {
  const endpoint = type === "sticker" ? "stickersearch" : "search";
  const url = `https://tenor.googleapis.com/v2/${endpoint}?q=${encodeURIComponent(
    query
  )}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=${limit}&media_filter=gif`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tenor API returned ${response.status}`);
  }
  const data = await response.json();
  if (!data?.results || !Array.isArray(data.results)) {
    return [];
  }
  return data.results
    .map((item: any) => ({
      url:
        item.media_formats?.gif?.url ||
        item.media_formats?.tinygif?.url ||
        item.media_formats?.mediumgif?.url ||
        "",
      title: item.content_description || "",
    }))
    .filter((item: { url: string }) => item.url);
}

// -------- Component --------
export default function GifStickerPicker({ onSelect, onClose }: GifStickerPickerProps) {
  const [activeTab, setActiveTab] = useState<"gif" | "sticker">("gif");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<{ url: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Lock background scroll
    document.body.style.overflow = "hidden";

    // Load initial curated
    loadCurated();

    // Event listener for ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [activeTab]);

  const loadCurated = () => {
    const list = activeTab === "gif" ? CURATED_GIFS : CURATED_STICKERS;
    setResults(list.map(item => ({ url: item.url, title: item.title })));
  };

  const fallbackLocalFilter = useCallback(
    (query: string) => {
      const list = activeTab === "gif" ? CURATED_GIFS : CURATED_STICKERS;
      const lower = query.toLowerCase();
      const filtered = list.filter(
        item =>
          item.title.toLowerCase().includes(lower) ||
          item.tags.some(tag => tag.toLowerCase().includes(lower))
      );
      setResults(filtered.map(item => ({ url: item.url, title: item.title })));
    },
    [activeTab]
  );

  // Debounced search handler
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        loadCurated();
        return;
      }

      // Always show local results instantly while API loads
      fallbackLocalFilter(query);

      if (!apiAvailable) return;

      // Clear previous timer
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        setLoading(true);
        try {
          const apiResults = await searchTenor(query, activeTab);
          if (apiResults.length > 0) {
            setResults(apiResults);
          }
          // If API returns empty, keep local results already set
        } catch (err) {
          console.warn("Tenor API request failed, using local search:", err);
          setApiAvailable(false); // Stop trying the API for this session
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [activeTab, apiAvailable, fallbackLocalFilter]
  );

  // Close when clicking outside of modal container
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
    >
      <div 
        ref={modalRef}
        className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300 flex flex-col h-[520px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
              Share {activeTab === "gif" ? "GIF" : "Sticker"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-2xl shrink-0 border border-border/55">
          <button
            onClick={() => {
              setActiveTab("gif");
              setSearchQuery("");
            }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "gif" 
                ? "bg-foreground text-background shadow-md" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-4 h-4" />
            GIFs
          </button>
          <button
            onClick={() => {
              setActiveTab("sticker");
              setSearchQuery("");
            }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "sticker" 
                ? "bg-foreground text-background shadow-md" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Stickers
          </button>
        </div>

        {/* Search Input */}
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search for ${activeTab === "gif" ? "GIFs" : "stickers"}...`}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-secondary/30 border border-border/80 rounded-2xl pl-11 pr-5 py-4.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>

        {/* API Status Banner (only when API failed) */}
        {!apiAvailable && searchQuery.trim() && (
          <div className="shrink-0 text-[10px] text-center text-muted-foreground bg-secondary/20 rounded-xl py-1.5 px-3 border border-border/40">
            Showing curated results &middot; Online search unavailable
          </div>
        )}

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 no-scrollbar">
          {results.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {results.map((item, idx) => (
                <button
                  key={`${item.url}-${idx}`}
                  onClick={() => onSelect(item.url, activeTab)}
                  className={`w-full overflow-hidden border border-border/75 hover:border-primary/50 transition-all rounded-2xl group relative ${
                    activeTab === "sticker" ? "p-2 bg-secondary/10" : "aspect-video bg-secondary/15"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <span className="text-[8px] text-white font-bold uppercase truncate w-full">
                      {item.title || (activeTab === "gif" ? "Send GIF" : "Send Sticker")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 py-10">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-xs font-bold">No matching {activeTab === "gif" ? "GIFs" : "Stickers"} found</p>
              <p className="text-[10px] text-muted-foreground/60">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

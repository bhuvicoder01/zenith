import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface PublicProfile {
  userId: string;
  fullName: string;
  username?: string;
  headline?: string;
  profilePhotoUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  initialMentions?: PublicProfile[];
}

export default function MentionInput({
  value,
  onChange,
  placeholder = "Add to the discussion...",
  disabled = false,
  rows = 2,
  className = "",
  autoFocus = false,
  onKeyDown,
  initialMentions = [],
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [activeTrigger, setActiveTrigger] = useState<"mention" | "hashtag" | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [triggerIdx, setTriggerIdx] = useState(-1);
  const [selectedProfiles, setSelectedProfiles] = useState<PublicProfile[]>(initialMentions);

  const [hashtagsList, setHashtagsList] = useState<string[]>([
    "career", "ai", "recruiting", "developer", "technology", "webdev", 
    "resume", "interview", "zenith", "software", "productivity", "internship", "jobs", "placement"
  ]);

  // Load hashtags from backend on mount
  useEffect(() => {
    const loadHashtags = async () => {
      try {
        const res = await api.get("/hashtags");
        if (res.data && Array.isArray(res.data)) {
          const tags = res.data.map((h: { name: string }) => h.name);
          if (tags.length > 0) {
            setHashtagsList(tags);
          }
        }
      } catch (err) {
        console.error("Failed to load hashtags:", err);
      }
    };
    loadHashtags();
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Position cursor at the end of text when autofocusing (e.g. on clicking reply)
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const valLength = textareaRef.current.value.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(valLength, valLength);
    }
  }, [autoFocus]);

  // Sync selectedProfiles with initialMentions when they load
  const initialMentionsStr = JSON.stringify(initialMentions);
  useEffect(() => {
    if (initialMentions && initialMentions.length > 0) {
      setSelectedProfiles((prev) => {
        const unique = [...prev];
        let changed = false;
        initialMentions.forEach((m) => {
          if (!unique.some((u) => u.userId === m.userId)) {
            unique.push(m);
            changed = true;
          }
        });
        return changed ? unique : prev;
      });
    }
  }, [initialMentionsStr]);

  // Sync selectedProfiles with actual mentions in text.
  // If someone deletes `@username`, remove that profile from selectedProfiles.
  useEffect(() => {
    const updatedProfiles = selectedProfiles.filter((profile) => {
      const handle = profile.username || "";
      return handle && value.includes(`@${handle}`);
    });
    if (updatedProfiles.length !== selectedProfiles.length) {
      setSelectedProfiles(updatedProfiles);
      const userIds = updatedProfiles.map((p) => p.userId);
      onChangeRef.current(value, userIds);
    }
  }, [value, selectedProfiles]);

  // Fetch suggestions when query changes for mentions
  useEffect(() => {
    if (!showSuggestions || triggerIdx === -1 || activeTrigger !== "mention") return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/profile/public/search?query=${encodeURIComponent(query)}`);
        // Filter suggestions to only include profiles that have a username set
        const profilesWithUsernames = (res.data || []).filter((p: PublicProfile) => p.username && p.username.trim() !== "");
        setSuggestions(profilesWithUsernames);
        setActiveIndex(0);
      } catch (err) {
        console.error("Failed to fetch mention profiles:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timer);
  }, [query, showSuggestions, triggerIdx, activeTrigger]);

  // Sync hashtag suggestions when activeTrigger is "hashtag" and query changes
  useEffect(() => {
    if (activeTrigger === "hashtag") {
      const trimmedQuery = query.trim().toLowerCase();
      let filtered = hashtagsList.filter(tag => 
        tag.toLowerCase().includes(trimmedQuery)
      );

      // If the typed query is new and not in the filtered list, add it to suggestions
      if (trimmedQuery && !filtered.some(tag => tag.toLowerCase() === trimmedQuery)) {
        filtered = [query.trim(), ...filtered];
      }

      setHashtagSuggestions(filtered);
      setActiveIndex(0);
    }
  }, [query, activeTrigger, hashtagsList]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveTrigger(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const selectionEnd = e.target.selectionEnd || 0;
    
    // Call the parent onChange with the new value
    const currentMentions = selectedProfiles
      .filter((p) => {
        const handle = p.username || "";
        return handle && val.includes(`@${handle}`);
      })
      .map((p) => p.userId);
    onChange(val, currentMentions);

    // Look back from cursor to find a trigger
    const textBeforeCursor = val.slice(0, selectionEnd);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    const lastHashIdx = textBeforeCursor.lastIndexOf("#");

    if (lastAtIdx !== -1 && (lastHashIdx === -1 || lastAtIdx > lastHashIdx)) {
      // Check if @ is preceded by space or is at start of line
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : " ";
      const isWordStart = /\s/.test(charBeforeAt);
      
      // Check if there is any space between @ and cursor
      const textBetweenAtAndCursor = textBeforeCursor.slice(lastAtIdx + 1);
      const hasSpace = /\s/.test(textBetweenAtAndCursor);

      if (isWordStart && !hasSpace) {
        setTriggerIdx(lastAtIdx);
        setQuery(textBetweenAtAndCursor);
        setActiveTrigger("mention");
        setShowSuggestions(true);
        return;
      }
    } else if (lastHashIdx !== -1 && (lastAtIdx === -1 || lastHashIdx > lastAtIdx)) {
      // Check if # is preceded by space or is at start of line
      const charBeforeHash = lastHashIdx > 0 ? textBeforeCursor[lastHashIdx - 1] : " ";
      const isWordStart = /\s/.test(charBeforeHash);
      
      // Check if there is any space between # and cursor
      const textBetweenHashAndCursor = textBeforeCursor.slice(lastHashIdx + 1);
      const hasSpace = /\s/.test(textBetweenHashAndCursor);

      if (isWordStart && !hasSpace) {
        setTriggerIdx(lastHashIdx);
        setQuery(textBetweenHashAndCursor);
        setActiveTrigger("hashtag");
        setShowSuggestions(true);
        return;
      }
    }

    setShowSuggestions(false);
    setActiveTrigger(null);
  };

  const handleSelectSuggestion = (profile: PublicProfile) => {
    if (!textareaRef.current) return;

    const val = value;
    const start = triggerIdx;
    const end = textareaRef.current.selectionEnd || 0;

    const before = val.slice(0, start);
    const after = val.slice(end);
    const handle = profile.username || "";
    const mentionText = `@${handle} `;
    const newVal = before + mentionText + after;

    // Track selection
    const nextProfiles = [...selectedProfiles.filter(p => p.userId !== profile.userId), profile];
    setSelectedProfiles(nextProfiles);

    const mentionedUserIds = nextProfiles
      .filter((p) => {
        const h = p.username || "";
        return h && newVal.includes(`@${h}`);
      })
      .map((p) => p.userId);

    onChange(newVal, mentionedUserIds);
    setShowSuggestions(false);
    setActiveTrigger(null);

    // Focus and position cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + mentionText.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleSelectHashtag = (tag: string) => {
    if (!textareaRef.current) return;

    const cleanTag = tag.trim().toLowerCase();
    const isNew = !hashtagsList.some(t => t.toLowerCase() === cleanTag);
    if (isNew && cleanTag) {
      api.post("/hashtags", { name: cleanTag })
        .then((res) => {
          if (res.data && res.data.name) {
            setHashtagsList(prev => {
              if (!prev.some(t => t.toLowerCase() === res.data.name.toLowerCase())) {
                return [...prev, res.data.name];
              }
              return prev;
            });
          }
        })
        .catch((err) => {
          console.error("Failed to save new hashtag:", err);
          setHashtagsList(prev => [...prev, cleanTag]);
        });
    }

    const val = value;
    const start = triggerIdx;
    const end = textareaRef.current.selectionEnd || 0;

    const before = val.slice(0, start);
    const after = val.slice(end);
    const hashtagText = `#${tag} `;
    const newVal = before + hashtagText + after;

    const mentionedUserIds = selectedProfiles
      .filter((p) => {
        const h = p.username || "";
        return h && newVal.includes(`@${h}`);
      })
      .map((p) => p.userId);

    onChange(newVal, mentionedUserIds);
    setShowSuggestions(false);
    setActiveTrigger(null);

    // Focus and position cursor after the hashtag
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + hashtagText.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      const suggestionsLength = activeTrigger === "mention" ? suggestions.length : hashtagSuggestions.length;
      if (suggestionsLength > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % suggestionsLength);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + suggestionsLength) % suggestionsLength);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeTrigger === "mention") {
            handleSelectSuggestion(suggestions[activeIndex]);
          } else {
            handleSelectHashtag(hashtagSuggestions[activeIndex]);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          setActiveTrigger(null);
        }
      }
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 mt-1 w-full sm:w-80 max-h-56 overflow-y-auto bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {activeTrigger === "mention" ? (
            loading && suggestions.length === 0 ? (
              <div className="flex items-center gap-2 justify-center p-3 text-xs text-muted-foreground font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Scanning public node network...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-0.5">
                {suggestions.map((profile, idx) => (
                  <div
                    key={profile.userId}
                    onClick={() => handleSelectSuggestion(profile)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                      idx === activeIndex
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border relative overflow-hidden">
                      {profile.profilePhotoUrl ? (
                        <img src={profile.profilePhotoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(profile.fullName)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase tracking-tight text-foreground truncate">
                        {profile.fullName}{profile.username ? ` (@${profile.username})` : ""}
                      </p>
                      {profile.headline && (
                        <p className="text-[9px] text-muted-foreground truncate font-medium">{profile.headline}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                No matching nodes found
              </div>
            )
          ) : (
            hashtagSuggestions.length > 0 ? (
              <div className="space-y-0.5">
                {hashtagSuggestions.map((tag, idx) => (
                  <div
                    key={tag}
                    onClick={() => handleSelectHashtag(tag)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                      idx === activeIndex
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-indigo-500 font-bold">#</span>
                    <span className="text-foreground">{tag}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                No matching hashtags
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

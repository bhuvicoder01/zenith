"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, Download } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale(s => Math.min(s + 0.25, 3));
      if (e.key === "-") setScale(s => Math.max(s - 0.25, 0.5));
      if (e.key === "0") setScale(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      style={{ cursor: "zoom-out" }}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setScale(s => Math.min(s + 0.25, 3))}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
          title="Open Original"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom level indicator */}
      {scale !== 1 && (
        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[90vh] overflow-auto no-scrollbar flex items-center justify-center">
        {!loaded && (
          <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        )}
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onClick={(e) => {
            e.stopPropagation();
            setScale(s => (s >= 2 ? 1 : s + 0.5));
          }}
          className="transition-transform duration-300 ease-out rounded-2xl shadow-2xl"
          style={{
            transform: `scale(${scale})`,
            cursor: scale >= 2 ? "zoom-out" : "zoom-in",
            maxWidth: "85vw",
            maxHeight: "85vh",
            objectFit: "contain",
            display: loaded ? "block" : "none",
          }}
        />
      </div>

      {/* Caption */}
      {alt && alt !== "GIF" && alt !== "Sticker" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/10 max-w-md truncate">
          {alt}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="absolute bottom-6 right-4 text-[9px] text-white/30 font-mono space-x-3 hidden md:flex">
        <span>ESC close</span>
        <span>+/- zoom</span>
        <span>0 reset</span>
      </div>
    </div>
  );
}

// ---- Inline clickable wrapper for GIF/Sticker/Image thumbnails ----
interface ClickableMediaProps {
  src: string;
  alt: string;
  type: "gif" | "sticker" | "image";
  className?: string;
  containerClassName?: string;
}

export function ClickableMedia({
  src,
  alt,
  type,
  className = "",
  containerClassName = "",
}: ClickableMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const defaultContainerClass =
    type === "sticker"
      ? "max-w-[80px] select-none p-1 mt-1"
      : type === "gif"
      ? "rounded-xl overflow-hidden max-w-[180px] border border-border shadow-sm bg-secondary/10 mt-1"
      : "rounded-xl overflow-hidden max-w-[240px] border border-border shadow-sm bg-secondary/10 mt-1";

  const defaultImgClass =
    type === "sticker"
      ? "w-full h-auto object-contain animate-pulse [animation-duration:3s]"
      : "w-full h-auto object-contain max-h-36";

  return (
    <>
      <div
        className={`${containerClassName || defaultContainerClass} cursor-pointer group/media relative`}
        onClick={() => setLightboxOpen(true)}
        title="Click to expand"
      >
        <img
          src={src}
          alt={alt}
          className={`${className || defaultImgClass} group-hover/media:brightness-90 transition-all`}
        />
        {/* Expand icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/20 rounded-xl">
          <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-full">
            <ZoomIn className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          src={src}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

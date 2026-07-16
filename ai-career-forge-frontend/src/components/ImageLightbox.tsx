"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, Download, ExternalLink, FileText } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  type?: "image" | "pdf";
  onClose: () => void;
}

export function ImageLightbox({ src, alt, type = "image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (type === "image") {
        if (e.key === "+" || e.key === "=") setScale(s => Math.min(s + 0.25, 3));
        if (e.key === "-") setScale(s => Math.max(s - 0.25, 0.5));
        if (e.key === "0") setScale(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, type]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9000] flex flex-col items-center justify-start bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
      style={{ cursor: "zoom-out" }}
    >
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between p-4 bg-black/40 border-b border-white/10 backdrop-blur-sm z-30 shrink-0">
        <div className="text-white text-xs font-bold truncate max-w-[60%] select-none">
          {alt && alt !== "GIF" && alt !== "Sticker" ? alt : (type === "pdf" ? "PDF Document" : "Image Preview")}
        </div>
        <div className="flex items-center gap-3">
          {type === "image" ? (
            <>
              <button
                onClick={() => setScale(s => Math.min(s + 0.25, 3))}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                title="Open Original"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
            </>
          ) : (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
              title="Open/Download PDF"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Document</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors border border-white/15"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto relative z-10">
        {type === "image" ? (
          <>
            {/* Zoom level indicator */}
            {scale !== 1 && (
              <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 z-20">
                {Math.round(scale * 100)}%
              </div>
            )}

            {/* Image Wrapper */}
            <div className="max-w-[90vw] max-h-[80vh] overflow-auto -webkit-overflow-scrolling-touch no-scrollbar flex items-center justify-center">
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
                  maxHeight: "75vh",
                  objectFit: "contain",
                  display: loaded ? "block" : "none",
                }}
              />
            </div>

            {/* Keyboard shortcut hint */}
            <div className="absolute bottom-4 right-4 text-[9px] text-white/30 font-mono space-x-3 hidden md:flex z-20">
              <span>ESC close</span>
              <span>+/- zoom</span>
              <span>0 reset</span>
            </div>
          </>
        ) : (
          /* PDF Full Screen View wrapper */
          <div 
            className="w-full max-w-[95vw] md:max-w-[85vw] h-full max-h-[80vh] rounded-2xl overflow-auto -webkit-overflow-scrolling-touch border border-white/10 shadow-2xl bg-zinc-900 z-10 flex flex-col items-center justify-center p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Desktop View: Render iframe */}
            <div className="hidden md:block w-full h-full">
              <iframe
                src={src + "#view=FitH"}
                className="w-full h-full border-0 bg-zinc-900"
                title="PDF Document"
              />
            </div>

            {/* Mobile View: Render gorgeous mobile preview card */}
            <div className="flex md:hidden flex-col items-center justify-center space-y-6 max-w-sm">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <FileText className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-black text-sm uppercase tracking-wider">
                  {alt || "PDF Document"}
                </h3>
                <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">
                  Touch screen devices require native viewer access to navigate. Click below to view, zoom, and print the document in full resolution.
                </p>
              </div>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                <ExternalLink className="w-4 h-4" /> Open PDF Document
              </a>
            </div>
          </div>
        )}
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

/**
 * ShareMenu — share options for WhatsApp, Twitter, and Copy Link.
 * Simple dropdown-style menu triggered by a button.
 */

import { useState, useRef, useEffect } from "react";
import { Share2, MessageCircle, Link2, Check } from "lucide-react";

interface ShareMenuProps {
  title: string;
  url: string;
  summary?: string;
}

export default function ShareMenu({ title, url, summary }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const shareToWhatsApp = () => {
    const text = `${title}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setOpen(false);
  };

  const shareToTwitter = () => {
    const text = `${title}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      /* Fallback for older browsers */
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Share article"
      >
        <Share2 size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in-up">
          <button
            onClick={shareToWhatsApp}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary transition-colors text-left"
          >
            <MessageCircle size={16} className="text-green-600 flex-shrink-0" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={shareToTwitter}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-foreground flex-shrink-0">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Twitter / X</span>
          </button>

          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-secondary transition-colors text-left border-t border-border"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-green-600 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

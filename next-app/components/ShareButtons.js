"use client";

import { useState } from "react";
import { Link2, Check, MessageCircle } from "lucide-react";

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function ShareButtons({ title, slug, canonicalUrl }) {
  const [copied, setCopied] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  const url = canonicalUrl || `${normalizedBase}/news/${slug}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttons = [
    {
      label: "WhatsApp",
      icon: <MessageCircle size={15} />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      className: "hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30",
    },
    {
      label: "X",
      icon: <XIcon size={14} />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      className: "hover:bg-foreground/5 hover:border-foreground/20",
    },
    {
      label: "Facebook",
      icon: <FacebookIcon size={14} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: "hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-overline text-muted-foreground mr-1">Share</span>
      {buttons.map((btn) => (
        <a
          key={btn.label}
          href={btn.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${btn.label}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-caption text-muted-foreground transition-all duration-200 ${btn.className}`}
        >
          {btn.icon}
          <span className="hidden sm:inline">{btn.label}</span>
        </a>
      ))}
      <button
        onClick={copyLink}
        title="Copy link"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-caption transition-all duration-200 ${
          copied
            ? "bg-green-500/10 text-green-600 border-green-500/30"
            : "text-muted-foreground hover:bg-secondary hover:border-border"
        }`}
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
  );
}

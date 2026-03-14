/**
 * AdBanner — placeholder component for Google AdSense ad units.
 * Replace data-ad-slot values with your actual AdSense slot IDs.
 */

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

export default function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  return (
    <div className={`ad-container my-6 flex items-center justify-center min-h-[90px] bg-secondary/30 rounded-lg border border-dashed border-border ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <noscript>
        <span className="text-xs text-muted-foreground">Advertisement</span>
      </noscript>
    </div>
  );
}

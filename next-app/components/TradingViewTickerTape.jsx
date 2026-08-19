"use client";

import { useEffect, useRef } from 'react';

const SYMBOLS = [
  { proName: 'NSE:NIFTY', title: 'NIFTY 50' },
  { proName: 'NSE:BANKNIFTY', title: 'NIFTY BANK' },
  { proName: 'BSE:SENSEX', title: 'SENSEX' },
  { proName: 'FX_IDC:USDINR', title: 'USD/INR' },
  { proName: 'MCX:GOLD1!', title: 'GOLD' },
];

export default function TradingViewTickerTape() {
  const widgetRef = useRef(null);

  useEffect(() => {
    const container = widgetRef.current;
    if (!container) return undefined;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbols: SYMBOLS,
      showSymbolLogo: true,
      colorTheme: 'light',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <section className="p-4 border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <div>
          <h3 className="font-bold text-lg">Market Pulse</h3>
          <p className="text-xs text-muted-foreground">Live market indices via TradingView</p>
        </div>
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Live</span>
      </div>

      <div className="tradingview-widget-container min-h-[72px]" ref={widgetRef}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </section>
  );
}

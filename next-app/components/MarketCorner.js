function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function IndicatorRow({ label, last, change, percent }) {
  const positive = typeof change === 'number' && change >= 0;
  const changeText = typeof change === 'number' ? `${positive ? '+' : ''}${change.toFixed(2)}` : '—';
  const percentText = typeof percent === 'number' ? `${positive ? '+' : ''}${percent.toFixed(2)}%` : '—';

  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0 gap-3">
      <div className="min-w-0">
        <p className="text-base font-semibold truncate">{label}</p>
        <p className="text-sm text-muted-foreground">{formatNumber(last)}</p>
      </div>
      <p className={`text-sm font-semibold ${positive ? 'text-primary' : 'text-destructive'}`}>
        {changeText} ({percentText})
      </p>
    </div>
  );
}

export default function MarketCorner({ marketData = [] }) {
  return (
    <section className="p-4 border border-border bg-card">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <h3 className="font-bold text-lg">Stock Market</h3>
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Live</span>
      </div>

      <div>
        {marketData.length > 0 ? (
          marketData.map((item) => (
            <IndicatorRow
              key={item.symbol}
              label={item.label}
              last={item.last}
              change={item.change}
              percent={item.percentChange}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Market data currently unavailable.</p>
        )}
      </div>
    </section>
  );
}

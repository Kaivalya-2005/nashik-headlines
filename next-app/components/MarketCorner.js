function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function getDirection(change) {
  if (typeof change !== 'number' || Number.isNaN(change)) return 'flat';
  return change >= 0 ? 'up' : 'down';
}

function ChangePill({ change, percent }) {
  const direction = getDirection(change);
  const positive = direction === 'up';
  const changeText = typeof change === 'number' ? `${positive ? '+' : ''}${change.toFixed(2)}` : '—';
  const percentText = typeof percent === 'number' ? `${positive ? '+' : ''}${percent.toFixed(2)}%` : '—';
  const tone =
    direction === 'up'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900'
      : direction === 'down'
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/35 dark:text-rose-300 dark:border-rose-900'
        : 'bg-muted text-muted-foreground border-border';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <span>{changeText}</span>
      <span>{percentText}</span>
    </div>
  );
}

function IndicatorCard({ label, last, change, percent }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{formatNumber(last)}</p>
        </div>
        <ChangePill change={change} percent={percent} />
      </div>
    </div>
  );
}

export default function MarketCorner({ marketData = [] }) {
  const visibleData = marketData.slice(0, 12);

  return (
    <section className="p-4 border border-border bg-card">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <div>
          <h3 className="font-bold text-lg">Market Pulse</h3>
        </div>
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Live</span>
      </div>

      <div>
        {visibleData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
            {visibleData.map((item) => (
              <IndicatorCard
                key={item.symbol}
                label={item.label}
                last={item.last}
                change={item.change}
                percent={item.percentChange}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">बाजार माहिती सध्या उपलब्ध नाही.</p>
        )}
      </div>
    </section>
  );
}

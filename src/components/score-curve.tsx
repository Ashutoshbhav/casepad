// Inline SVG line chart for score-over-time. No external deps. Renders the
// last N completed sessions as a sparkline with axis labels.

interface Point { date: string; score: number }

export function ScoreCurve({ points, height = 120 }: { points: Point[]; height?: number }) {
  if (points.length < 2) {
    return (
      <div className="rounded border border-zinc-800 p-4 text-xs text-zinc-500">
        Complete at least 2 cases to see your trajectory.
      </div>
    );
  }

  const W = 600;
  const H = height;
  const PAD_L = 32, PAD_R = 16, PAD_T = 12, PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xs = points.map((_, i) => PAD_L + (i * innerW) / Math.max(1, points.length - 1));
  const ys = points.map((p) => PAD_T + innerH - ((p.score / 100) * innerH));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');

  // Trend: linear fit
  const n = points.length;
  const sumX = points.reduce((s, _, i) => s + i, 0);
  const sumY = points.reduce((s, p) => s + p.score, 0);
  const sumXY = points.reduce((s, p, i) => s + i * p.score, 0);
  const sumX2 = points.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const trendY0 = PAD_T + innerH - ((intercept / 100) * innerH);
  const trendY1 = PAD_T + innerH - (((intercept + slope * (n - 1)) / 100) * innerH);

  const trendDirection = slope > 1 ? 'up' : slope < -1 ? 'down' : 'flat';
  const trendColor = trendDirection === 'up' ? 'emerald' : trendDirection === 'down' ? 'rose' : 'zinc';

  return (
    <div className="rounded border border-zinc-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-300">NSM: score curve</h3>
        <span className={`text-xs ${
          trendDirection === 'up' ? 'text-emerald-300' :
          trendDirection === 'down' ? 'text-rose-300' : 'text-zinc-400'
        }`}>
          {trendDirection === 'up' ? '↗' : trendDirection === 'down' ? '↘' : '→'}{' '}
          {slope >= 0 ? '+' : ''}{slope.toFixed(1)} pts/case trend
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD_T + innerH - ((v / 100) * innerH);
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray={v === 50 ? '0' : '2'} />
              <text x={PAD_L - 6} y={y + 3} fontSize="9" fill="#71717a" textAnchor="end">{v}</text>
            </g>
          );
        })}
        {/* Trend line */}
        <line x1={PAD_L} x2={PAD_L + innerW} y1={trendY0} y2={trendY1} stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
        {/* Score line */}
        <path d={path} stroke={trendColor === 'emerald' ? '#34d399' : trendColor === 'rose' ? '#fb7185' : '#a1a1aa'} strokeWidth="2" fill="none" />
        {/* Points */}
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="3" fill={trendColor === 'emerald' ? '#34d399' : trendColor === 'rose' ? '#fb7185' : '#a1a1aa'} />
        ))}
        {/* X-axis labels — first + last only to avoid clutter */}
        <text x={xs[0]} y={H - 6} fontSize="9" fill="#71717a" textAnchor="start">{points[0].date.slice(0, 10)}</text>
        <text x={xs[xs.length - 1]} y={H - 6} fontSize="9" fill="#71717a" textAnchor="end">{points[points.length - 1].date.slice(0, 10)}</text>
      </svg>
      <div className="text-xs text-zinc-500 mt-2">
        {points.length} sessions · latest score: <span className="text-zinc-200">{points[points.length - 1].score}</span>
      </div>
    </div>
  );
}

import type { Stats } from '../game/types';
import { TRAITS } from '../game/types';
import { energyCap } from '../game/yields';
import { TRAIT_ICON, TRAIT_SHORT } from './theme';

/** Live stats. During resolution these tick as the now-line sweeps. */
export function StatBar({ stats }: { stats: Stats }) {
  const cap = energyCap(stats);
  const pct = Math.max(0, Math.min(100, (stats.energy / cap) * 100));
  const tone = stats.energy <= 0 ? 'bg-red-500' : pct < 25 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/5 px-3 py-1.5">
      <div className="flex items-center gap-1.5" title="Energy — reset each morning by last night's sleep">
        <span>⚡</span>
        <div className="h-3 w-28 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
          <div className={`h-full ${tone} transition-[width] duration-75`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-12 text-xs font-black tabular-nums">
          {Math.round(stats.energy)}
          <span className="text-white/35">/{cap}</span>
        </span>
      </div>
      <div
        className={`text-sm font-black tabular-nums ${stats.money < 0 ? 'text-red-400' : 'text-yellow-200'}`}
        title="Money"
      >
        💰 {stats.money}
      </div>
      {TRAITS.map((t) => (
        <div key={t} className="flex items-baseline gap-1" title={t}>
          <span>{TRAIT_ICON[t]}</span>
          <span className="text-sm font-black tabular-nums">{stats[t].toFixed(1)}</span>
          <span className="text-[10px] font-bold text-white/35">{TRAIT_SHORT[t]}</span>
        </div>
      ))}
    </div>
  );
}

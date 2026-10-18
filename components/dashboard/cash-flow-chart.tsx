'use client';

import { useEffect, useRef, useState } from 'react';

export type CashDay = { date: string; label: string; cashIn: number; cashOut: number };

// สีผ่านการตรวจตาบอดสีและความต่างกับพื้นเข้มแล้ว
export const CASH_IN = '#4A8CF0';
export const CASH_OUT = '#EE4B6A';

const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);
const short = (n: number) => (n >= 1000 ? `${fmt(Math.round(n / 100) / 10)}k` : fmt(n));

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

export function CashFlowChart({ days }: { days: CashDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // วาดตามความกว้างจริงของกล่อง ตัวหนังสือบนมือถือจึงไม่เล็กลง
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = niceMax(Math.max(...days.flatMap((d) => [d.cashIn, d.cashOut])));
  const H = 220, L = 40, B = 24, T = 8;
  const plotW = W - L, plotH = H - B - T;
  const col = plotW / days.length;
  const bar = Math.max(4, Math.min(12, (col - 6) / 2));
  const every = Math.ceil(56 / col);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const h = hover !== null ? days[hover] : null;

  return (
    <div ref={box} className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs text-white/70">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: CASH_IN }} /> รับเข้า</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: CASH_OUT }} /> จ่ายออก</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full" role="img" aria-label="เงินเข้าออก 14 วันล่าสุด" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="white" strokeOpacity={t === 0 ? 0.25 : 0.08} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="white" fillOpacity={0.5}>{short(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = L + col * i + col / 2;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={L + col * i} y={T} width={col} height={plotH} fill="white" fillOpacity={hover === i ? 0.06 : 0} />
              {[{ v: d.cashIn, c: CASH_IN, x: cx - bar - 1 }, { v: d.cashOut, c: CASH_OUT, x: cx + 1 }].map((b) => {
                const top = y(b.v), hgt = Math.max(0, T + plotH - top);
                if (!hgt) return null;
                const r = Math.min(4, hgt, bar / 2);
                return (
                  <path
                    key={b.c}
                    d={`M${b.x},${T + plotH} V${top + r} q0,-${r} ${r},-${r} h${bar - 2 * r} q${r},0 ${r},${r} V${T + plotH} Z`}
                    fill={b.c}
                  />
                );
              })}
              {(days.length - 1 - i) % every === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="white" fillOpacity={0.5}>{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-40 -translate-x-1/2 rounded-lg border border-white/15 bg-[#0B1533]/95 p-2.5 text-xs shadow-xl"
          style={{ left: `${((L + col * hover + col / 2) / W) * 100}%` }}
        >
          <div className="mb-1 font-medium text-white">{h.label}</div>
          <div className="flex justify-between text-white/70"><span>รับเข้า</span><span className="tabular-nums text-white">฿{fmt(h.cashIn)}</span></div>
          <div className="flex justify-between text-white/70"><span>จ่ายออก</span><span className="tabular-nums text-white">฿{fmt(h.cashOut)}</span></div>
        </div>
      )}
      <table className="sr-only">
        <caption>เงินเข้าออกรายวัน</caption>
        <thead><tr><th>วันที่</th><th>รับเข้า</th><th>จ่ายออก</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.date}><td>{d.label}</td><td>{d.cashIn}</td><td>{d.cashOut}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

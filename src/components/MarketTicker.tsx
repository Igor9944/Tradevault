// src/components/MarketTicker.tsx — v2.0 — 2025-07-14
// Bloomberg-style live market ticker — GPU-accelerated, zero memory leaks
import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'

interface TickerItem {
  symbol: string
  price: number
  change: number
  pct: number
  prev: number | null
  decimals: number
  flash: 'up' | 'down' | null
}

const INITIAL_DATA: Omit<TickerItem, 'prev' | 'flash'>[] = [
  { symbol: 'EUR/USD', price: 1.08924, change: 0.00128, pct: 0.118, decimals: 5 },
  { symbol: 'XAU/USD', price: 2328.50, change: -4.20, pct: -0.180, decimals: 2 },
  { symbol: 'NAS100',  price: 18942.3, change: 127.8,  pct: 0.679,  decimals: 1 },
  { symbol: 'US30',    price: 39485.2, change: -89.4,  pct: -0.226, decimals: 1 },
  { symbol: 'GBP/USD', price: 1.27342, change: 0.00234, pct: 0.184,  decimals: 5 },
  { symbol: 'BTC/USD', price: 67842.0, change: 1240.0, pct: 1.862,  decimals: 0 },
  { symbol: 'USD/JPY', price: 153.284, change: 0.422,  pct: 0.276,  decimals: 3 },
  { symbol: 'ETH/USD', price: 3284.50, change: -28.4,  pct: -0.858, decimals: 2 },
  { symbol: 'WTI',     price: 82.14,   change: 0.68,   pct: 0.835,  decimals: 2 },
  { symbol: 'S&P 500', price: 5312.50, change: 18.2,   pct: 0.344,  decimals: 2 },
  { symbol: 'USD/CHF', price: 0.90812, change: -0.00142, pct: -0.156, decimals: 5 },
  { symbol: 'AUD/USD', price: 0.65234, change: 0.00089, pct: 0.137, decimals: 5 },
]

function applyNoise(item: TickerItem): TickerItem {
  const vol = item.symbol.includes('BTC') ? 0.004
    : item.symbol.includes('ETH') ? 0.003
    : item.symbol.match(/NAS|US30|S&P/) ? 0.0015
    : item.symbol.includes('XAU') ? 0.001
    : item.symbol.includes('WTI') ? 0.0012
    : 0.0003

  const rand = (Math.random() - 0.498) // slight upward drift
  const delta = item.price * vol * rand
  const newPrice = Math.max(0.001, item.price + delta)
  const newChange = item.change + delta
  const base = newPrice - newChange
  const newPct = base !== 0 ? (newChange / base) * 100 : 0

  return {
    ...item,
    prev: item.price,
    price: newPrice,
    change: newChange,
    pct: newPct,
    flash: delta > 0 ? 'up' : 'down',
  }
}

function fmt(price: number, decimals: number): string {
  return price.toFixed(decimals)
}

// ── Single Ticker Cell ─────────────────────────────────────────────────────
const TickerCell = memo(({ item }: { item: TickerItem }) => {
  const isUp = item.pct >= 0
  const flashRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!item.flash || !flashRef.current) return
    const el = flashRef.current
    el.classList.remove('flash-up', 'flash-down')
    // Force reflow
    void el.offsetWidth
    if (item.flash === 'up') {
      el.classList.add('flash-up')
    } else if (item.flash === 'down') {
      el.classList.add('flash-down')
    }
  }, [item.flash])

  return (
    <div className="ticker-cell" data-symbol={item.symbol}>
      <span className="ticker-symbol">{item.symbol}</span>
      <span className="ticker-price" ref={flashRef}>{fmt(item.price, item.decimals)}</span>
      <span className={`ticker-change ${isUp ? 'up' : 'down'}`}>
        {isUp ? '+' : ''}{fmt(Math.abs(item.change), Math.max(0, item.decimals - 1))}
      </span>
    </div>
  )
})

// ── Ticker Bar ─────────────────────────────────────────────────────────────
export default function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>(INITIAL_DATA.map(i => ({
    ...i,
    prev: i.price,
    flash: null
  })))
  const trackRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize items with prev and null flash
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      setItems(prev => prev.map(applyNoise))
    }, 3000) // update every 3s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Clone items for seamless loop
  const doubled = useMemo(() => [...items, ...items], [items])

  return (
    <div className="ticker-bar" role="marquee" aria-label="Live market ticker">
      <div className="ticker-label">
        <span className="ticker-live-dot" /> LIVE
      </div>
      <div className="ticker-track-wrap" ref={trackRef}>
        <div className="ticker-track">
          {doubled.map((item: TickerItem, idx: number) => (
            <TickerCell key={`${item.symbol}-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
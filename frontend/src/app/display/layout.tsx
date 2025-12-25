'use client';

import { Logo } from '@/components/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEffects } from '@/contexts/effects-context';
import { StockMarquee, HeadlinesMarquee } from '@/components/marquee';

// View configuration with titles for header and status bar
const VIEW_CONFIG: Record<string, { title: string; label: string }> = {
  'ticker': { title: 'BÖRSENTICKER', label: 'TICKER' },
  'market-map': { title: 'MARKT-KARTE', label: 'MARKT' },
  'terminal': { title: 'SMG TERMINAL', label: 'TERMINAL' },
  'leaderboard': { title: 'RANGLISTE', label: 'RANGLISTE' },
  'stock-chart': { title: 'AKTIENCHART', label: 'CHART' },
  'performance-race': { title: 'PERFORMANCE RACE', label: 'RENNEN' },
  'ipo-spotlight': { title: 'IPO SPOTLIGHT', label: 'IPO' },
  'sector-sunburst': { title: 'SEKTOR SUNBURST', label: 'SEKTOREN' },
};

/**
 * The main layout for all display screens.
 * It includes the header with the app title and the navigation tabs
 * to switch between different market views (Ticker, Market Map, Terminal, Leaderboard).
 */
export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setSettingsPanelOpen, stockMarqueeEnabled, headlinesMarqueeEnabled } = useEffects();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Determine the active tab from the URL path to highlight the correct tab.
  const activeTab = pathname.split('/').pop() || 'ticker';
  const viewConfig = VIEW_CONFIG[activeTab] || { title: activeTab.toUpperCase(), label: activeTab.toUpperCase() };

  const navItems = [
    { id: 'ticker', label: 'TICKER', href: '/display/ticker', fKey: 'F1' },
    { id: 'market-map', label: 'MARKT', href: '/display/market-map', fKey: 'F2' },
    { id: 'terminal', label: 'TERMINAL', href: '/display/terminal', fKey: 'F3' },
    { id: 'leaderboard', label: 'RANGLISTE', href: '/display/leaderboard', fKey: 'F4' },
    { id: 'stock-chart', label: 'CHART', href: '/display/stock-chart', fKey: 'F5' },
    { id: 'performance-race', label: 'RENNEN', href: '/display/performance-race', fKey: 'F6' },
    { id: 'ipo-spotlight', label: 'IPO', href: '/display/ipo-spotlight', fKey: 'F7' },
    { id: 'sector-sunburst', label: 'SEKTOREN', href: '/display/sector-sunburst', fKey: 'F8' },
  ];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // F-key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setSettingsPanelOpen(true);
        return;
      }
      const fKeyMatch = e.key.match(/^F([1-8])$/);
      if (fKeyMatch) {
        e.preventDefault();
        const index = parseInt(fKeyMatch[1]) - 1;
        if (navItems[index]) {
          router.push(navItems[index].href);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, setSettingsPanelOpen]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Simulated market status (open during weekdays 9-17:30)
  const isMarketOpen = () => {
    const day = currentTime.getDay();
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeValue = hour * 60 + minute;
    return day >= 1 && day <= 5 && timeValue >= 540 && timeValue <= 1050;
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-foreground">
      {/* Header - simplified, just logo */}
      <header className="flex items-center justify-between border-b border-border px-4 py-1">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary tracking-wide">
            SMG
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className={isMarketOpen() ? 'text-green-500' : 'text-red-500'}>
            ● {isMarketOpen() ? 'OFFEN' : 'GESCHLOSSEN'}
          </span>
          <span>{formatDate(currentTime)}</span>
          <span className="text-primary font-bold">{formatTime(currentTime)}</span>
        </div>
      </header>

      {/* Stock Marquee - optional */}
      {stockMarqueeEnabled && <StockMarquee />}

      {/* View Title Bar */}
      <div className="flex items-center justify-between border-b border-border bg-black px-4 py-1">
        <h1 className="text-lg font-bold text-primary">
          ┌─ {viewConfig.title} ─┐
        </h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Headlines Marquee - optional */}
      {headlinesMarqueeEnabled && <HeadlinesMarquee />}

      {/* Status Bar */}
      <footer className="border-t border-border bg-black px-4 py-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>┌─ SMG BÖRSE ─┐</span>
          <span>LIVE │ {viewConfig.title}</span>
          <span>┌─ {formatTime(currentTime)} ─┐</span>
        </div>
      </footer>

      {/* F-Key Legend - now clickable */}
      <div className="border-t border-border bg-black px-2 py-0.5 text-xs">
        <div className="flex items-center justify-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex items-center border border-border px-1.5 py-0.5 transition-colors hover:bg-primary/20 ${
                activeTab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <span className="font-bold">{item.fKey}</span>
              <span className="mx-0.5">:</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setSettingsPanelOpen(true)}
            className="flex items-center border border-border text-muted-foreground px-1.5 py-0.5 ml-2 transition-colors hover:bg-primary/20"
          >
            <span className="font-bold">F12</span>
            <span className="mx-0.5">:</span>
            <span>EINST.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

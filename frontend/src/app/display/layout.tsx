'use client';

import { Logo } from '@/components/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEffects } from '@/contexts/effects-context';
import { useMarket } from '@/contexts/market-context';
import { StockMarquee, HeadlinesMarquee } from '@/components/marquee';
import { MarketStatusBadge } from '@/components/display';
import { UI_MESSAGES } from '@/constants/messages';
import { VIEW_ROUTES } from '@/hooks/use-hotkeys';

// View configuration with titles for header and status bar
const VIEW_CONFIG: Record<string, { title: string; label: string }> = {
  'market-map': { title: 'MARKT-KARTE', label: 'MARKT' },
  'terminal': { title: 'SMG TERMINAL', label: 'TERMINAL' },
  'leaderboard': { title: 'RANGLISTE', label: 'RANGLISTE' },
  'stock-chart': { title: 'AKTIENCHART', label: 'CHART' },
  'performance-race': { title: 'PERFORMANCE RACE', label: 'RENNEN' },
  'ipo-spotlight': { title: 'IPO SPOTLIGHT', label: 'IPO' },
  'sector-sunburst': { title: 'SEKTOR SUNBURST', label: 'SEKTOREN' },
  'bloomberg': { title: 'BLOOMBERG', label: 'BLOOMBERG' },
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
  const { setSettingsPanelOpen, stockMarqueeEnabled, headlinesMarqueeEnabled, stockMarqueePosition, headlinesMarqueePosition, marqueeScrollSpeed, kioskMode, beatState } = useEffects();
  const { marketState } = useMarket();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Determine the active tab from the URL path to highlight the correct tab.
  const activeTab = pathname.split('/').pop() || 'bloomberg';
  const viewConfig = VIEW_CONFIG[activeTab] || { title: activeTab.toUpperCase(), label: activeTab.toUpperCase() };

  // Build navItems from VIEW_ROUTES to ensure consistency
  const navItems = VIEW_ROUTES.map((route) => {
    const id = route.path.split('/').pop() || '';
    const config = VIEW_CONFIG[id];
    return {
      id,
      label: config?.label || route.label.toUpperCase(),
      href: route.path,
      fKey: route.key,
    };
  });

  // Update clock every second (set initial time on mount to avoid hydration mismatch)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Render marquees based on position settings
  const renderTopMarquees = () => {
    const topMarquees = [];
    if (stockMarqueeEnabled && stockMarqueePosition === 'top') {
      topMarquees.push(<StockMarquee key="stock-top" speed={marqueeScrollSpeed} />);
    }
    if (headlinesMarqueeEnabled && headlinesMarqueePosition === 'top') {
      topMarquees.push(<HeadlinesMarquee key="headlines-top" speed={marqueeScrollSpeed} />);
    }
    return topMarquees;
  };

  const renderBottomMarquees = () => {
    const bottomMarquees = [];
    if (stockMarqueeEnabled && stockMarqueePosition === 'bottom') {
      bottomMarquees.push(<StockMarquee key="stock-bottom" speed={marqueeScrollSpeed} />);
    }
    if (headlinesMarqueeEnabled && headlinesMarqueePosition === 'bottom') {
      bottomMarquees.push(<HeadlinesMarquee key="headlines-bottom" speed={marqueeScrollSpeed} />);
    }
    return bottomMarquees;
  };

  return (
    <div className={`flex h-screen w-screen flex-col bg-black text-foreground ${kioskMode ? 'kiosk-mode' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-headline font-bold tracking-tight">
            Schön. <span className="text-primary">Macht.</span> Geld.
          </span>
        </Link>
        <div className="flex items-center gap-4 text-base text-muted-foreground">
          <MarketStatusBadge isOpen={marketState.isOpen} />
          {beatState.status !== 'idle' && (
            <span className={`flex items-center gap-2 px-2 py-0.5 border ${
              beatState.status === 'synced'
                ? 'border-accent text-accent'
                : beatState.status === 'error'
                ? 'border-red-500 text-red-500'
                : beatState.status === 'listening'
                ? 'border-primary text-primary'
                : 'border-border'
            }`}>
              <span className="text-xs uppercase tracking-wide">BPM</span>
              {beatState.status === 'requesting' && (
                <span className="text-xs">...</span>
              )}
              {beatState.status === 'listening' && (
                <span className="text-xs">SYNC...</span>
              )}
              {beatState.status === 'synced' && (
                <span className="text-lg font-bold font-mono tabular-nums">
                  {beatState.bpm}
                </span>
              )}
              {beatState.status === 'error' && (
                <span className="text-xs">ERR</span>
              )}
            </span>
          )}
          <span>{currentTime ? formatDate(currentTime) : '--.--.----'}</span>
          <span className="text-primary font-bold">{currentTime ? formatTime(currentTime) : '--:--:--'}</span>
        </div>
      </header>

      {/* Top Marquees */}
      {renderTopMarquees()}

      {/* View Title Bar */}
      <div className="flex items-center justify-between border-b border-border bg-black px-4 py-1.5">
        <h1 className="text-xl font-bold text-primary">
          ┌─ {viewConfig.title} ─┐
        </h1>
      </div>

      {/* Main Content */}
      <main className="relative flex-1 overflow-hidden">{children}</main>

      {/* Bottom Marquees */}
      {renderBottomMarquees()}

      {/* Status Bar */}
      <footer className="border-t border-border bg-black px-4 py-1.5 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>┌─ {UI_MESSAGES.exchange} ─┐</span>
          <span>{UI_MESSAGES.live} │ {viewConfig.title}</span>
          <span>┌─ {currentTime ? formatTime(currentTime) : '--:--:--'} ─┐</span>
        </div>
      </footer>

      {/* F-Key Legend - now clickable */}
      <div className="border-t border-border bg-black px-2 py-1 text-sm">
        <div className="flex items-center justify-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex items-center border border-border px-2 py-0.5 transition-colors hover:bg-primary/20 ${
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
            className="flex items-center border border-border text-muted-foreground px-2 py-0.5 ml-2 transition-colors hover:bg-primary/20"
          >
            <span className="font-bold">F12</span>
            <span className="mx-0.5">:</span>
            <span>{UI_MESSAGES.settings}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

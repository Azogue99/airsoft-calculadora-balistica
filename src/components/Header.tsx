import React from 'react';
import { Crosshair, Cpu, Activity } from 'lucide-react';

export type AppTab = 'ballistics' | 'volumetric';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'ballistics',
    label: 'Trayectoria',
    icon: <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
  },
  {
    id: 'volumetric',
    label: 'Volumétrico',
    icon: <Cpu className="w-4 h-4 shrink-0" aria-hidden="true" />
  }
];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === activeTab);
    const next = TABS[(i + dir + TABS.length) % TABS.length];
    onTabChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-14 sm:h-16">
          {/* Marca */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-[9px] bg-surface-2 border border-line-2
                         flex items-center justify-center text-accent shrink-0"
            >
              <Crosshair className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-ink truncate">
                Balística Airsoft
              </h1>
              <p className="hidden sm:block text-[11px] text-ink-3 truncate leading-tight">
                Trayectoria 6&nbsp;mm y optimizador volumétrico
              </p>
            </div>
          </div>

          {/* Pestañas: subrayado en vez de relleno */}
          <nav
            role="tablist"
            aria-label="Secciones de la calculadora"
            onKeyDown={handleKeyDown}
            className="flex items-center gap-5 sm:gap-6 h-full shrink-0"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  className="tab"
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

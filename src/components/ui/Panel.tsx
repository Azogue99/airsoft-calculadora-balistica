import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div';
  ariaLabelledBy?: string;
}

/** Tarjeta base: un único estilo de superficie para toda la app. */
export const Panel: React.FC<PanelProps> = ({
  children,
  className = '',
  as: Tag = 'section',
  ariaLabelledBy
}) => (
  <Tag
    aria-labelledby={ariaLabelledBy}
    className={`bg-slate-900/80 border border-slate-800 rounded-2xl
                shadow-lg shadow-slate-950/40 ${className}`}
  >
    {children}
  </Tag>
);

interface PanelHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  id?: string;
  /** Controles alineados a la derecha (toggles, tabs...). */
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon,
  title,
  subtitle,
  id,
  actions,
  className = ''
}) => (
  <div
    className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3
                border-b border-slate-800 pb-3 ${className}`}
  >
    <div className="min-w-0">
      <h2
        id={id}
        className="text-sm font-bold text-white uppercase tracking-wide font-mono flex items-center gap-2"
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
      </h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

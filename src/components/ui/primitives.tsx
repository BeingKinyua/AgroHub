'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  Leaf,
  Lock,
  Package,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  X,
  XCircle,
} from 'lucide-react';

export const DROPDOWN_MOTION = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
};

export function Card({
  children,
  className = '',
  padding = 'p-5 sm:p-6',
  variant = 'base',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  variant?: 'base' | 'raised' | 'floating';
  interactive?: boolean;
}) {
  const elevationStyles = {
    base: 'border border-[var(--border-subtle)]',
    raised:
      'border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]',
    floating:
      'border border-[var(--border-subtle)] shadow-[var(--shadow-md)]',
  };

  return (
    <div
      data-gsap-reveal
      className={`rounded-[18px] bg-[var(--bg-card)] ${elevationStyles[variant]} ${padding} transition-all duration-150 ${
        interactive
          ? 'hover:border-[#4EB462]/45 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card variant="raised" className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

export function KPI({
  label,
  value,
  sublabel,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sublabel: string;
  delta?: string;
  tone?: 'positive' | 'warning' | 'danger' | 'neutral';
}) {
  const toneStyles = {
    positive: 'text-[#1F6A37] dark:text-[#4EB462]',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-red-700 dark:text-red-400',
    neutral: 'text-[var(--text-secondary)]',
  };

  return (
    <Card padding="p-5" variant="raised">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        {delta && (
          <span
            className={`text-xs font-medium tabular-nums ${toneStyles[tone]}`}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="font-heading text-2xl sm:text-[26px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums mt-2">
        {value}
      </div>
      <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
        <span>{sublabel}</span>
      </div>
    </Card>
  );
}

export interface ActionableMetric {
  metric: string;
  value: string;
  context: string;
  status?: 'critical' | 'warning' | 'healthy' | 'neutral';
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  delta?: string;
}

export function ActionableMetricCard({
  metric,
  value,
  context,
  status = 'neutral',
  description,
  actionLabel,
  actionHref,
  onAction,
  delta,
}: ActionableMetric) {
  const statusConfig = {
    critical: {
      border: 'border-red-500/35 hover:border-red-500/60',
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
      icon: AlertTriangle,
      label: 'Critical Risk',
      btn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      border: 'border-amber-500/35 hover:border-amber-500/60',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      icon: AlertCircle,
      label: 'Attention Needed',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    healthy: {
      border: 'border-[#4EB462]/35 hover:border-[#4EB462]/65',
      badge: 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]',
      icon: CheckCircle2,
      label: 'Optimal',
      btn: 'bg-[#1F6A37] hover:bg-[#12512C] text-white',
    },
    neutral: {
      border: 'border-[var(--border-subtle)] hover:border-[#4EB462]/40',
      badge: 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]',
      icon: Clock,
      label: 'Monitored',
      btn: 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]',
    },
  };

  const current = statusConfig[status];
  const StatusIcon = current.icon;

  return (
    <Card
      padding="p-5"
      variant="raised"
      className={`flex flex-col justify-between transition-all duration-200 ${current.border}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide uppercase">
            {metric}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${current.badge}`}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{current.label}</span>
          </span>
        </div>

        <div className="font-heading text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
          {value}
        </div>

        <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center justify-between gap-2">
          <span className="font-medium text-[var(--text-primary)]">{context}</span>
          {delta && (
            <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] shrink-0">
              {delta}
            </span>
          )}
        </div>

        {description && (
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 line-clamp-1">
            {description}
          </p>
        )}
      </div>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Decision Action
          </span>
          {actionHref ? (
            <Link
              href={actionHref}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${current.btn}`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${current.btn}`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export interface OperationalPulseItem {
  id: string;
  severity: 'critical' | 'warning' | 'healthy';
  title: string;
  detail: string;
  value?: string;
  timestamp: string;
  actionLabel: string;
  actionHref: string;
}

export function OperationalPulse({
  items,
  title = 'Operational Pulse · Critical Decisions Required',
  freshness = 'As of 07:45 EAT · Updated 4m ago',
}: {
  items: OperationalPulseItem[];
  title?: string;
  freshness?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 rounded-[20px] bg-[var(--bg-card)] border-2 border-amber-500/35 dark:border-amber-500/30 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="font-heading text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            {title}
          </h2>
          <span className="text-[11px] font-mono-tabular px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
            {items.length} Action{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
          {freshness}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => {
          const isCritical = item.severity === 'critical';
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                isCritical
                  ? 'bg-red-500/[0.04] border-red-500/25 dark:border-red-500/30'
                  : 'bg-amber-500/[0.04] border-amber-500/25 dark:border-amber-500/30'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        isCritical ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.value && (
                    <span className="font-mono-tabular text-xs font-bold text-[var(--text-primary)] shrink-0">
                      {item.value}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono-tabular">
                  {item.timestamp}
                </span>
                <Link
                  href={item.actionHref}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    isCritical
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface WorkQueueItem {
  id: string;
  title: string;
  subtitle: string;
  tag?: string;
  severity?: 'critical' | 'warning' | 'healthy' | 'neutral';
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  metadata?: string;
}

export function WorkQueue({
  title,
  subtitle,
  badgeCount,
  items,
  emptyMessage = 'No items pending in this queue. Everything is up to date.',
  viewAllHref,
  viewAllLabel = 'View Complete Queue',
}: {
  title: string;
  subtitle?: string;
  badgeCount?: number;
  items: WorkQueueItem[];
  emptyMessage?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
              {typeof badgeCount === 'number' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-tabular font-bold bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]">
                  {badgeCount}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            <CheckCircle2 className="w-5 h-5 mx-auto text-[#1F6A37] dark:text-[#4EB462] mb-1.5 opacity-80" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {items.map((item) => {
              const dotColor =
                item.severity === 'critical'
                  ? 'bg-red-500'
                  : item.severity === 'warning'
                  ? 'bg-amber-500'
                  : item.severity === 'healthy'
                  ? 'bg-[#4EB462]'
                  : 'bg-slate-400';

              return (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-canvas)]/50 px-1 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                        {item.title}
                      </span>
                      {item.tag && (
                        <span className="text-[10px] font-mono-tabular px-1.5 py-0.2 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                      <span className="truncate">{item.subtitle}</span>
                      {item.metadata && (
                        <>
                          <span>·</span>
                          <span className="font-mono-tabular shrink-0 text-[10px]">
                            {item.metadata}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.actionHref ? (
                      <Link
                        href={item.actionHref}
                        className="h-7 px-3 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] hover:bg-[#1F6A37] hover:text-white dark:hover:bg-[#1F6A37] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.onAction}
                        className="h-7 px-3 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] hover:bg-[#1F6A37] hover:text-white dark:hover:bg-[#1F6A37] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function Avatar({
  fullName,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  fullName: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = (fullName || 'Operator')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeMap = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-xl',
    xl: 'w-16 h-16 text-lg rounded-2xl',
  };

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`object-cover shrink-0 ${sizeMap[size]} ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={fullName}
      className={`bg-[#08190C] dark:bg-[#1F6A37] text-[#4EB462] dark:text-white font-heading font-semibold flex items-center justify-center shrink-0 select-none border border-[#4EB462]/25 ${sizeMap[size]} ${className}`}
    >
      {initials}
    </div>
  );
}

export function Tooltip({
  label,
  side = 'right',
  children,
}: {
  label: string;
  side?: 'right' | 'bottom';
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 transition-opacity duration-150 z-[var(--z-dropdown)] whitespace-nowrap px-2.5 py-1 rounded-full bg-[#08190C] text-[#F4F6F3] border border-white/12 text-[11px] font-medium shadow-md ${
          side === 'right'
            ? 'absolute left-full top-1/2 -translate-y-1/2 ml-2.5'
            : 'absolute top-full left-1/2 -translate-x-1/2 mt-2'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-2"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'font-medium text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight
                className="w-3.5 h-3.5 text-[var(--text-secondary)]/60"
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
  let classes =
    'bg-[#E5EFE6] text-[#12512C] dark:bg-[#122719] dark:text-[#A9BEAE]';

  if (
    normalized.includes('approved') ||
    normalized.includes('delivered') ||
    normalized.includes('paid') ||
    normalized === 'active' ||
    normalized.includes('posted') ||
    normalized.includes('resolved') ||
    normalized.includes('nominal') ||
    normalized.includes('verified')
  ) {
    icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
    classes =
      'bg-[#E5EFE6] text-[#1F6A37] dark:bg-[#1F6A37]/25 dark:text-[#4EB462]';
  } else if (
    normalized.includes('picking') ||
    normalized.includes('packed') ||
    normalized.includes('confirmed') ||
    normalized.includes('loaded') ||
    normalized.includes('issued') ||
    normalized.includes('receiving') ||
    normalized.includes('progress')
  ) {
    icon = <Package className="w-3.5 h-3.5 shrink-0" />;
    classes =
      'bg-emerald-950/5 text-[#12512C] dark:bg-emerald-950/50 dark:text-emerald-300';
  } else if (normalized.includes('dispatched')) {
    icon = <Truck className="w-3.5 h-3.5 shrink-0" />;
    classes =
      'bg-[#1F6A37]/12 text-[#12512C] dark:bg-[#4EB462]/20 dark:text-[#4EB462]';
  } else if (
    normalized.includes('pending') ||
    normalized.includes('expiring') ||
    normalized.includes('partial') ||
    normalized.includes('watch') ||
    normalized.includes('renewal') ||
    normalized.includes('invited') ||
    normalized.includes('fefo') ||
    normalized.includes('hold') ||
    normalized.includes('unverified')
  ) {
    icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
    classes =
      'bg-amber-500/12 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
  } else if (
    normalized.includes('overdue') ||
    normalized.includes('cancelled') ||
    normalized.includes('failed') ||
    normalized.includes('rejected') ||
    normalized.includes('suspended') ||
    normalized.includes('disabled') ||
    normalized.includes('quarantined')
  ) {
    icon = <XCircle className="w-3.5 h-3.5 shrink-0" />;
    classes =
      'bg-red-500/12 text-red-800 dark:bg-red-500/20 dark:text-red-300';
  } else if (normalized.includes('draft') || normalized.includes('planned')) {
    icon = <FileText className="w-3.5 h-3.5 shrink-0" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {icon}
      <span>{status}</span>
    </span>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  breadcrumbs?: { label: string; href?: string }[];
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-gsap-reveal
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-6"
    >
      <div>
        {kicker && (
          <div className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] mb-1">
            {kicker}
          </div>
        )}
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  children,
  activeFilterCount = 0,
  mobileDrawerContent,
}: {
  children: React.ReactNode;
  activeFilterCount?: number;
  mobileDrawerContent?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Card className="mb-6" padding="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">{children}</div>
        {mobileDrawerContent && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="sm:hidden h-9 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
            <span>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && mobileDrawerContent && (
          <div
            className="fixed inset-0 z-[var(--z-drawer)] sm:hidden flex items-end"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div
              className="fixed inset-0 bg-[#08190C]/70 backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full rounded-t-[22px] bg-[var(--bg-card)] border-t border-[var(--border-subtle)] p-5 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <span className="font-heading text-sm font-semibold">
                  Filter Records
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filter drawer"
                  className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {mobileDrawerContent}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full h-10 rounded-full bg-[#1F6A37] text-white text-xs font-medium"
              >
                Apply Filters
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
      <div className="w-11 h-11 rounded-xl bg-[#E5EFE6] dark:bg-[#122719] text-[#1F6A37] dark:text-[#4EB462] flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mt-1">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-[#1F6A37] text-white hover:bg-[#12512C] transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'We couldn’t load this operational view.',
  description = 'Please verify your network connection or permissions and try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-red-500/20 bg-[var(--bg-card)] p-8 text-center">
      <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mt-1">
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-[#1F6A37] text-white hover:bg-[#12512C] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

export function AccessDenied({
  requiredPermission,
  moduleName = 'This Operational Surface',
}: {
  requiredPermission?: string;
  moduleName?: string;
}) {
  return (
    <div className="my-8 max-w-lg mx-auto">
      <Card variant="raised" className="text-center p-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-xs font-semibold tracking-wider text-amber-800 dark:text-amber-300 uppercase">
          Access Restricted
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text-primary)] mt-1">
          {moduleName}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
          Your current operator role does not hold authorization to view or
          modify this module. Agro-Deliveries enforces role-based access control
          across all operational records.
        </p>
        {requiredPermission && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <span>Required authority:</span>
            <code className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
              {requiredPermission}
            </code>
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function PermissionGateBanner({
  requiredPermission,
  moduleName,
}: {
  requiredPermission: string;
  moduleName: string;
}) {
  return (
    <AccessDenied
      requiredPermission={requiredPermission}
      moduleName={moduleName}
    />
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-[#E5EFE6]/70 dark:bg-[#122719] animate-pulse"
        />
      ))}
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[#08190C]/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            {...DROPDOWN_MOTION}
            className="w-full max-w-xl rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--shadow-lg)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-5">
              <div>
                <h2
                  id="modal-title"
                  className="font-heading text-lg font-semibold text-[var(--text-primary)]"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[#E5EFE6] dark:hover:bg-[#122719] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  affectedItem,
  consequence,
  confirmLabel = 'Confirm Action',
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  affectedItem: string;
  consequence: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Please verify this governance action before proceeding."
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1">
          <div className="text-[var(--text-secondary)]">Affected Record:</div>
          <div className="font-semibold text-[var(--text-primary)]">
            {affectedItem}
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {consequence}
        </p>
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`h-10 px-4 rounded-full text-white text-xs font-medium cursor-pointer transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#1F6A37] hover:bg-[#12512C]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'Agro-Deliveries Asset',
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#08190C] via-[#12512C] to-[#1F6A37] text-[#E5EFE6] p-4 text-center ${className}`}
      >
        <Leaf className="w-6 h-6 text-[#4EB462] mb-1.5" />
        <span className="text-xs font-medium">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function FeedbackBanner({
  message,
  type = 'success',
  onDismiss,
}: {
  message: string | null;
  type?: 'success' | 'error';
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div
      className={`mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium border ${
        type === 'success'
          ? 'bg-[#E5EFE6] border-[#4EB462]/40 text-[#12512C] dark:bg-[#142B1B] dark:text-[#4EB462]'
          : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <ShieldAlert className="w-4 h-4 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-full hover:opacity-75 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

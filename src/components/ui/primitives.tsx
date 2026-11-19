'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  Image as ImageIcon,
  Inbox,
  Leaf,
  Lock,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
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
    base: '',
    raised: 'shadow-[var(--shadow-sm)]',
    floating: 'shadow-[var(--shadow-md)]',
  };

  return (
    <div
      className={`ui-surface ${elevationStyles[variant]} ${padding} ${
        interactive
          ? 'cursor-pointer transition-[border-color,box-shadow] hover:border-[var(--brand-accent)] hover:shadow-[var(--shadow-md)]'
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card variant="raised" className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="ui-section-title">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {mounted ? (
        children
      ) : (
        <div className="ui-meta flex h-64 w-full items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2">
            <div className="size-4 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-transparent" />
            <span>Loading visualization...</span>
          </div>
        </div>
      )}
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
  sublabel?: string;
  delta?: string;
  tone?: 'positive' | 'warning' | 'danger' | 'neutral';
}) {
  const toneStyles = {
    positive: 'text-[var(--status-success-fg)]',
    warning: 'text-[var(--status-warning-fg)]',
    danger: 'text-[var(--status-danger-fg)]',
    neutral: 'text-[var(--text-secondary)]',
  };

  return (
    <Card padding="p-5" variant="raised">
      <div className="flex items-center justify-between gap-2">
        <span className="ui-meta font-medium">
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
      <div className="ui-metric mt-2 wrap-break-word">
        {value}
      </div>
      {sublabel && <div className="ui-meta mt-1.5">{sublabel}</div>}
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
      border: 'border-[var(--status-danger-border)]',
      badge: 'ui-tone-danger',
      icon: AlertTriangle,
      label: 'Critical Risk',
      btn: 'ui-button-danger',
    },
    warning: {
      border: 'border-[var(--status-warning-border)]',
      badge: 'ui-tone-warning',
      icon: AlertCircle,
      label: 'Attention Needed',
      btn: 'ui-button-secondary',
    },
    healthy: {
      border: 'border-[var(--status-success-border)]',
      badge: 'ui-tone-success',
      icon: CheckCircle2,
      label: 'Optimal',
      btn: 'ui-button-primary',
    },
    neutral: {
      border: '',
      badge: 'ui-tone-neutral',
      icon: Clock,
      label: 'Monitored',
      btn: 'ui-button-secondary',
    },
  };

  const current = statusConfig[status];
  const StatusIcon = current.icon;

  return (
    <Card
      padding="p-5"
      variant="raised"
      className={`flex flex-col justify-between ${current.border}`}
    >
      <div>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <span className="ui-meta font-semibold">
            {metric}
          </span>
          <span
            className={`ui-badge ${current.badge}`}
          >
            <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{current.label}</span>
          </span>
        </div>

        <div className="ui-metric wrap-break-word">
          {value}
        </div>

        <div className="ui-meta mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-[var(--text-primary)]">{context}</span>
          {delta && (
            <span className="font-mono-tabular">
              {delta}
            </span>
          )}
        </div>

        {description && (
          <p className="ui-meta mt-1.5">
            {description}
          </p>
        )}
      </div>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-4 flex justify-end border-t border-[var(--border-subtle)] pt-3">
          {actionHref ? (
            <Link
              href={actionHref}
              className={`ui-button ui-button-compact ${current.btn}`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className={`ui-button ui-button-compact ${current.btn}`}
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
    <Card padding="p-4 sm:p-5" variant="raised" className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="ui-section-title">
            {title}
          </h2>
          <span className="ui-badge ui-tone-warning font-mono-tabular">
            {items.length} required
          </span>
        </div>
        <span className="ui-meta font-mono-tabular">
          {freshness}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => {
          const tone = item.severity === 'critical' ? 'ui-tone-danger' : item.severity === 'warning' ? 'ui-tone-warning' : 'ui-tone-success';
          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-xl border p-3.5 ${tone}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <span>{item.title}</span>
                  </div>
                  {item.value && (
                    <span className="shrink-0 font-mono-tabular text-xs font-semibold">
                      {item.value}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5">
                <span className="font-mono-tabular text-xs">
                  {item.timestamp}
                </span>
                <Link
                  href={item.actionHref}
                  className="ui-button ui-button-secondary ui-button-compact"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
              <h3 className="ui-section-title">
                {title}
              </h3>
              {typeof badgeCount === 'number' && (
                <span className="ui-badge ui-tone-neutral font-mono-tabular">
                  {badgeCount}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="ui-meta mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="ui-button ui-button-ghost ui-button-compact text-[var(--brand-accent)]"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="mx-auto mb-1.5 size-5 text-[var(--status-success-fg)]" aria-hidden="true" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {items.map((item) => {
              const dotColor =
                item.severity === 'critical'
                  ? 'bg-[var(--status-danger-fg)]'
                  : item.severity === 'warning'
                  ? 'bg-[var(--status-warning-fg)]'
                  : item.severity === 'healthy'
                  ? 'bg-[var(--status-success-fg)]'
                  : 'bg-[var(--text-secondary)]';

              return (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-[var(--bg-canvas)]/50 px-2 rounded-[10px] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <span className={`size-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
                      {item.severity === 'critical' && <span className="sr-only">Critical</span>}
                      {item.severity === 'warning' && <span className="sr-only">Attention needed</span>}
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </span>
                      {item.tag && (
                        <span className="ui-badge ui-tone-neutral font-mono-tabular">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <div className="ui-meta mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="truncate">{item.subtitle}</span>
                      {item.metadata && (
                        <>
                          <span>·</span>
                          <span className="font-mono-tabular">
                            {item.metadata}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    {item.actionHref ? (
                      <Link
                        href={item.actionHref}
                        className="ui-button ui-button-secondary ui-button-compact"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.onAction}
                        className="ui-button ui-button-secondary ui-button-compact"
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
    xl: 'w-14 h-14 text-base rounded-2xl',
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
      className={`ui-tone-success flex shrink-0 select-none items-center justify-center border font-heading font-semibold ${sizeMap[size]} ${className}`}
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
        className={`pointer-events-none z-[var(--z-dropdown)] whitespace-nowrap rounded-lg border border-[var(--nav-border)] bg-[var(--nav-bg)] px-2.5 py-1 text-xs font-medium text-[var(--nav-text)] opacity-0 shadow-md transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${
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

const statusStyles = {
  success: { className: 'ui-tone-success', icon: CheckCircle2 },
  warning: { className: 'ui-tone-warning', icon: AlertTriangle },
  error: { className: 'ui-tone-danger', icon: XCircle },
  info: { className: 'ui-tone-info', icon: Package },
  neutral: { className: 'ui-tone-neutral', icon: Clock },
};

function statusTone(status: string): keyof typeof statusStyles {
  const value = status.trim().toLowerCase();
  if (/overdue|past due|cancell?ed|failed|rejected|suspended|disabled|quarantined|expired|archived|disputed/.test(value)) {
    return 'error';
  }
  if (/pending|expiring|partial|watch|renewal|invited|fefo|hold|under review|unpaid|unverified|not verified|not submitted|not delivered|rescheduled|maintenance/.test(value)) {
    return 'warning';
  }
  if (/approved|delivered|\bpaid\b|^active$|posted|resolved|nominal|verified|arrivals recorded|fully reconciled|completed/.test(value)) {
    return 'success';
  }
  if (/picking|packed|confirmed|loaded|issued|receiving|progress|dispatched|on route|on delivery|in transit/.test(value)) {
    return 'info';
  }
  return 'neutral';
}

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | string;
}) {
  const resolvedTone = tone && Object.hasOwn(statusStyles, tone) ? tone as keyof typeof statusStyles : statusTone(status);
  const { className, icon: Icon } = statusStyles[resolvedTone];

  return (
    <span className={`ui-badge ${className}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
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
      className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 lg:flex-row lg:items-center"
    >
      <div>
        {kicker && (
          <div className="ui-meta mb-1 font-medium">
            {kicker}
          </div>
        )}
        <h1 className="ui-page-title">
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
        <div className="min-w-0 flex-1">{children}</div>
        {mobileDrawerContent && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ui-button ui-button-secondary shrink-0 sm:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
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
              className="fixed inset-0 bg-[var(--dialog-scrim)] backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-[var(--radius-modal)] border-t border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <span className="ui-section-title">
                  Filter Records
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filter drawer"
                  className="ui-button ui-button-ghost ui-button-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {mobileDrawerContent}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="ui-button ui-button-primary w-full"
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

export function RoleLabel({ roleName }: { roleName: string }) {
  return (
    <span className="ui-badge ui-tone-neutral">
      {roleName}
    </span>
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
    <div className="ui-surface border-dashed p-6 text-center sm:p-10">
      <div className="ui-tone-neutral mx-auto mb-3 grid size-11 place-items-center rounded-xl">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="ui-section-title">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-secondary)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="ui-button ui-button-primary mt-4"
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
    <div className="ui-surface border-[var(--status-danger-border)] p-6 text-center sm:p-8">
      <div className="ui-tone-danger mx-auto mb-3 grid size-11 place-items-center rounded-xl">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="ui-section-title">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-secondary)]">
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ui-button ui-button-primary mt-4"
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
        <div className="ui-tone-warning mx-auto mb-4 grid size-12 place-items-center rounded-xl">
          <Lock className="w-6 h-6" />
        </div>
        <div className="ui-meta font-semibold text-[var(--status-warning-fg)]">
          Access Restricted
        </div>
        <h2 className="ui-section-title mt-1">
          {moduleName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Your current operator role does not hold authorization to view or
          modify this module. Agro-Deliveries enforces role-based access control
          across all operational records.
        </p>
        {requiredPermission && (
          <div className="ui-badge ui-tone-neutral mt-4 flex-wrap">
            <span>Required authority:</span>
            <code className="font-mono-tabular font-semibold text-[var(--brand-accent)]">
              {requiredPermission}
            </code>
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="ui-button ui-button-primary"
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
          className="h-10 animate-pulse rounded-lg bg-[var(--bg-subtle)]"
        />
      ))}
    </Card>
  );
}

export function ConfirmDiscardDialog({
  open,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onKeepEditing}
      title="Discard unsaved changes?"
      subtitle="Any changes to this form will be lost."
      size="sm"
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onKeepEditing}
          className="ui-button ui-button-secondary"
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="ui-button ui-button-danger"
        >
          Discard changes
        </button>
      </div>
    </Modal>
  );
}

let openModalCount = 0;
let savedBodyOverflow = '';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  allowBackdropClose = true,
  allowEscapeClose = true,
  hasUnsavedChanges = false,
  onRequestClose,
  onConfirmDiscard,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  allowBackdropClose?: boolean;
  allowEscapeClose?: boolean;
  hasUnsavedChanges?: boolean;
  onRequestClose?: () => void;
  onConfirmDiscard?: () => void;
}) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    if (onRequestClose) {
      onRequestClose();
    } else {
      onClose();
    }
  };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-modal-autofocus]')?.focus({ preventScroll: true });
    if (openModalCount++ === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      dialog.close();
      if (--openModalCount === 0) document.body.style.overflow = savedBodyOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) setShowDiscardConfirm(false);
  }, [open]);

  const wrapKeyboardFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab' || !panelRef.current?.contains(event.target as Node)) return;
    const controls = [...panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]',
    )].filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
      element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible');
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus();
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    full: 'max-w-[96vw] xl:max-w-7xl',
  };

  if (!open) return null;

  return (
        <dialog
          ref={dialogRef}
          className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-3 text-[var(--text-primary)] backdrop:bg-[var(--dialog-scrim)] backdrop:backdrop-blur-xs open:flex open:items-center open:justify-center sm:p-5"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? descriptionId : undefined}
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (allowEscapeClose) handleAttemptClose();
          }}
          onKeyDown={wrapKeyboardFocus}
          onPointerDown={(event) => { startedOnBackdrop.current = event.target === event.currentTarget; }}
          onClick={(event) => {
            if (event.target === event.currentTarget && startedOnBackdrop.current && allowBackdropClose) handleAttemptClose();
            startedOnBackdrop.current = false;
          }}
        >
          <motion.div
            ref={panelRef}
            {...(reduceMotion ? {} : DROPDOWN_MOTION)}
            className={`ui-surface flex max-h-full w-full flex-col rounded-[var(--radius-modal)] p-4 shadow-[var(--shadow-lg)] sm:p-6 ${sizeClasses[size]}`}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-4 shrink-0">
              <div>
                <h2
                  id={titleId}
                  className="ui-section-title"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p id={descriptionId} className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAttemptClose}
                aria-label="Close dialog"
                className="ui-button ui-button-ghost ui-button-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
              {children}
            </div>
          </motion.div>

          {showDiscardConfirm && (
            <ConfirmDiscardDialog
              open
              onKeepEditing={() => setShowDiscardConfirm(false)}
              onDiscard={() => {
                setShowDiscardConfirm(false);
                if (onConfirmDiscard) onConfirmDiscard();
                onClose();
              }}
            />
          )}
        </dialog>
  );
}

export function ImageUploadZone({
  imageUrl,
  fallbackCategory,
  onImageSelected,
  onImageRemoved,
  label = 'Product Primary Image',
  disabled = false,
  value,
  onChange,
  category,
  productName,
}: {
  imageUrl?: string | null;
  fallbackCategory?: string;
  onImageSelected?: (dataUrl: string, file: File) => void;
  onImageRemoved?: () => void;
  label?: string;
  disabled?: boolean;
  value?: string | null;
  onChange?: (val: string | null) => void;
  category?: string;
  productName?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveImage = value !== undefined ? value : imageUrl;
  const effectiveFallback = category || fallbackCategory || 'Produce';

  const processFile = (file: File) => {
    setErrorMsg(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      setErrorMsg('File too large. Maximum supported image size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        if (onChange) onChange(result);
        if (onImageSelected) onImageSelected(result, file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    if (onChange) onChange(null);
    if (onImageRemoved) onImageRemoved();
  };

  const isUploadedImage = Boolean(
    effectiveImage &&
      (effectiveImage.startsWith('data:') ||
        effectiveImage.startsWith('blob:') ||
        effectiveImage.startsWith('http') ||
        effectiveImage.startsWith('/'))
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="ui-label">
          {label}
        </span>
        <span className="ui-meta">
          JPG, PNG, WebP · Max 5MB
        </span>
      </div>

      {isUploadedImage ? (
        <div className="relative rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-black/5 shrink-0 border border-[var(--border-subtle)]">
            <img
              src={effectiveImage!}
              alt={productName || 'Uploaded Preview'}
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-x-1 bottom-1 rounded bg-[var(--nav-bg)]/90 px-1 py-0.5 text-center text-xs font-medium text-[var(--nav-active)]">
              Local Preview
            </span>
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] sm:justify-start">
              <CheckCircle2 className="size-3.5 text-[var(--status-success-fg)]" aria-hidden="true" />
              <span>Image Attached for Record</span>
            </div>
            <p className="ui-meta">
              Frontend preview active. In production, this image streams to Supabase Storage with CDN optimization.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <label aria-disabled={disabled} className="ui-button ui-button-secondary ui-button-compact focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)]">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Replace Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={disabled}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="ui-button ui-button-ghost ui-button-compact text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) processFile(f);
          }}
          className={`relative rounded-[var(--radius-card)] border border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-[var(--brand-accent)] bg-[var(--action-selected-bg)]'
              : 'border-[var(--control-border)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <div className="ui-tone-neutral mx-auto mb-2 grid size-11 place-items-center rounded-xl">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm text-[var(--text-primary)]">Drag a product photo here</p>
          <label aria-disabled={disabled} className="ui-button ui-button-secondary ui-button-compact mt-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)]">
            Browse files
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </label>
          <p className="ui-meta mt-2">
            Supports JPG, PNG, WebP up to 5MB. If omitted, default {fallbackCategory || 'category'} placeholder will be applied.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1 pt-1 text-sm text-[var(--status-danger-fg)]" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
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
    >
      <div className="space-y-4">
        <div className="ui-surface space-y-1 bg-[var(--bg-subtle)] p-3.5 text-sm">
          <div className="ui-meta">Affected record</div>
          <div className="font-semibold text-[var(--text-primary)]">
            {affectedItem}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {consequence}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-button ui-button-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`ui-button ${destructive ? 'ui-button-danger' : 'ui-button-primary'}`}
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
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[var(--agro-deep-forest)] via-[var(--agro-deep-green)] to-[var(--agro-forest-green)] p-4 text-center text-[var(--nav-text)] ${className}`}
      >
        <Leaf className="mb-1.5 size-6 text-[var(--nav-active)]" aria-hidden="true" />
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
      role={type === 'error' ? 'alert' : 'status'}
      className={`mb-5 flex items-center justify-between gap-3 rounded-[var(--radius-control)] border py-1.5 pl-4 pr-1.5 text-sm font-medium ${
        type === 'success' ? 'ui-tone-success' : 'ui-tone-danger'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ui-button ui-button-ghost ui-button-icon text-inherit"
        aria-label="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

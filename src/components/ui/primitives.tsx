'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Leaf,
  Lock,
  Package,
  RefreshCw,
  ShieldAlert,
  Truck,
  X,
  XCircle,
} from 'lucide-react';

export function Card({
  children,
  className = '',
  padding = 'p-5 sm:p-6',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-[18px] bg-[var(--bg-card)] border border-[var(--border-subtle)] ${padding} transition-colors ${className}`}
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
    <Card className={className}>
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
    <Card padding="p-5">
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
    normalized.includes('nominal')
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
    normalized.includes('hold')
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
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-6">
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
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#1F6A37] text-white hover:bg-[#12512C] transition-colors cursor-pointer"
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
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#1F6A37] text-white hover:bg-[#12512C] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
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
    <Card className="my-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
            Restricted Operational Module · {moduleName}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Your assigned role does not include the{' '}
            <code className="font-mono-tabular px-1.5 py-0.5 rounded bg-[#E5EFE6] dark:bg-[#122719] text-[#12512C] dark:text-[#4EB462]">
              {requiredPermission}
            </code>{' '}
            permission required to view or act on this surface. Use the Role
            Persona Switcher in the top utility bar to test with an authorized
            role, or contact an Administrator.
          </p>
        </div>
      </div>
    </Card>
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08190C]/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-xl rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[#E5EFE6] dark:hover:bg-[#122719] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
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
        className="p-1 rounded hover:opacity-75 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Database,
  Lock,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Sun,
  User,
  Warehouse,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

export default function SettingsPage() {
  const {
    currentUser,
    warehouses,
    theme,
    setTheme,
    demoModeEnabled,
    setDemoModeEnabled,
    resetDashboardWidgets,
    pushToast,
  } = useBos();

  const [fefoAlertDays, setFefoAlertDays] = useState(7);
  const [morningSlaCutoff, setMorningSlaCutoff] = useState('06:30');
  const [priceOverrideThresholdPct, setPriceOverrideThresholdPct] = useState(5);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveOperationalPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(
      `Operational governance thresholds saved (FEFO alert <= ${fefoAlertDays} days, Morning SLA ${morningSlaCutoff} EAT, Price Override tolerance ${priceOverrideThresholdPct}%).`
    );
    pushToast({
      title: 'Workspace Settings Saved',
      description: 'Operational SLA and FEFO thresholds updated.',
      tone: 'success',
    });
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Workspace Settings' },
        ]}
        kicker="SYSTEM CONFIGURATION & GOVERNANCE PARAMETERS"
        title="Business Operating System Settings"
        description="Configure Agro-Deliveries Kenya distribution hub parameters, FEFO perishable alert thresholds, appearance preferences, and security architecture settings."
        actions={
          <Link
            href="/profile"
            className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>My Operator Profile</span>
          </Link>
        }
      />

      <FeedbackBanner
        message={feedback}
        type="success"
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Active Distribution Hubs"
          value={`${warehouses.length} Hubs`}
          sublabel="Cold Chain, Dry Bulk & Cross-Dock"
          tone="positive"
        />
        <KPI
          label="FEFO Alert Horizon"
          value={`<= ${fefoAlertDays} Days`}
          sublabel="Perishable batch priority trigger"
          tone="positive"
        />
        <KPI
          label="Institutional Morning SLA"
          value={`${morningSlaCutoff} EAT`}
          sublabel="School & hospital kitchen cutoff"
          tone="neutral"
        />
        <KPI
          label="Data & Auth Architecture"
          value="Supabase Ready"
          sublabel="PostgreSQL + RLS + Mock Prototype Mode"
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Appearance, Prototype & Operational Policy */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="raised" className="space-y-4">
            <div>
              <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Interface Theme & Prototype Controls
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Customize workspace visual contrast, dashboard widget layout,
                and RBAC role evaluation tools
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Color Theme Mode
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Agro-Deliveries soft-mint light mode or deep forest dark mode
                </div>
              </div>
              <div className="flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#1F6A37] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#1F6A37] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    theme === 'system'
                      ? 'bg-[#1F6A37] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Top Header RBAC Role Switcher Pill</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Keep the 9-role persona switcher accessible in the top utility
                  bar alongside the Profile menu
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoModeEnabled(!demoModeEnabled)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  demoModeEnabled
                    ? 'bg-[#1F6A37] text-white'
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {demoModeEnabled ? 'Visible in Header' : 'Hidden in Header'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Command Center Widget Layout
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Restore default dashboard widget order and visibility
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetDashboardWidgets();
                  setFeedback(
                    'Dashboard widgets restored to default role-aware configuration.'
                  );
                }}
                className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Widgets</span>
              </button>
            </div>
          </Card>

          <Card variant="raised" className="space-y-4">
            <div>
              <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Operational SLA & Governance Thresholds
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Rules governing FEFO batch warnings, institutional delivery
                cutoffs, and automatic approval routing
              </p>
            </div>

            <form onSubmit={handleSaveOperationalPolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    FEFO Expiry Radar (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={fefoAlertDays}
                    onChange={(e) => setFefoAlertDays(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Morning Delivery SLA (EAT)
                  </label>
                  <input
                    type="time"
                    value={morningSlaCutoff}
                    onChange={(e) => setMorningSlaCutoff(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Price Override Approval (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={priceOverrideThresholdPct}
                    onChange={(e) =>
                      setPriceOverrideThresholdPct(Number(e.target.value))
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Governance Thresholds</span>
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Distribution Hubs & Security Architecture Posture */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="raised" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                  Configured Kenyan Distribution Hubs
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Active cold-chain, dry-bulk, and cross-dock facilities
                </p>
              </div>
              <Warehouse className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
            </div>

            <div className="space-y-3">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      {wh.code}
                    </span>
                    <span className="font-mono-tabular text-[11px]">
                      {wh.utilizationPct}% Utilized · {wh.binsCount} Bins
                    </span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {wh.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {wh.zoneType} · {wh.location} · Lead: {wh.manager}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="raised" className="space-y-3.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
              <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Security & Data Governance Posture
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Public Self-Registration</span>
                </span>
                <StatusBadge status="Disabled (Admin Invite Only)" />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>PostgreSQL Row Level Security</span>
                </span>
                <StatusBadge status="Active Schema Ready" />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Active Operator Session</span>
                </span>
                <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

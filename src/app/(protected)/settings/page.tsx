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
            className="ui-button ui-button-primary"
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
        {/* Left: Appearance & Operational Policy */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="raised" className="space-y-4">
            <div>
              <h2 className="ui-section-title">
                Interface Theme & Appearance
              </h2>
              <p className="ui-meta mt-0.5">
                Customize workspace visual contrast and system theme synchronization
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Color Theme Mode
                </div>
                <div className="ui-meta">
                  Agro-Deliveries soft-mint light mode, deep forest dark mode, or OS system theme
                </div>
              </div>
              <div
                role="group"
                aria-label="Theme Mode"
                className="flex flex-wrap gap-1"
              >
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className="ui-tab"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className="ui-tab"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  aria-pressed={theme === 'system'}
                  className="ui-tab"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>
          </Card>

          <Card variant="raised" className="space-y-4">
            <div>
              <h2 className="ui-section-title">
                Operational SLA & Governance Thresholds
              </h2>
              <p className="ui-meta mt-0.5">
                Rules governing FEFO batch warnings, institutional delivery
                cutoffs, and automatic approval routing
              </p>
            </div>

            <form onSubmit={handleSaveOperationalPolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="settings-fefo-days" className="ui-label mb-1 block">
                    FEFO Expiry Radar (Days)
                  </label>
                  <input id="settings-fefo-days"
                    type="number"
                    min={1}
                    max={30}
                    value={fefoAlertDays}
                    onChange={(e) => setFefoAlertDays(Number(e.target.value))}
                    className="ui-field w-full font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="settings-morning-cutoff" className="ui-label mb-1 block">
                    Morning Delivery SLA (EAT)
                  </label>
                  <input id="settings-morning-cutoff"
                    type="time"
                    value={morningSlaCutoff}
                    onChange={(e) => setMorningSlaCutoff(e.target.value)}
                    className="ui-field w-full font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="settings-price-override" className="ui-label mb-1 block">
                    Price Override Approval (%)
                  </label>
                  <input id="settings-price-override"
                    type="number"
                    min={1}
                    max={25}
                    value={priceOverrideThresholdPct}
                    onChange={(e) =>
                      setPriceOverrideThresholdPct(Number(e.target.value))
                    }
                    className="ui-field w-full font-mono-tabular"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="ui-button ui-button-primary"
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
                <h2 className="ui-section-title">
                  Configured Kenyan Distribution Hubs
                </h2>
                <p className="ui-meta mt-0.5">
                  Active cold-chain, dry-bulk, and cross-dock facilities
                </p>
              </div>
              <Warehouse className="w-4 h-4 text-[var(--brand-accent)]" />
            </div>

            <div className="space-y-3">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular font-semibold text-[var(--brand-accent)]">
                      {wh.code}
                    </span>
                    <span className="font-mono-tabular text-xs">
                      {wh.utilizationPct}% Utilized · {wh.binsCount} Bins
                    </span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {wh.name}
                  </div>
                  <div className="ui-meta">
                    {wh.zoneType} · {wh.location} · Lead: {wh.manager}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="raised" className="space-y-3.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--brand-accent)]" />
              <h2 className="ui-section-title">
                Security & Data Governance Posture
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Public Self-Registration</span>
                </span>
                <StatusBadge status="Disabled (Admin Invite Only)" />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>PostgreSQL Row Level Security</span>
                </span>
                <StatusBadge status="Active Schema Ready" />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
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

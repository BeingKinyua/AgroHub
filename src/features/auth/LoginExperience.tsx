'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { IMAGE_PATHS } from '@/lib/services/initial-data';
import { ResilientImage } from '@/components/ui/primitives';

export function LoginExperience() {
  const router = useRouter();
  const {
    currentUser,
    isInitialized,
    loginWithCredentials,
    users,
  } = useBos();

  const [email, setEmail] = useState('w.mwangi@agrodeliveries.co.ke');
  const [password, setPassword] = useState('AgroBOS#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [restrictedStatus, setRestrictedStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);

  useEffect(() => {
    if (isInitialized && currentUser && currentUser.status === 'Active') {
      router.replace('/dashboard');
    }
  }, [isInitialized, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRestrictedStatus(null);
    setSubmitting(true);

    const res = await loginWithCredentials(email, password);
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 'Suspended' || res.status === 'Disabled') {
        setRestrictedStatus(res.status);
      }
      setErrorMsg(res.error || 'Authentication failed.');
      return;
    }

    router.push('/dashboard');
  };

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('AgroBOS#2026');
    setErrorMsg(null);
    setRestrictedStatus(null);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Main Split Rounded Authentication Surface */}
      <main className="w-full max-w-[1280px] mx-auto my-auto py-4">
        <div className="rounded-[var(--radius-card)] bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[640px]">
          {/* LEFT COLUMN: Branding, Heading, Authentication Form */}
          <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 rounded-lg bg-[var(--nav-bg)] flex items-center justify-center text-[var(--nav-active)]">
                    <Leaf aria-hidden="true" className="size-4" />
                  </div>
                  <div className="font-heading text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                    AGRO-DELIVERIES KE.
                  </div>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] mt-8">
                Welcome back.
              </h1>
              <p className="mt-2 text-base text-[var(--text-secondary)]">
                Sign in to your workspace.
              </p>

              {/* Restricted Account Status Notice (Suspended / Disabled) */}
              {restrictedStatus && (
                <div role="alert" className="mt-6 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-sm text-[var(--status-danger-fg)]">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        Account Status: {restrictedStatus}
                      </div>
                      <p className="mt-1 leading-relaxed">
                        {errorMsg} Only active internal accounts authorized by an
                        Administrator may enter the Business Operating System.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Auth Error */}
              {errorMsg && !restrictedStatus && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-sm text-[var(--status-danger-fg)]">
                  <AlertCircle aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="work-email"
                    className="ui-label mb-1.5 block"
                  >
                    Work email
                  </label>
                  <input
                    id="work-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agrodeliveries.co.ke"
                    className="ui-field w-full"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2">
                    <label
                      htmlFor="work-password"
                      className="ui-label"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="inline-flex min-h-11 items-center rounded text-sm font-medium text-[var(--brand-accent)] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="work-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your workspace password"
                      className="ui-field w-full pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="ui-button ui-button-ghost ui-button-icon absolute right-0 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="ui-button ui-button-primary w-full"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </form>

              {/* Compact Mobile Visual Treatment */}
              <div className="mt-6 lg:hidden rounded-2xl overflow-hidden relative h-40 border border-[var(--border-subtle)]">
                <ResilientImage
                  src={IMAGE_PATHS.loginHero}
                  alt="Agro-Deliveries Kenya distribution hub"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[var(--nav-bg)]/90 via-[var(--nav-bg)]/40 to-transparent p-4">
                  <div className="text-xs font-medium text-[var(--nav-text)]">
                    Fresh Produce · Inventory · Distribution
                  </div>
                  <div className="text-xs text-[var(--nav-text-muted)]">
                    Nairobi Cold Hub A · Embakasi Dry Bulk · Westlands Cross-Dock
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Note + Evaluator Directory Quick-Fill */}
            <div className="mt-8 pt-5 border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <Lock aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-accent)]" />
                  <span>Internal operator access only · Administrator onboarded</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickFill((v) => !v)}
                  aria-expanded={showQuickFill}
                  aria-controls={showQuickFill ? 'test-accounts' : undefined}
                  className="ui-button ui-button-secondary"
                >
                  <KeyRound aria-hidden="true" className="size-4" />
                  <span>Test Accounts</span>
                  {showQuickFill ? (
                    <ChevronUp aria-hidden="true" className="size-4" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>

              {showQuickFill && (
                <div id="test-accounts" className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="ui-meta">
                    Click any internal operator account to populate credentials for RBAC evaluation:
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u.email)}
                      aria-pressed={email.toLowerCase() === u.email.toLowerCase()}
                      className={`ui-button ui-button-ghost w-full flex-col items-start justify-center gap-1 px-2 text-left sm:flex-row sm:items-center sm:justify-between ${
                        email.toLowerCase() === u.email.toLowerCase()
                          ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                          : ''
                      }`}
                    >
                      <span className="max-w-full truncate">
                        {u.fullName} · <span className="text-[var(--text-secondary)]">{u.roleName}</span>
                      </span>
                      <span className="ui-meta shrink-0 font-mono-tabular">
                        {u.status === 'Suspended' ? 'Suspended' : u.email.split('@')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <footer className="ui-meta mt-3 py-2 text-center">
              <span>© 2026 Agro-Deliveries Kenya Internal Business Operating System.</span>
            </footer>
          </div>

          {/* RIGHT COLUMN: Immersive Agricultural / Distribution Imagery */}
          <div className="relative hidden overflow-hidden bg-[var(--nav-bg)] lg:col-span-6 lg:block xl:col-span-7">
            <ResilientImage
              src={IMAGE_PATHS.loginHero}
              alt="Agro-Deliveries Kenya fresh produce and institutional foodstuff distribution center"
              className="w-full h-full object-cover opacity-90"
            />
            {/* Measured Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--nav-bg)]/90 via-[var(--nav-bg)]/35 to-[var(--nav-bg)]/20" />

            {/* Subtle Floating Contextual Labels over the image */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-none">
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg)]/65 px-3.5 py-2 text-xs font-medium text-[var(--nav-text)] backdrop-blur-md">
                Fresh Produce
              </div>
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg)]/65 px-3.5 py-2 text-xs font-medium text-[var(--nav-text)] backdrop-blur-md">
                Inventory
              </div>
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg)]/65 px-3.5 py-2 text-xs font-medium text-[var(--nav-text)] backdrop-blur-md">
                Distribution
              </div>
            </div>

            {/* Bottom Operational Context Caption */}
            <div className="absolute bottom-8 left-8 right-8 rounded-[var(--radius-card)] border border-[var(--nav-border)] bg-[var(--nav-bg)]/75 p-6 text-[var(--nav-text)] backdrop-blur-md">
              <div className="text-xs font-medium text-[var(--nav-active)]">
                UNIFIED BUSINESS OPERATING SYSTEM
              </div>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                Procurement, Cold-Chain FEFO Inventory, Fulfillment & Institutional Finance
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--nav-text-muted)]">
                Serving schools, hospitals, hotels, restaurants, and retail hubs across Kenya
                from a single permission-governed operational platform.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

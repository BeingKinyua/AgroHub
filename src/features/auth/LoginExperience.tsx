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
  Moon,
  ShieldAlert,
  Sun,
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
    theme,
    setTheme,
    resolvedDark,
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Main Split Rounded Authentication Surface */}
      <main className="w-full max-w-[1280px] mx-auto my-auto py-4">
        <div className="rounded-[24px] bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* LEFT COLUMN: Branding, Heading, Authentication Form */}
          <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              <div className='flex flex-row align-center'>
                  <div className="w-8 h-8 rounded-lg mr-4 bg-[#08190C] dark:bg-[#1F6A37] flex items-center justify-center text-[#4EB462]">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold tracking-wider text-[#1F6A37] dark:text-[#4EB462]">
                    AGRO-DELIVERIES KE.
                  </div>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] mt-8">
                Welcome back.
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                Sign in to your workspace.
              </p>

              {/* Restricted Account Status Notice (Suspended / Disabled) */}
              {restrictedStatus && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold">
                        Account Status: {restrictedStatus}
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">
                        {errorMsg} Only active internal accounts authorized by an
                        Administrator may enter the Business Operating System.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Auth Error */}
              {errorMsg && !restrictedStatus && (
                <div className="mt-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="work-email"
                    className="block text-xs font-medium text-[var(--text-primary)] mb-2"
                  >
                    Work email
                  </label>
                  <input
                    id="work-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agrodeliveries.co.ke"
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#4EB462] transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="work-password"
                      className="block text-xs font-medium text-[var(--text-primary)]"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline"
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
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#4EB462] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Compact Mobile Visual Treatment */}
              <div className="mt-6 lg:hidden rounded-2xl overflow-hidden relative h-40 border border-[var(--border-subtle)]">
                <ResilientImage
                  src={IMAGE_PATHS.loginHero}
                  alt="Agro-Deliveries Kenya distribution hub"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08190C]/90 via-[#08190C]/40 to-transparent p-4 flex flex-col justify-end">
                  <div className="text-xs text-[#E5EFE6] font-medium">
                    Fresh Produce · Inventory · Distribution
                  </div>
                  <div className="text-[11px] text-[#A9BEAE]">
                    Nairobi Cold Hub A · Embakasi Dry Bulk · Westlands Cross-Dock
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Note + Evaluator Directory Quick-Fill */}
            <div className="mt-8 pt-5 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Internal operator access only · Administrator onboarded</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickFill((v) => !v)}
                  className="inline-flex items-center gap-1 font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Test Accounts</span>
                  {showQuickFill ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showQuickFill && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] max-h-48 overflow-y-auto space-y-1.5">
                  <div className="text-[11px] text-[var(--text-secondary)] mb-2">
                    Click any internal operator account to populate credentials for RBAC evaluation:
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u.email)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        email.toLowerCase() === u.email.toLowerCase()
                          ? 'bg-[#E5EFE6] text-[#12512C] dark:bg-[#142B1B] dark:text-[#4EB462] font-medium'
                          : 'hover:bg-[#E5EFE6]/50 dark:hover:bg-[#122719]'
                      }`}
                    >
                      <span className="truncate">
                        {u.fullName} · <span className="opacity-80">{u.roleName}</span>
                      </span>
                      <span className="font-mono-tabular text-[11px] opacity-75 shrink-0 ml-2">
                        {u.status === 'Suspended' ? 'Suspended' : u.email.split('@')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <footer className="w-full max-w-[1360px] mx-auto py-2 flex flex-col sm:flex-row items-center justify-center text-xs text-[var(--text-secondary)] gap-2">
              <span>© {new Date().getFullYear()} Agro-Deliveries Kenya Internal Business Operating System.</span>
            </footer>
          </div>

          {/* RIGHT COLUMN: Immersive Agricultural / Distribution Imagery */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-7 relative bg-[#08190C] overflow-hidden">
            <ResilientImage
              src={IMAGE_PATHS.loginHero}
              alt="Agro-Deliveries Kenya fresh produce and institutional foodstuff distribution center"
              className="w-full h-full object-cover opacity-90"
            />
            {/* Measured Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08190C]/90 via-[#08190C]/35 to-[#08190C]/20" />

            {/* Subtle Floating Contextual Labels over the image */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-none">
              <div className="backdrop-blur-md bg-[#08190C]/65 border border-white/15 text-[#F4F6F3] px-3.5 py-2 rounded-xl text-xs font-medium">
                Fresh Produce
              </div>
              <div className="backdrop-blur-md bg-[#08190C]/65 border border-white/15 text-[#F4F6F3] px-3.5 py-2 rounded-xl text-xs font-medium">
                Inventory
              </div>
              <div className="backdrop-blur-md bg-[#08190C]/65 border border-white/15 text-[#F4F6F3] px-3.5 py-2 rounded-xl text-xs font-medium">
                Distribution
              </div>
            </div>

            {/* Bottom Operational Context Caption */}
            <div className="absolute bottom-8 left-8 right-8 p-6 rounded-2xl backdrop-blur-md bg-[#08190C]/75 border border-white/12 text-[#F4F6F3]">
              <div className="text-xs font-medium text-[#4EB462]">
                UNIFIED BUSINESS OPERATING SYSTEM
              </div>
              <h2 className="font-heading text-xl font-semibold mt-1 text-white">
                Procurement, Cold-Chain FEFO Inventory, Fulfillment & Institutional Finance
              </h2>
              <p className="text-xs text-[#A9BEAE] mt-1.5 leading-relaxed max-w-xl">
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

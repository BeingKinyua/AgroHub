'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Leaf, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg-canvas)] p-4 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--nav-bg)] text-[var(--nav-active)]">
            <Leaf aria-hidden="true" className="size-4" />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide">
              AGRO-DELIVERIES KE.
            </div>
            <div className="ui-meta">
              CREDENTIAL RECOVERY
            </div>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">
          Reset workspace password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Enter your Agro-Deliveries work email. If your account is active, a
          password recovery link will be dispatched via Supabase Auth.
        </p>

        {submitted ? (
          <div role="status" className="mt-6 space-y-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 text-sm text-[var(--status-success-fg)]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              <span>Recovery instructions dispatched</span>
            </div>
            <p className="wrap-break-word">
              Check <strong>{email}</strong> for a time-limited link to{' '}
              <Link href="/reset-password" className="font-medium underline underline-offset-2">
                complete password reset
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="recovery-email"
                className="ui-label mb-1.5 block"
              >
                Work email
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agrodeliveries.co.ke"
                  className="ui-field w-full pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              className="ui-button ui-button-primary w-full"
            >
              Send recovery link
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <Link
            href="/login"
            className="ui-button ui-button-ghost text-[var(--brand-accent)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Return to Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[22px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#08190C] text-[#4EB462] flex items-center justify-center">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <div className="font-heading text-xs font-semibold">
              AGRO-DELIVERIES KE.
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              CREDENTIAL RECOVERY
            </div>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">
          Reset workspace password
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          Enter your Agro-Deliveries work email. If your account is active, a
          password recovery link will be dispatched via Supabase Auth.
        </p>

        {submitted ? (
          <div className="mt-6 p-4 rounded-xl bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Recovery instructions dispatched</span>
            </div>
            <p>
              Check <strong>{email}</strong> for a time-limited link to{' '}
              <Link href="/reset-password" className="underline font-medium">
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
                className="block text-xs font-medium mb-1.5"
              >
                Work email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="recovery-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agrodeliveries.co.ke"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Send recovery link
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

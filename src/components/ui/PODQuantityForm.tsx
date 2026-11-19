'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { calculateInvoiceEligibility } from '@/lib/services/business-rules';
import { checkPODLine, comparePODLine, POD_DISCREPANCY_REASONS, preparePODReceipt, type PODExpectedLine, type PODQuantityInput } from '@/lib/services/delivery-workflow';

export const podInputClass = 'ui-field w-full';
export const podSecondaryClass = 'ui-button ui-button-secondary';
export const podPrimaryClass = 'ui-button ui-button-primary';

interface QuantityFields {
  received: string;
  accepted: string;
  reason: string;
  explanation: string;
}

function readQuantity(value: string) {
  return value === '' ? NaN : Number(value);
}

export function PODQuantityForm({ expected, mode, billingAvailable = false, children, onCancel, onSubmit }: {
  expected: PODExpectedLine[];
  mode: 'capture' | 'verify';
  billingAvailable?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onSubmit: (quantities: PODQuantityInput[], issueInvoice: boolean) => Promise<{ ok: boolean; message: string }>;
}) {
  const lines = expected.filter((line) => line.dispatchedQty > 0);
  const [fields, setFields] = useState<Record<string, QuantityFields>>(() => Object.fromEntries(lines.map((line) => {
    const item = line.submitted;
    const accepted = item?.acceptedQty ?? item?.deliveredQty;
    const received = item?.receivedQty ?? (accepted === undefined ? undefined : accepted + (item?.rejectedQty ?? 0));
    return [line.orderLineId, {
      received: received?.toString() ?? '',
      accepted: accepted?.toString() ?? '',
      reason: item?.discrepancyReason ?? item?.rejectionReason ?? '',
      explanation: item?.discrepancyExplanation ?? '',
    }];
  })));
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quantities = lines.map((line) => {
    const values = fields[line.orderLineId];
    return {
      orderLineId: line.orderLineId,
      receivedQty: readQuantity(values.received),
      acceptedQty: readQuantity(values.accepted),
      discrepancyReason: values.reason,
      discrepancyExplanation: values.explanation,
    };
  });
  const receipt = preparePODReceipt(expected, quantities);
  const hasValidQuantities = lines.length > 0 && lines.every((line, index) => !checkPODLine(line, quantities[index]));
  const invoice = hasValidQuantities ? calculateInvoiceEligibility(lines.map((line, index) => ({
    ...line,
    ...comparePODLine(line, quantities[index]),
  }))) : null;
  const amount = invoice && new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(invoice.billableTotalKes);

  function edit(id: string, patch: Partial<QuantityFields>) {
    setFields((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setConfirmed(false);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || submitting) return;
    if (receipt.ok === false) {
      setError(receipt.message);
      return;
    }
    const issueInvoice = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'invoice';
    setSubmitting(true);
    try {
      const result = await onSubmit(quantities, issueInvoice);
      if (!result.ok) setError(result.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {children}
      <div className="space-y-3">
        <h3 className="ui-section-title">Delivery quantities</h3>
        {lines.map((line, index) => {
          const key = line.orderLineId;
          const quantity = quantities[index];
          const values = fields[key];
          const hasBoth = values.received !== '' && values.accepted !== '';
          const issue = hasBoth ? checkPODLine(line, quantity) : null;
          const comparison = hasBoth && !issue ? comparePODLine(line, quantity) : null;
          const legacyReason = values.reason && !POD_DISCREPANCY_REASONS.some((reason) => reason === values.reason);
          return (
            <fieldset key={key} className="min-w-0 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              <legend className="max-w-full px-1 text-sm font-semibold">{line.productName}</legend>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-[var(--text-secondary)]">Ordered</dt><dd>{line.orderedQty} {line.unit}</dd></div>
                <div><dt className="text-xs text-[var(--text-secondary)]">Expected at this stop</dt><dd>{line.dispatchedQty} {line.unit}</dd></div>
                {line.previousAcceptedQty > 0 && <div><dt className="text-xs text-[var(--text-secondary)]">Previously accepted</dt><dd>{line.previousAcceptedQty} {line.unit}</dd></div>}
              </dl>
              {mode === 'verify' && line.submitted && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Recorded at delivery · {line.submitted.receivedQty ?? (line.submitted.deliveredQty ?? 0) + line.submitted.rejectedQty} received · {line.submitted.acceptedQty ?? line.submitted.deliveredQty ?? 0} accepted
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="ui-label min-w-0 space-y-1">
                  <span>Received</span>
                  <input type="number" inputMode="decimal" min="0" step="any" required value={values.received}
                    aria-invalid={issue && quantity.receivedQty < 0 ? true : undefined}
                    onChange={(event) => edit(key, { received: event.target.value })} className={podInputClass} />
                </label>
                <label className="ui-label min-w-0 space-y-1">
                  <span>Accepted</span>
                  <input type="number" inputMode="decimal" min="0" max={Number.isFinite(quantity.receivedQty) ? Math.min(quantity.receivedQty, line.dispatchedQty) : undefined} step="any" required value={values.accepted}
                    aria-invalid={issue ? true : undefined}
                    onChange={(event) => edit(key, { accepted: event.target.value })} className={podInputClass} />
                </label>
              </div>
              {issue && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{issue}</p>}
              {comparison && (
                <dl className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm tabular-nums">
                  <div><dt className="text-xs text-[var(--text-secondary)]">Short</dt><dd>{comparison.currentDeliveryShortage} {line.unit}</dd></div>
                  <div><dt className="text-xs text-[var(--text-secondary)]">Rejected</dt><dd>{comparison.rejectedQty} {line.unit}</dd></div>
                  <div><dt className="text-xs text-[var(--text-secondary)]">Excess</dt><dd>{comparison.excessQty} {line.unit}</dd></div>
                </dl>
              )}
              {comparison?.hasDiscrepancy && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="ui-label min-w-0 space-y-1">
                    <span>Discrepancy reason</span>
                    <select required value={values.reason} onChange={(event) => edit(key, { reason: event.target.value })} className={podInputClass}>
                      <option value="">Select a reason</option>
                      {legacyReason && <option value={values.reason}>{values.reason}</option>}
                      {POD_DISCREPANCY_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                    </select>
                  </label>
                  <label className="ui-label min-w-0 space-y-1">
                    <span>Notes {values.reason === 'Other' ? '(required)' : '(optional)'}</span>
                    <input required={values.reason === 'Other'} value={values.explanation} onChange={(event) => edit(key, { explanation: event.target.value })} className={podInputClass} />
                  </label>
                </div>
              )}
            </fieldset>
          );
        })}
        {lines.length === 0 && <p className="text-sm text-[var(--text-secondary)]">There are no outstanding items for this stop.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
        <div>
          <p className="text-sm font-semibold">Potential accepted-goods invoice</p>
          <p className="text-sm text-[var(--text-secondary)]">Billable total for accepted quantities.</p>
        </div>
        <output className="font-heading text-lg font-semibold tabular-nums" aria-live="polite">{amount ?? 'Awaiting quantities'}</output>
      </div>
      <label className="ui-label flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-5 shrink-0 accent-[var(--brand-accent)]" />
        I checked the received and accepted quantities against the goods and delivery evidence.
      </label>
      {error && <p role="alert" className="rounded-lg border border-[var(--status-danger-border)] p-3 text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
        <button type="button" onClick={onCancel} disabled={submitting} className={podSecondaryClass}>Cancel</button>
        <button type="submit" disabled={submitting || !confirmed || !lines.length} className={mode === 'capture' ? podPrimaryClass : podSecondaryClass}>
          {submitting ? 'Saving…' : mode === 'capture' ? 'Submit for verification' : 'Verify only'}
        </button>
        {mode === 'verify' && billingAvailable && (
          <button type="submit" value="invoice" disabled={submitting || !confirmed || !invoice?.eligible} className={podPrimaryClass}>Verify and issue invoice</button>
        )}
      </div>
    </form>
  );
}

'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, FeedbackBanner, KPI, Modal, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { PODQuantityForm, podInputClass, podPrimaryClass, podSecondaryClass } from '@/components/ui/PODQuantityForm';
import { useBos } from '@/lib/services/bos-context';
import { ModuleChart } from '@/components/ui/ModuleChart';
import { calculateInvoiceEligibility } from '@/lib/services/business-rules';
import { canAccessDeliveryRun, getExistingPODInvoice, getOrderReceipts, getPODExpectedLines, isOpenPODDiscrepancy, isPendingPOD, type PODQuantityInput } from '@/lib/services/delivery-workflow';
import type { OrderLifecycleStatus, OrderRecord, PODEvidenceRecord } from '@/types/domain/bos';

const stages: OrderLifecycleStatus[] = ['Confirmed', 'Picking', 'Packed', 'Dispatched', 'Partially Fulfilled', 'Delivered', 'Closed'];
const formatKES = (amount: number) => `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

type ReceiptAction = 'review' | 'details' | 'resolve' | 'reject';
type ActionState = { id: string; action: ReceiptAction };

function ReceiptDetails({ pod }: { pod: PODEvidenceRecord }) {
  const potential = calculateInvoiceEligibility(pod.deliveredItems).billableTotalKes;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={pod.status} />
        {pod.hasDiscrepancies && <StatusBadge status={pod.reconciliationStatus || 'Disputed'} />}
      </div>

      <p className="text-sm text-[var(--text-secondary)]">{pod.recipientName} · {pod.submittedAt}</p>
      <ul className="space-y-3">
        {pod.deliveredItems.map((item, index) => {
          const expected = item.dispatchedQty ?? item.requestedQty ?? item.orderedQty ?? 0;
          const accepted = item.acceptedQty ?? item.deliveredQty ?? 0;
          const received = item.receivedQty ?? accepted + item.rejectedQty;
          const metrics = [
            ['Expected', expected], ['Received', received], ['Accepted', accepted],
            ['Short', item.currentDeliveryShortage ?? Math.max(0, expected - received)],
            ['Rejected', item.rejectedQty], ['Excess', item.excessQty ?? Math.max(0, received - expected)],
          ] as const;
          return (
            <li key={item.orderLineId ?? index} className="rounded-xl border border-[var(--border-subtle)] p-4">
              <h3 className="text-sm font-semibold">{item.productName}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums sm:grid-cols-3">
                {metrics.map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--text-secondary)]">{label}</dt><dd>{value} {item.unit}</dd></div>)}
              </dl>
              {item.discrepancyReason && <p className="mt-3 text-sm">{item.discrepancyReason}{item.discrepancyExplanation && ` · ${item.discrepancyExplanation}`}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-canvas)] p-4">
        <p className="text-sm font-semibold">Accepted-goods value</p>
        <strong className="text-lg tabular-nums">{formatKES(potential)}</strong>
      </div>
      {pod.evidenceFiles.length > 0 && (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Delivery evidence</h3>
          <ul>{pod.evidenceFiles.map((file) => <li key={file.url}><a href={file.url} target="_blank" rel="noreferrer" className="underline">{file.name}</a></li>)}</ul>
        </div>
      )}
      {pod.deliveryNotes && <p className="text-sm text-[var(--text-secondary)]">{pod.deliveryNotes}</p>}
      {pod.discrepancyNotes && <p className="text-sm text-[var(--text-secondary)]">{pod.discrepancyNotes}</p>}
      {pod.rejectionReason && <p className="text-sm text-[var(--text-secondary)]">Rejection reason · {pod.rejectionReason}</p>}
      {pod.invoiceNumber && <Link href={`/invoices#invoice-${pod.invoiceNumber}`} className="text-sm font-semibold underline">View invoice {pod.invoiceNumber}</Link>}
      {pod.replacementRunId && <Link href={`/deliveries#run-${pod.replacementRunId}`} className="block text-sm font-semibold underline">View replacement delivery run</Link>}
    </div>
  );
}

function DiscrepancyForm({ pod, canSchedule, onClose, onDone }: {
  pod: PODEvidenceRecord; canSchedule: boolean; onClose: () => void; onDone: (message: string) => void;
}) {
  const { reconcilePODDiscrepancy } = useBos();
  const [action, setAction] = useState<'Accept Final Quantities' | 'Schedule Re-delivery'>('Accept Final Quantities');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    try {
      const result = await reconcilePODDiscrepancy(pod.id, { action, notes, replacementDate: date || undefined });
      if (result.ok) onDone(result.message);
      else setError(result.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="ui-label block space-y-1">
        <span>Resolution</span>
        <select className={podInputClass} value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
          <option value="Accept Final Quantities">Accept verified quantities as final</option>
          {canSchedule && <option value="Schedule Re-delivery">Plan delivery of outstanding quantities</option>}
        </select>
      </label>
      {action === 'Schedule Re-delivery' ?
        <label className="ui-label block space-y-1">
          <span>Replacement delivery date</span>
          <input type="date" className={podInputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
        </label> :
        <p className="text-sm text-[var(--text-secondary)]">Any outstanding quantity will be recorded as a shortage accepted by the supervisor.</p>}
      <label className="ui-label block space-y-1">
        <span>Resolution notes</span>
        <textarea className={podInputClass} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} required />
      </label>
      {error && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={podSecondaryClass} onClick={onClose} disabled={working}>Cancel</button>
        <button type="submit" className={podPrimaryClass} disabled={working}>{working ? 'Saving…' : 'Record resolution'}</button>
      </div>
    </form>
  );
}

function RejectForm({ pod, onClose, onDone }: { pod: PODEvidenceRecord; onClose: () => void; onDone: (message: string) => void }) {
  const { rejectPOD } = useBos();
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    try {
      const result = await rejectPOD(pod.id, reason);
      if (result.ok) onDone(result.message);
      else setError(result.message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <form onSubmit={reject} className="space-y-4">
      <label className="ui-label block space-y-1">
        <span>Rejection reason</span>
        <textarea className={podInputClass} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required />
      </label>
      {error && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={podSecondaryClass} onClick={onClose} disabled={working}>Back</button>
        <button type="submit" className={podPrimaryClass} disabled={working}>{working ? 'Saving…' : 'Reject and reopen stop'}</button>
      </div>
    </form>
  );
}

function FulfillmentContent() {
  const requestedReceipt = useSearchParams().get('receipt');
  const { orders, customers, deliveries, drivers, currentUser, invoices, podRecords, can, advanceOrderStatus, verifyPOD } = useBos();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedReceipt, setReceiptAction] = useState<ActionState | null>(null);
  const [dismissedReceipt, setDismissedReceipt] = useState<string | null>(null);
  const receiptAction = selectedReceipt ?? (requestedReceipt && requestedReceipt !== dismissedReceipt
    ? { id: requestedReceipt, action: 'details' as const } : null);
  const [stage, setStage] = useState<OrderLifecycleStatus | ''>('');
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const driverOrders = currentUser?.roleId === 'delivery_driver' ? new Set(deliveries
    .filter((run) => canAccessDeliveryRun(run, currentUser, drivers)).flatMap((run) => run.ordersIncluded)) : null;
  const activeOrders = orders.filter((order) => stages.includes(order.status) &&
    (!driverOrders || driverOrders.has(order.orderNumber) || driverOrders.has(order.id)));
  const visibleOrderIds = new Set(activeOrders.map((order) => order.id));
  const receipts = podRecords.filter((pod) => visibleOrderIds.has(pod.orderId));
  const pending = receipts.filter(isPendingPOD);
  const discrepancies = receipts.filter(isOpenPODDiscrepancy);
  const queue = [...pending, ...discrepancies.filter((pod) => !isPendingPOD(pod))];
  const query = search.trim().toLowerCase();
  const displayed = activeOrders.filter((order) => (!stage || stage === order.status) &&
    (!query || [order.orderNumber, order.customerName, order.warehouseName].some((value) => value.toLowerCase().includes(query))));
  const selectedOrder = activeOrders.find((order) => order.id === selectedOrderId);
  const selectedReceipts = selectedOrder ? getOrderReceipts(selectedOrder, podRecords) : [];
  const shortageAccepted = selectedReceipts.some((pod) => pod.shortageAccepted);
  const activePOD = receipts.find((pod) => pod.id === receiptAction?.id);
  const activeOrder = activeOrders.find((order) => order.id === activePOD?.orderId);
  const reviewer = can('orders.approve');

  const closeReceipt = () => {
    setReceiptAction(null);
    setDismissedReceipt(requestedReceipt);
  };

  const finishAction = (message: string) => {
    setFeedback({ msg: message, type: 'success' });
    closeReceipt();
  };

  async function updateStage(order: OrderRecord, nextStatus: OrderLifecycleStatus) {
    if (working) return;
    setWorking(true);
    try {
      const result = await advanceOrderStatus(order.id, nextStatus);
      setFeedback({ msg: result.message, type: result.ok ? 'success' : 'error' });
      if (result.ok) setSelectedOrderId(null);
    } finally {
      setWorking(false);
    }
  }

  async function verify(quantities: PODQuantityInput[], createInvoice: boolean) {
    if (!activePOD) return { ok: false, message: 'Select a pending proof of delivery.' };
    const result = await verifyPOD(activePOD.id, { quantities, quantitiesConfirmed: true, createInvoice });
    if (result.ok) finishAction(result.message);
    return result;
  }

  function receiptButtons(pod: PODEvidenceRecord) {
    const review = reviewer && isPendingPOD(pod);
    const resolve = reviewer && pod.status === 'Verified' && isOpenPODDiscrepancy(pod) && !pod.replacementRunId;
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" className={review ? podPrimaryClass : podSecondaryClass}
          onClick={() => setReceiptAction({ id: pod.id, action: review ? 'review' : 'details' })}>{review ? 'Review quantities' : 'View receipt'}</button>
        {resolve && <button type="button" className={podPrimaryClass} onClick={() => setReceiptAction({ id: pod.id, action: 'resolve' })}>Resolve discrepancy</button>}
      </div>
    );
  }

  const customer = customers.find((entry) => entry.id === activeOrder?.customerId);
  const mayInvoice = Boolean(activePOD && customer?.isInstitutional && customer.paymentTerms !== 'Prepaid / M-Pesa' &&
    !activePOD.invoiceNumber && !getExistingPODInvoice(activePOD, invoices));
  const activeTitle = receiptAction?.action === 'review' ? 'Verify proof of delivery' :
    receiptAction?.action === 'resolve' ? 'Resolve delivery discrepancy' :
    receiptAction?.action === 'reject' ? 'Reject proof of delivery' : 'Proof of delivery';

  return (
    <div className="space-y-6">
      <PageHeader title="Fulfillment" description="Prepare orders, verify receipt quantities and resolve delivery exceptions." />
      <FeedbackBanner message={feedback?.msg ?? null} type={feedback?.type} onDismiss={() => setFeedback(null)} />

      <div className="bento-metrics">
        <KPI label="Preparing orders" value={String(activeOrders.filter((order) => ['Confirmed', 'Picking', 'Packed'].includes(order.status)).length)} tone="neutral" />
        <KPI label="In transit" value={String(activeOrders.filter((order) => order.status === 'Dispatched').length)} tone="neutral" />
        <KPI label="Receipts to review" value={String(pending.length)} tone={pending.length ? 'warning' : 'neutral'} />
        <KPI label="Open discrepancies" value={String(discrepancies.length)} tone={discrepancies.length ? 'warning' : 'neutral'} />
      </div>

      <section aria-label="Fulfillment analysis" className="grid gap-4 lg:grid-cols-2">
        <ModuleChart title="Active order workload" subtitle="Orders by fulfillment stage" data={['Confirmed', 'Picking', 'Packed', 'Dispatched', 'Partially Fulfilled']
          .map((status) => ({ status, count: activeOrders.filter((order) => order.status === status).length }))} xKey="status" series={[{ key: 'count', label: 'Orders' }]} />
        <ModuleChart title="Proof of delivery review" subtitle="Pending receipts and open discrepancies" data={[
          { type: 'Needs review', count: pending.length }, { type: 'Discrepancy', count: discrepancies.length },
        ]} xKey="type" series={[{ key: 'count', label: 'Receipts' }]} />
      </section>

      <section id="pod-queue" className="space-y-3 scroll-mt-24">
        <h2 className="ui-section-title">Proof of delivery queue</h2>
        {queue.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No receipts need review or reconciliation.</p> :
          <ul className="space-y-2">{queue.map((pod) => (
            <li key={pod.id} id={`pod-${pod.id}`} className="scroll-mt-24">
              <Card padding="p-3 sm:p-4" className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{pod.customerName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{pod.orderNumber} · {pod.id}</p>
                  <StatusBadge status={isPendingPOD(pod) ? pod.status : pod.reconciliationStatus ?? 'Disputed'} />
                </div>
                {receiptButtons(pod)}
              </Card>
            </li>
          ))}</ul>}
      </section>

      <section id="orders" className="space-y-3 scroll-mt-24">
        <h2 className="ui-section-title">Orders</h2>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]">
          <label className="ui-label block space-y-1"><span>Search orders</span>
            <input type="search" className={podInputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer or hub" />
          </label>
          <label className="ui-label block space-y-1"><span>Fulfillment status</span>
            <select className={podInputClass} value={stage} onChange={(event) => setStage(event.target.value as typeof stage)}>
              <option value="">All statuses</option>{stages.map((entry) => <option key={entry}>{entry}</option>)}
            </select>
          </label>
        </div>
        <ul className="space-y-2">
          {displayed.map((order) => (
            <li key={order.id}>
              <Card padding="p-3 sm:p-4" className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{order.customerName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{order.orderNumber} · {order.nextStepLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={order.status} />
                  <button type="button" className={podSecondaryClass} onClick={() => setSelectedOrderId(order.id)}>View order</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        {displayed.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No orders match the current filters.</p>}
      </section>

      <Modal open={Boolean(selectedOrder && !activePOD)} onClose={() => setSelectedOrderId(null)}
        title={selectedOrder?.orderNumber ?? 'Fulfillment order'} subtitle={selectedOrder?.customerName} size="xl">
        {selectedOrder && !activePOD && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selectedOrder.status} /><p className="text-sm">{selectedOrder.nextStepLabel}</p></div>
            <p className="text-sm text-[var(--text-secondary)]">{selectedOrder.warehouseName} · Target delivery {selectedOrder.deliveryDate}</p>
            <h3 className="ui-section-title">Order quantities</h3>
            <ul className="space-y-2">
              {getPODExpectedLines(selectedOrder, podRecords).map((line, index) => (
                <li key={line.orderLineId} className="space-y-1 rounded-lg border border-[var(--border-subtle)] p-3 text-sm">
                  <p className="font-semibold">{line.productName}</p>
                  <p className="text-[var(--text-secondary)]">{line.orderedQty} {line.unit} ordered · {line.previousAcceptedQty} accepted · {line.outstandingQty} {shortageAccepted ? 'shortfall accepted' : 'outstanding'}</p>
                  {selectedOrder.items[index].allocatedBatch && <p className="text-[var(--text-secondary)]">{selectedOrder.items[index].allocatedBatch}</p>}
                </li>
              ))}
            </ul>
            {selectedReceipts.length > 0 && (
              <div className="space-y-2">
                <h3 className="ui-section-title">Proof of delivery history</h3>
                {selectedReceipts.map((pod) => (
                  <div key={pod.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm"><span>{pod.id}</span><StatusBadge status={pod.status} /></div>
                    {receiptButtons(pod)}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              {selectedOrder.status === 'Confirmed' && can('fulfillment.manage') &&
                <button type="button" className={podPrimaryClass} disabled={working} onClick={() => updateStage(selectedOrder, 'Picking')}>Start picking</button>}
              {selectedOrder.status === 'Picking' && can('fulfillment.manage') &&
                <button type="button" className={podPrimaryClass} disabled={working} onClick={() => updateStage(selectedOrder, 'Packed')}>Mark packed</button>}
              {['Packed', 'Dispatched'].includes(selectedOrder.status) && can('deliveries.view') &&
                <Link href={`/deliveries?order=${encodeURIComponent(selectedOrder.orderNumber)}`} className={podPrimaryClass}>View delivery runs</Link>}
              {selectedOrder.status === 'Delivered' && selectedOrder.podStatus === 'Verified' && can('orders.edit') &&
                <button type="button" className={podPrimaryClass} disabled={working} onClick={() => updateStage(selectedOrder, 'Closed')}>Close order</button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(activePOD && receiptAction)} onClose={closeReceipt}
        title={activeTitle} subtitle={activePOD && `${activePOD.orderNumber} · ${activePOD.customerName}`} size="2xl">
        {activePOD && receiptAction?.action === 'details' && <ReceiptDetails pod={activePOD} />}
        {activePOD && receiptAction?.action === 'review' && activeOrder && (
          <PODQuantityForm key={activePOD.id} mode="verify" expected={getPODExpectedLines(activeOrder, podRecords, activePOD)}
            billingAvailable={mayInvoice} onSubmit={verify} onCancel={closeReceipt}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>{activePOD.recipientName} · {activePOD.submittedAt}</p>
              <button type="button" className={podSecondaryClass} onClick={() => setReceiptAction({ id: activePOD.id, action: 'reject' })}>Reject proof of delivery</button>
            </div>
            {activePOD.deliveryNotes && <p className="text-sm text-[var(--text-secondary)]">{activePOD.deliveryNotes}</p>}
            {activePOD.evidenceFiles.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="block text-sm underline">{file.name}</a>)}
          </PODQuantityForm>
        )}
        {activePOD && receiptAction?.action === 'resolve' && (
          <DiscrepancyForm key={activePOD.id} pod={activePOD}
            canSchedule={Boolean(activePOD.deliveryRunId && activeOrder && getPODExpectedLines(activeOrder, podRecords).some((line) => line.outstandingQty > 0))}
            onClose={closeReceipt} onDone={finishAction} />
        )}
        {activePOD && receiptAction?.action === 'reject' && (
          <RejectForm key={activePOD.id} pod={activePOD}
            onClose={() => setReceiptAction({ id: activePOD.id, action: 'review' })} onDone={finishAction} />
        )}
      </Modal>
    </div>
  );
}

export default function FulfillmentPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-[var(--text-secondary)]">Loading fulfillment…</p>}><FulfillmentContent /></Suspense>;
}

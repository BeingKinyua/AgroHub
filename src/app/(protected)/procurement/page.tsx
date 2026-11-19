'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, PackageCheck, Plus } from 'lucide-react';
import { Card, FeedbackBanner, KPI, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { useBos } from '@/lib/services/bos-context';
import { isSupplierEligibleForPurchasing } from '@/lib/services/business-rules';
import { getOrderSourcingLines, getPurchaseReceiptBalance } from '@/lib/services/procurement-rules';
import { ClosePurchaseForm, formatKes, NewPurchaseForm, purchaseButton, PurchaseReceiptForm, purchaseSecondaryButton } from './PurchaseForms';

const receivingStages = ['PO Issued', 'Receiving (GRN)', 'Quality Check', 'Partially Received'];
type PurchaseFilter = 'all' | 'direct' | 'stock' | 'approval' | 'receiving';
const filters: { value: PurchaseFilter; label: string }[] = [
  { value: 'all', label: 'All purchases' }, { value: 'direct', label: 'Direct to customer' },
  { value: 'stock', label: 'Warehouse stock' }, { value: 'approval', label: 'Needs approval' },
  { value: 'receiving', label: 'Awaiting receipt' },
];

function ProcurementContent() {
  const params = useSearchParams();
  const orderParam = params.get('order') ?? '';
  const {
    advanceProcurementStage, can, orders, procurementOrders, supplierPayables, suppliers,
  } = useBos();
  const initialFilter = params.get('filter');
  const [filter, setFilter] = useState<PurchaseFilter>(() => initialFilter === 'pending-approval' ? 'approval' : initialFilter === 'receiving' ? 'receiving' : 'all');
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [closedOrder, setClosedOrder] = useState('');
  const [receiptPoId, setReceiptPoId] = useState('');
  const [closingPoId, setClosingPoId] = useState('');
  const [advancing, setAdvancing] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const canCreate = can('procurement.create');
  const attentionOrders = orders.filter(({ status }) => ['Confirmed', 'Picking', 'Partially Fulfilled'].includes(status))
    .map((order) => ({ order, lines: getOrderSourcingLines(order, procurementOrders).filter((line) => line.outstanding > 0) }))
    .filter(({ lines }) => lines.length > 0);
  const deepLinkOrder = orderParam && closedOrder !== orderParam && canCreate && attentionOrders.some(({ order, lines }) =>
    order.id === orderParam && lines.some(({ uncommitted }) => uncommitted > 0)) ? orderParam : null;
  const formOrder = openOrder ?? deepLinkOrder;
  const receiptPo = procurementOrders.find((po) => po.id === receiptPoId);
  const closingPo = procurementOrders.find((po) => po.id === closingPoId);
  const pending = procurementOrders.filter((po) => po.stage === 'Pending Approval');
  const awaitingReceipt = procurementOrders.filter((po) => receivingStages.includes(po.stage) && (po.lines?.length || !supplierPayables.some((payable) => payable.poNumber === po.poNumber || payable.purchaseOrderId === po.id || payable.poId === po.id)));
  const purchaseRows = procurementOrders.filter((po) => {
    if (filter === 'approval') return po.stage === 'Pending Approval';
    if (filter === 'receiving') return awaitingReceipt.includes(po);
    if (filter === 'direct') return po.purpose === 'Direct Customer Fulfillment';
    if (filter === 'stock') return po.purpose === 'Bulk Stock Procurement';
    return true;
  });

  function closeNewPurchase() {
    if (orderParam) setClosedOrder(orderParam);
    setOpenOrder(null);
  }

  async function advance(poId: string) {
    setAdvancing(poId);
    try {
      const result = await advanceProcurementStage(poId);
      setFeedback({ message: result.message, type: result.ok ? 'success' : 'error' });
    } finally {
      setAdvancing('');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Procurement" description="Source customer demand and replenish warehouse stock."
        actions={canCreate && <button className={purchaseButton} onClick={() => setOpenOrder('')} type="button">
          <Plus size={17} aria-hidden="true" /> New purchase request
        </button>} />
      <FeedbackBanner message={feedback?.message ?? null} type={feedback?.type} onDismiss={() => setFeedback(null)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Customer orders sourcing" value={String(attentionOrders.length)} sublabel="With direct quantities outstanding" />
        <KPI label="Purchase orders awaiting approval" value={String(pending.length)} tone="warning" sublabel="Sign-off before issue" />
        <KPI label="Purchase orders awaiting receipt" value={String(awaitingReceipt.length)} sublabel="Issued or partially received" />
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Procurement views">
        <button type="button" aria-pressed={!showSuppliers} className="ui-tab"
          onClick={() => setShowSuppliers(false)}>Sourcing & purchases</button>
        <button type="button" aria-pressed={showSuppliers} className="ui-tab"
          onClick={() => setShowSuppliers(true)}>Supplier comparison</button>
      </div>

      {showSuppliers ? (
        <section aria-labelledby="procurement-suppliers" className="space-y-3">
          <h2 id="procurement-suppliers" className="ui-section-title">Supplier comparison</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {suppliers.filter((supplier) => !supplier.isArchived).map((supplier) => (
              <Card key={supplier.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{supplier.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{supplier.region} · {supplier.category}</p></div>
                  <StatusBadge status={isSupplierEligibleForPurchasing(supplier).eligible ? 'Eligible' : supplier.status} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-[var(--text-secondary)]">Lead time</dt><dd>{supplier.leadTimeDays} days</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Terms</dt><dd>{supplier.paymentTerms}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Quality score</dt><dd>{supplier.qualityScorePct}%</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Price trend</dt><dd>{supplier.recentPriceTrend}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Payable balance</dt><dd>{formatKes(supplier.payableBalanceKes)}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="sourcing-demand" className="space-y-3">
            <h2 id="sourcing-demand" className="ui-section-title">Customer sourcing demand</h2>
            {attentionOrders.length === 0 && <Card><p className="text-sm text-[var(--text-secondary)]">No customer orders have outstanding direct sourcing.</p></Card>}
            {attentionOrders.map(({ order, lines }) => (
              <Card key={order.id} className={`space-y-3 ${order.id === orderParam ? 'ring-1 ring-[var(--brand-accent)]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{order.orderNumber} · {order.customerName}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Delivery {order.deliveryDate}</p>
                  </div>
                  {canCreate && lines.some(({ uncommitted }) => uncommitted > 0) && <button type="button" className={purchaseSecondaryButton}
                    onClick={() => setOpenOrder(order.id)}>Source this order <ArrowRight size={16} aria-hidden="true" /></button>}
                </div>
                <ul className="space-y-2 text-sm">
                  {lines.map(({ id, item, directRequired, collected, uncommitted }) => (
                    <li key={id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-2">
                      <span>{item.productName}</span>
                      <span className="text-[var(--text-secondary)]">{collected.toLocaleString()} / {directRequired.toLocaleString()} {item.unit} collected · {uncommitted > 0 ? `${uncommitted.toLocaleString()} ${item.unit} to order` : 'All quantities ordered'}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </section>

          <section aria-labelledby="purchase-orders" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="purchase-orders" className="ui-section-title">Purchase orders</h2>
              <label className="ui-label flex flex-wrap items-center gap-2">Show
                <select value={filter} onChange={(event) => setFilter(event.target.value as PurchaseFilter)}
                  className="ui-field">
                  {filters.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            {!purchaseRows.length && <Card><p className="text-sm text-[var(--text-secondary)]">No purchase orders match this filter.</p></Card>}
            {purchaseRows.map((po) => {
              const legacyPayable = !po.lines?.length && supplierPayables.some((item) => item.poNumber === po.poNumber || item.purchaseOrderId === po.id || item.poId === po.id);
              const bulk = po.purpose === 'Bulk Stock Procurement' && Boolean(po.lines?.length);
              const allowReceive = receivingStages.includes(po.stage) && !legacyPayable && !po.goodsCollected &&
                (can('inventory.receive') || (!bulk && (canCreate || can('procurement.approve'))));
              const canAdvance = (po.stage === 'Purchase Request' && canCreate) || (po.stage === 'Pending Approval' && can('procurement.approve'));
              const canClose = can('procurement.approve') && Boolean(po.lines?.length) && ['PO Issued', 'Partially Received'].includes(po.stage);
              const receiptLines = getPurchaseReceiptBalance(po);
              return (
                <Card key={po.id} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{po.poNumber} · {po.supplierName}</h3>
                        <StatusBadge status={legacyPayable && po.stage !== 'Pending Approval' ? 'Collection recorded' : po.stage} />
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {po.customerOrderNumber ? `Customer order ${po.customerOrderNumber}` : po.warehouseName} · Expected {po.expectedDate}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--text-secondary)]">
                      <p>Quoted total <strong className="ml-1 text-[var(--text-primary)]">{formatKes(po.totalKes)}</strong></p>
                      {po.actualPurchaseCostKes !== undefined && <p>Received value {formatKes(po.actualPurchaseCostKes)}</p>}
                    </div>
                  </div>
                  {receiptLines.length ? <ul className="space-y-1 text-sm">
                    {receiptLines.map(({ id, line, collected }) => <li key={id}>
                      {line.productName} <span className="text-[var(--text-secondary)]">· {collected.toLocaleString()} / {line.quantity.toLocaleString()} {line.unit} received</span>
                    </li>)}
                  </ul> : <p className="text-sm">{po.itemsSummary}</p>}
                  {Boolean(po.receipts?.length) && <details className="border-t border-[var(--border-subtle)] pt-2 text-sm">
                    <summary className="cursor-pointer py-2 font-semibold">Receipt history ({po.receipts!.length})</summary>
                    <ul className="space-y-3 text-[var(--text-secondary)]">
                      {po.receipts!.map((receipt) => (
                        <li key={receipt.id}>
                          <p className="font-medium text-[var(--text-primary)]">{receipt.receivedAt} · {formatKes(receipt.totalKes)}{receipt.receiptRef ? ` · ${receipt.receiptRef}` : ''}</p>
                          {(receipt.receivedBy || receipt.supplierInvoiceRef) && <p>
                            {[receipt.receivedBy, receipt.supplierInvoiceRef && `Invoice ${receipt.supplierInvoiceRef}`].filter(Boolean).join(' · ')}
                          </p>}
                          {receipt.lines.length > 0 && <ul className="mt-1 space-y-1 pl-3">
                            {receipt.lines.map((entry) => {
                              const purchased = receiptLines.find(({ id }) => id === entry.lineId)?.line;
                              return <li key={entry.lineId}>{purchased?.productName} · {entry.quantity.toLocaleString()} {purchased?.unit} at {formatKes(entry.unitCostKes)} per unit</li>;
                            })}
                          </ul>}
                        </li>
                      ))}
                    </ul>
                  </details>}
                  {po.closureReason && <p className="text-sm text-[var(--text-secondary)]">Closed balance · {po.closureReason}</p>}
                  {(canAdvance || allowReceive || canClose) && <div className="flex flex-wrap gap-2 pt-1">
                    {canAdvance && <button type="button" className={purchaseSecondaryButton} disabled={Boolean(advancing)} onClick={() => void advance(po.id)}>
                      {advancing === po.id ? 'Updating…' : po.stage === 'Pending Approval' ? 'Approve and issue' : 'Request approval'}
                    </button>}
                    {allowReceive && <button type="button" className={purchaseButton} onClick={() => setReceiptPoId(po.id)}>
                      <PackageCheck size={17} aria-hidden="true" /> {bulk ? 'Receive into stock' : 'Record collection'}
                    </button>}
                    {canClose && <button type="button" className={purchaseSecondaryButton} onClick={() => setClosingPoId(po.id)}>Close balance</button>}
                  </div>}
                </Card>
              );
            })}
          </section>
        </>
      )}

      {formOrder !== null && <NewPurchaseForm key={formOrder} orderId={formOrder} onClose={closeNewPurchase} onSaved={(message) => {
        closeNewPurchase();
        setShowSuppliers(false);
        setFilter('all');
        setFeedback({ message, type: 'success' });
      }} />}
      {receiptPo && <PurchaseReceiptForm key={receiptPo.id} po={receiptPo} onClose={() => setReceiptPoId('')} onSaved={(message) => {
        setReceiptPoId('');
        setFeedback({ message, type: 'success' });
      }} />}
      {closingPo && <ClosePurchaseForm key={closingPo.id} po={closingPo} onClose={() => setClosingPoId('')} onSaved={(message) => {
        setClosingPoId('');
        setFeedback({ message, type: 'success' });
      }} />}
    </div>
  );
}

export default function ProcurementPage() {
  return <Suspense fallback={<p className="p-8 text-center text-sm text-[var(--text-secondary)]">Loading procurement…</p>}>
    <ProcurementContent />
  </Suspense>;
}

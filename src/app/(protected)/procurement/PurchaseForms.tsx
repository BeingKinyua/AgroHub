'use client';

import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '@/components/ui/primitives';
import { useBos } from '@/lib/services/bos-context';
import { isSupplierEligibleForPurchasing } from '@/lib/services/business-rules';
import { getOrderSourcingLines, getPurchaseReceiptBalance, getSupplierDueDate } from '@/lib/services/procurement-rules';
import { canSourceCatalogProduct } from '@/lib/services/supplier-offerings';
import type { ProcurementOrderRecord } from '@/types/domain/bos';

const control = 'ui-field mt-1.5 w-full';
export const purchaseButton = 'ui-button ui-button-primary';
export const purchaseSecondaryButton = 'ui-button ui-button-secondary';
export const formatKes = (total: number) => `KES ${total.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

function todayInKenya() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function FormFooter({ pending, error, onClose, action }: {
  pending: boolean;
  error: string;
  onClose: () => void;
  action: string;
}) {
  return (
    <>
      {error && <p role="alert" className="rounded-lg bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
        <button type="button" onClick={onClose} disabled={pending} className={purchaseSecondaryButton}>Cancel</button>
        <button type="submit" disabled={pending} className={purchaseButton}>{pending ? 'Saving…' : action}</button>
      </div>
    </>
  );
}

type FormProps = { onClose: () => void; onSaved: (message: string) => void };
type PurchaseDraft = { id: number; selection: string; quantity: string; quote: string };
const newPurchaseLine = (id: number): PurchaseDraft => ({ id, selection: '', quantity: '', quote: '' });

export function NewPurchaseForm({ orderId, onClose, onSaved }: FormProps & { orderId: string }) {
  const { createPurchaseOrder, orders, procurementOrders, products, suppliers, warehouses } = useBos();
  const [purpose, setPurpose] = useState<NonNullable<ProcurementOrderRecord['purpose']>>('Direct Customer Fulfillment');
  const [selectedOrder, setSelectedOrder] = useState(orderId);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(todayInKenya);
  const [draft, setDraft] = useState([newPurchaseLine(1)]);
  const [nextLine, setNextLine] = useState(2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const direct = purpose === 'Direct Customer Fulfillment';
  const demandOrders = orders.filter((order) => ['Confirmed', 'Picking', 'Partially Fulfilled'].includes(order.status))
    .map((order) => ({ order, lines: getOrderSourcingLines(order, procurementOrders).filter((line) => line.uncommitted > 0) }))
    .filter(({ lines }) => lines.length > 0);
  const demand = demandOrders.find(({ order }) => order.id === selectedOrder)?.lines ?? [];
  const offeringsFor = (supplierId: string) => suppliers.find((supplier) => supplier.id === supplierId)?.suppliedProducts
    .filter((offering) => offering.availability !== 'Unavailable' && products.some((product) =>
      product.id === offering.productId && canSourceCatalogProduct(product) && product.unit === offering.unit)) ?? [];
  const eligibleSuppliers = suppliers.filter((supplier) => isSupplierEligibleForPurchasing(supplier).eligible &&
    offeringsFor(supplier.id).some((offering) => !direct || demand.some(({ item }) => item.productId === offering.productId && item.unit === offering.unit)));
  const offerings = offeringsFor(supplierId);
  const choices = direct
    ? demand.flatMap(({ id, item, uncommitted }) => {
        const offering = offerings.find((candidate) => candidate.productId === item.productId && candidate.unit === item.unit);
        return offering ? [{ id, offering, label: `${item.productName} · ${uncommitted.toLocaleString()} ${item.unit} to source`, limit: uncommitted }] : [];
      })
    : offerings.map((offering) => ({ id: offering.productId, offering, label: offering.productName, limit: undefined }));
  const total = draft.reduce((sum, item) => sum + Math.round(Number(item.quantity) * Number(item.quote) * 100) / 100, 0);

  function updateLine(id: number, update: Partial<PurchaseDraft>) {
    setDraft((items) => items.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await createPurchaseOrder({
        purpose, supplierId, warehouseId, customerOrderId: direct ? selectedOrder : undefined, expectedDate: date,
        lines: draft.map((item) => ({
          productId: choices.find((choice) => choice.id === item.selection)?.offering.productId ?? '',
          customerOrderLineId: direct ? item.selection : undefined,
          quantity: Number(item.quantity), unitCostKes: Number(item.quote),
        })),
      });
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="2xl" title="New purchase request" hasUnsavedChanges={dirty && !pending}
      allowBackdropClose={false} allowEscapeClose={!pending}>
      <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-5 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ui-label">Purchase destination
            <select value={purpose} onChange={(event) => {
              setPurpose(event.target.value as typeof purpose);
              setSupplierId('');
              setDraft([newPurchaseLine(1)]);
            }} className={control}>
              <option value="Direct Customer Fulfillment">Direct to a customer order</option>
              <option value="Bulk Stock Procurement">Receive into warehouse stock</option>
            </select>
          </label>
          {direct ? (
            <label className="ui-label">Customer order
              <select value={selectedOrder} onChange={(event) => {
                setSelectedOrder(event.target.value);
                setSupplierId('');
                setDraft([newPurchaseLine(1)]);
              }} required className={control}>
                <option value="">Select an order with sourcing demand</option>
                {demandOrders.map(({ order }) => <option key={order.id} value={order.id}>{order.orderNumber} · {order.customerName}</option>)}
              </select>
            </label>
          ) : (
            <label className="ui-label">Receiving warehouse
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required className={control}>
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
          )}
          <label className="ui-label">Supplier
            <select value={supplierId} onChange={(event) => {
              setSupplierId(event.target.value);
              setDraft([newPurchaseLine(1)]);
            }} required className={control}>
              <option value="">Select supplier</option>
              {eligibleSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label className="ui-label">Expected {direct ? 'collection' : 'receipt'} date
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={control} />
          </label>
        </div>
        {eligibleSuppliers.length === 0 && (!direct || selectedOrder) && (
          <p className="text-[var(--text-secondary)]">No eligible supplier currently offers the products for this purchase.</p>
        )}
        {supplierId && (
          <fieldset className="space-y-3">
            <legend className="mb-2 font-heading text-base font-semibold">Purchase lines</legend>
            {draft.map((item, index) => {
              const selected = choices.find((choice) => choice.id === item.selection);
              const minimum = selected?.offering.moq ?? selected?.offering.minOrderQty;
              return (
                <div key={item.id} className="grid items-start gap-3 rounded-xl border border-[var(--border-subtle)] p-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
                  <label className="ui-label">Product
                    <select value={item.selection} required onChange={(event) => {
                      const choice = choices.find((candidate) => candidate.id === event.target.value);
                      updateLine(item.id, { selection: event.target.value, quantity: '', quote: choice ? String(choice.offering.currentCostKes || '') : '' });
                    }} className={control}>
                      <option value="">Select product</option>
                      {choices.map((choice) => (
                        <option key={choice.id} value={choice.id} disabled={draft.some((other) => other.id !== item.id && other.selection === choice.id)}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                    {Boolean(minimum) && <span className="mt-1 block text-xs text-[var(--text-secondary)]">Supplier minimum {minimum} {selected?.offering.unit}</span>}
                  </label>
                  <label className="ui-label">Quantity {selected && `(${selected.offering.unit})`}
                    <input type="number" inputMode="decimal" required min="0.001" step="any" max={selected?.limit} value={item.quantity}
                      onChange={(event) => updateLine(item.id, { quantity: event.target.value })} className={control} />
                  </label>
                  <label className="ui-label">Quote per unit (KES)
                    <input type="number" inputMode="decimal" required min="0.01" step="0.01" value={item.quote}
                      onChange={(event) => updateLine(item.id, { quote: event.target.value })} className={control} />
                  </label>
                  <button type="button" aria-label={`Remove purchase line ${index + 1}`} disabled={draft.length === 1}
                    className="ui-button ui-button-secondary ui-button-icon sm:mt-6" onClick={() => {
                      setDirty(true);
                      setDraft((items) => items.filter((line) => line.id !== item.id));
                    }}><X size={17} aria-hidden="true" /></button>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" className={purchaseSecondaryButton} disabled={draft.length >= choices.length} onClick={() => {
                setDraft([...draft, newPurchaseLine(nextLine)]);
                setNextLine(nextLine + 1);
                setDirty(true);
              }}><Plus size={16} aria-hidden="true" /> Add purchase line</button>
              <p className="text-[var(--text-secondary)]">Quoted total <strong className="ml-2 text-lg text-[var(--text-primary)]">{formatKes(total)}</strong></p>
            </div>
          </fieldset>
        )}
        <FormFooter pending={pending} error={error} onClose={onClose} action="Create purchase request" />
      </form>
    </Modal>
  );
}

type ReceiptDraft = { quantity?: string; cost?: string; expiry?: string };

export function PurchaseReceiptForm({ po, onClose, onSaved }: FormProps & { po: ProcurementOrderRecord }) {
  const { can, confirmPurchaseAndCollection, products, suppliers } = useBos();
  const [receiptId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState<Record<string, ReceiptDraft>>({});
  const [legacyAmount, setLegacyAmount] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState<'' | 'Cash' | 'M-Pesa Business'>('');
  const [paid, setPaid] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const structured = Boolean(po.lines?.length);
  const bulk = po.purpose === 'Bulk Stock Procurement' && structured;
  const terms = po.paymentTerms ?? suppliers.find((supplier) => supplier.id === po.supplierId)?.paymentTerms ?? '';
  const calculatedDueDate = getSupplierDueDate(todayInKenya(), terms);
  const selected = Object.entries(draft).flatMap(([lineId, line]) => line.quantity ? [{
    lineId, quantity: Number(line.quantity), unitCostKes: Number(line.cost), expiryDate: line.expiry || undefined,
  }] : []).filter((line) => line.quantity !== 0);
  const amount = structured ? selected.reduce((sum, line) => sum + (Math.round(line.quantity * line.unitCostKes * 100) || 0) / 100, 0) : Number(legacyAmount);

  function updateLine(id: string, update: ReceiptDraft) {
    setDraft((current) => ({ ...current, [id]: { ...current[id], ...update } }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await confirmPurchaseAndCollection({
        poId: po.id, receiptId, lines: selected,
        legacyCostKes: structured ? undefined : Number(legacyAmount),
        receiptRef, supplierInvoiceRef: invoiceRef, dueDate,
        settlement: method ? { method, amountKes: Number(paid), reference: paymentRef } : undefined,
      });
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="2xl" title={bulk ? 'Receive into stock' : 'Record goods collection'}
      subtitle={`${po.poNumber} · ${po.supplierName}`} hasUnsavedChanges={dirty && !pending}
      allowBackdropClose={false} allowEscapeClose={!pending}>
      <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-5 text-sm">
        {structured ? (
          <fieldset className="space-y-3">
            <legend className="mb-1 font-heading text-base font-semibold">Quantities accepted</legend>
            <p className="text-[var(--text-secondary)]">Enter the goods accepted in this receipt. Leave other lines blank for a later receipt.</p>
            {getPurchaseReceiptBalance(po).filter(({ outstanding }) => outstanding > 0).map(({ id, line, outstanding }) => {
              const needsExpiry = bulk && Boolean(products.find((product) => product.id === line.productId)?.expiryTracked);
              const hasQuantity = Number(draft[id]?.quantity) > 0;
              return (
                <div key={id} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <p className="font-semibold">{line.productName} · {line.sku}</p>
                  <p className="mt-1 text-[var(--text-secondary)]">{outstanding.toLocaleString()} {line.unit} remaining · Quoted {formatKes(line.unitCostKes)} per unit</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="ui-label">Accepted quantity ({line.unit})
                      <input type="number" inputMode="decimal" step="any" min="0" max={outstanding} value={draft[id]?.quantity ?? ''}
                        onChange={(event) => updateLine(id, { quantity: event.target.value })} className={control} />
                    </label>
                    <label className="ui-label">Actual cost per unit (KES)
                      <input type="number" inputMode="decimal" step="0.01" min="0.01" required={hasQuantity} value={draft[id]?.cost ?? ''}
                        onChange={(event) => updateLine(id, { cost: event.target.value })} className={control} />
                    </label>
                    {needsExpiry && <label className="ui-label">Batch expiry date
                      <input type="date" min={todayInKenya()} required={hasQuantity} value={draft[id]?.expiry ?? ''}
                        onChange={(event) => updateLine(id, { expiry: event.target.value })} className={control} />
                    </label>}
                  </div>
                </div>
              );
            })}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <p className="text-[var(--text-secondary)]">This legacy PO has a text summary. Its collection records the confirmed amount and supplier payable.</p>
            <p className="font-semibold">{po.itemsSummary}</p>
            <label className="ui-label block">Actual purchase amount (KES)
              <input type="number" required min="0.01" step="0.01" inputMode="decimal" value={legacyAmount}
                onChange={(event) => setLegacyAmount(event.target.value)} className={control} />
            </label>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ui-label">Receipt or delivery note (optional)
            <input value={receiptRef} onChange={(event) => setReceiptRef(event.target.value)} className={control} />
          </label>
          <label className="ui-label">Supplier invoice number (optional)
            <input value={invoiceRef} onChange={(event) => setInvoiceRef(event.target.value)} className={control} />
          </label>
          {calculatedDueDate ? <p className="self-center text-[var(--text-secondary)]">{terms} · Due {calculatedDueDate}</p> : (
            <label className="ui-label">Agreed payment due date
              <input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={control} />
            </label>
          )}
          {can('finance.record_payment') && <label className="ui-label">Payment already made
            <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className={control}>
              <option value="">None</option><option value="Cash">Cash</option><option value="M-Pesa Business">M-Pesa</option>
            </select>
          </label>}
          {method && <>
            <label className="ui-label">Amount paid (KES)
              <input type="number" min="0.01" max={amount} step="0.01" inputMode="decimal" required value={paid}
                onChange={(event) => setPaid(event.target.value)} className={control} />
            </label>
            <label className="ui-label">Payment reference
              <input required value={paymentRef} onChange={(event) => setPaymentRef(event.target.value)} className={control} />
            </label>
          </>}
        </div>
        <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-[var(--bg-canvas)] p-3">
          <p>Receipt total <strong className="ml-2 font-mono-tabular">{formatKes(amount)}</strong></p>
          <p>Due to supplier <strong className="ml-2 font-mono-tabular">{formatKes(Math.max(0, amount - (method ? Number(paid) : 0)))}</strong></p>
        </div>
        <FormFooter pending={pending} error={error} onClose={onClose} action={bulk ? 'Post warehouse receipt' : 'Record collection'} />
      </form>
    </Modal>
  );
}

export function ClosePurchaseForm({ po, onClose, onSaved }: FormProps & { po: ProcurementOrderRecord }) {
  const { closePurchaseBalance } = useBos();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await closePurchaseBalance(po.id, reason);
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="md" title="Close remaining purchase quantities" subtitle={po.poNumber}
      allowBackdropClose={false} allowEscapeClose={!pending}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <p className="text-[var(--text-secondary)]">This ends receiving for this purchase order and releases its unreceived quantities for a new purchase.</p>
        <label className="ui-label block">Reason for closing
          <textarea rows={3} required value={reason} onChange={(event) => setReason(event.target.value)}
            className="ui-field mt-1.5 w-full" />
        </label>
        <FormFooter pending={pending} error={error} onClose={onClose} action="Close remaining quantities" />
      </form>
    </Modal>
  );
}

'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/primitives';
import { useBos } from '@/lib/services/bos-context';
import { canSourceCatalogProduct, type SupplierOfferingInput } from '@/lib/services/supplier-offerings';
import type { SupplierRecord, UnitOfMeasure } from '@/types/domain/bos';

const categories = [
  'Fresh Vegetables & Tubers', 'Dry Grains & Cereals', 'Fruits & Orchard',
  'Leafy Greens', 'Dairy & Cold Chain', 'Herbs & Spices',
];
const paymentTerms = ['Net 7', 'Net 14', 'Net 30', 'COD / M-Pesa'];

const fieldClass = 'mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-base text-[var(--text-primary)] sm:text-sm';
const sectionClass = 'space-y-4 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 text-sm font-semibold transition-colors hover:bg-[var(--bg-canvas)] disabled:opacity-60 not-disabled:cursor-pointer';

interface OfferingDraft {
  key: number;
  productId: string;
  unit: UnitOfMeasure | '';
  quote: string;
  minOrder: string;
  leadTime: string;
  availability: NonNullable<SupplierOfferingInput['availability']>;
  preferred: boolean;
  notes: string;
  quoteReason: string;
}

function optionsWithCurrent(options: string[], value?: string) {
  return value && !options.includes(value) ? [...options, value] : options;
}

export function SupplierForm({ supplier, onClose, onSaved }: {
  supplier?: SupplierRecord;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { products, createSupplier, updateSupplier } = useBos();
  const [offerings, setOfferings] = useState<OfferingDraft[]>(() => (supplier?.suppliedProducts ?? []).map((offering, key) => ({
    key,
    productId: offering.productId,
    unit: offering.unit,
    quote: String(offering.currentCostKes),
    minOrder: String(offering.minOrderQty ?? offering.moq ?? 1),
    leadTime: offering.leadTimeDays === undefined ? '' : String(offering.leadTimeDays),
    availability: offering.availability ?? 'Available',
    preferred: offering.preferredSupplier ?? false,
    notes: offering.notes ?? '',
    quoteReason: '',
  })));
  const nextKey = useRef(offerings.length);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [offeringsDirty, setOfferingsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sourceableProducts = products.filter(canSourceCatalogProduct);

  const addOffering = () => {
    const key = nextKey.current++;
    setOfferings((rows) => [...rows, {
      key, productId: '', unit: '', quote: '', minOrder: '1', leadTime: '',
      availability: 'Available', preferred: false, notes: '', quoteReason: '',
    }]);
    setOfferingsDirty(true);
  };

  const updateOffering = (key: number, change: Partial<OfferingDraft>) => {
    setOfferings((rows) => rows.map((row) => row.key === key ? { ...row, ...change } : row));
    setOfferingsDirty(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? '').trim();
    const leadTimeDays = Number(value('leadTimeDays'));
    const suppliedProducts: SupplierOfferingInput[] = [];
    for (const row of offerings) {
      if (!row.productId || !row.unit) {
        setError('Select a catalogue product for each offering.');
        return;
      }
      suppliedProducts.push({
        productId: row.productId,
        unit: row.unit,
        currentCostKes: Number(row.quote),
        minOrderQty: Number(row.minOrder),
        leadTimeDays: row.leadTime ? Number(row.leadTime) : leadTimeDays,
        availability: row.availability,
        preferredSupplier: row.preferred,
        notes: row.notes.trim(),
        quoteReason: row.quoteReason,
      });
    }
    const details = {
      name: value('name'), category: value('category'), region: value('region'),
      contactPerson: value('contactPerson'), phone: value('phone'), email: value('email'),
      leadTimeDays, paymentTerms: value('paymentTerms'), paymentDetails: value('paymentDetails'),
    };

    setSaving(true);
    try {
      const result = supplier
        ? await updateSupplier(supplier.id, { ...details, ...(offeringsDirty && { suppliedProducts }) })
        : await createSupplier({ ...details, suppliedProducts });
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } catch {
      setError('Unable to save the supplier. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => { if (!saving) onClose(); }}
      size="2xl"
      title={supplier ? `Edit ${supplier.name}` : 'New supplier'}
      subtitle={supplier ? undefined : 'New suppliers require approval before they can receive a purchase order.'}
      hasUnsavedChanges={!saving && (detailsDirty || offeringsDirty)}
      allowEscapeClose={!saving}
      allowBackdropClose={!saving}
    >
      <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
        <fieldset className={sectionClass} onChange={() => setDetailsDirty(true)}>
          <legend className="px-2 font-heading text-base font-semibold">Supplier details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Supplier name<input className={fieldClass} name="name" defaultValue={supplier?.name} required /></label>
            <label>
              Category
              <select className={fieldClass} name="category" defaultValue={supplier?.category ?? ''} required>
                <option value="" disabled>Select a category</option>
                {optionsWithCurrent(categories, supplier?.category).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>County or region<input className={fieldClass} name="region" defaultValue={supplier?.region} required /></label>
            <label>Contact person<input className={fieldClass} name="contactPerson" defaultValue={supplier?.contactPerson} required /></label>
            <label>Phone<input className={fieldClass} name="phone" type="tel" defaultValue={supplier?.phone} required /></label>
            <label>Email <span className="text-[var(--text-secondary)]">(optional)</span><input className={fieldClass} name="email" type="email" defaultValue={supplier?.email} /></label>
          </div>
        </fieldset>

        <fieldset className={sectionClass}>
          <legend className="px-2 font-heading text-base font-semibold">Products supplied</legend>
          {offerings.length === 0 && <p className="text-[var(--text-secondary)]">No products are linked to this supplier.</p>}
          {offerings.map((row, index) => {
            const selected = products.find((product) => product.id === row.productId);
            const previous = supplier?.suppliedProducts.find((offering) => offering.productId === row.productId);
            const quoteChanged = previous && (Number(row.quote) !== previous.currentCostKes || row.unit !== previous.unit);
            const eligibleProducts = selected && !canSourceCatalogProduct(selected)
              ? [...sourceableProducts, selected]
              : sourceableProducts;
            return (
              <fieldset key={row.key} className="space-y-3 rounded-lg bg-[var(--bg-canvas)] p-3 sm:p-4">
                <legend className="sr-only">Offering {index + 1}</legend>
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    Catalogue product
                    <select className={fieldClass} required value={row.productId} onChange={(event) => {
                      const product = products.find((item) => item.id === event.target.value);
                      updateOffering(row.key, { productId: product?.id ?? '', unit: product?.unit ?? '', quote: '', quoteReason: '' });
                    }}>
                      <option value="" disabled>Select a product</option>
                      {!selected && row.productId && <option value={row.productId}>{previous?.productName ?? row.productId} (unavailable)</option>}
                      {eligibleProducts.map((product) => (
                        <option key={product.id} value={product.id} disabled={offerings.some((other) => other.key !== row.key && other.productId === product.id)}>
                          {product.name} · {product.sku}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-red-700 dark:hover:text-red-300"
                    type="button" aria-label={`Remove ${selected?.name ?? `offering ${index + 1}`}`}
                    onClick={() => { setOfferings((rows) => rows.filter((item) => item.key !== row.key)); setOfferingsDirty(true); }}
                  >
                    <Trash2 aria-hidden="true" className="mx-auto h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <label>
                    Supplier quote (KES)
                    <input className={fieldClass} type="number" min="0.01" step="0.01" inputMode="decimal" required value={row.quote} onChange={(event) => updateOffering(row.key, { quote: event.target.value })} />
                  </label>
                  <label>
                    Unit
                    {selected && previous && previous.unit !== selected.unit ? (
                      <select className={fieldClass} value={row.unit} onChange={(event) => updateOffering(row.key, { unit: event.target.value as UnitOfMeasure, quote: '' })}>
                        <option value={previous.unit}>{previous.unit} (previous)</option>
                        <option value={selected.unit}>{selected.unit}</option>
                      </select>
                    ) : <input className={fieldClass} value={row.unit} placeholder="From catalogue" readOnly />}
                  </label>
                  <label>Minimum order quantity<input className={fieldClass} type="number" min="0.001" step="0.001" inputMode="decimal" required value={row.minOrder} onChange={(event) => updateOffering(row.key, { minOrder: event.target.value })} /></label>
                  <label>Lead time in days<input className={fieldClass} type="number" min="0" step="1" placeholder="Supplier default" value={row.leadTime} onChange={(event) => updateOffering(row.key, { leadTime: event.target.value })} /></label>
                  <label>
                    Availability
                    <select className={fieldClass} value={row.availability} onChange={(event) => updateOffering(row.key, { availability: event.target.value as OfferingDraft['availability'] })}>
                      <option>Available</option><option>Seasonal</option><option>Unavailable</option>
                    </select>
                  </label>
                  <label className="flex min-h-11 items-center gap-2 self-end lg:col-span-2">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--brand-accent)]" checked={row.preferred} onChange={(event) => updateOffering(row.key, { preferred: event.target.checked })} />
                    Preferred supplier for this product
                  </label>
                  <label className="col-span-full">Offering notes<input className={fieldClass} value={row.notes} onChange={(event) => updateOffering(row.key, { notes: event.target.value })} /></label>
                  {quoteChanged && <label className="col-span-full">Reason for quote change <span className="text-[var(--text-secondary)]">(optional)</span><input className={fieldClass} value={row.quoteReason} onChange={(event) => updateOffering(row.key, { quoteReason: event.target.value })} /></label>}
                </div>
              </fieldset>
            );
          })}
          <button className={buttonClass} type="button" onClick={addOffering} disabled={sourceableProducts.length === 0}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Add product
          </button>
          {sourceableProducts.length === 0 && <p className="text-[var(--text-secondary)]">Add a product to the catalogue before linking a supplier quote.</p>}
        </fieldset>

        <fieldset className={sectionClass} onChange={() => setDetailsDirty(true)}>
          <legend className="px-2 font-heading text-base font-semibold">Commercial terms</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Default lead time in days<input className={fieldClass} name="leadTimeDays" type="number" min="0" step="1" required defaultValue={supplier?.leadTimeDays ?? 1} /></label>
            <label>
              Payment terms
              <select className={fieldClass} name="paymentTerms" defaultValue={supplier?.paymentTerms ?? 'Net 14'} required>
                {optionsWithCurrent(paymentTerms, supplier?.paymentTerms).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2">Settlement instructions <span className="text-[var(--text-secondary)]">(optional)</span><textarea className={fieldClass} rows={2} name="paymentDetails" defaultValue={supplier?.paymentDetails} /></label>
          </div>
        </fieldset>

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] py-3">
          {error && <p className="w-full text-red-700 dark:text-red-300" role="alert">{error}</p>}
          <button className="min-h-11 cursor-pointer rounded-lg bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#08190C]" type="submit" disabled={saving}>
            {saving ? 'Saving…' : supplier ? 'Save changes' : 'Create supplier'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

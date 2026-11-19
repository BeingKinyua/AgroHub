import type { ProductRecord, SupplierProductItem, SupplierQuoteEvent } from '../../types/domain/bos';

export type SupplierOfferingInput = Pick<SupplierProductItem, 'productId' | 'unit' | 'currentCostKes'> &
  Partial<Pick<SupplierProductItem, 'productName' | 'leadTimeDays' | 'moq' | 'minOrderQty' | 'availability' | 'preferredSupplier' | 'notes'>> &
  { quoteReason?: string };

type CatalogProduct = Pick<ProductRecord, 'id' | 'name' | 'unit' | 'status'>;

interface OfferingOptions {
  supplierId: string;
  leadTimeDays: number;
  catalog: readonly CatalogProduct[];
  existing?: readonly SupplierProductItem[];
  retired?: readonly SupplierProductItem[];
  recordedAt: string;
  recordedBy?: string;
  reason?: string;
}

export function identifySupplierOffering(supplierId: string, offering: SupplierProductItem): SupplierProductItem {
  if (offering.id && offering.id !== offering.productId) return offering;
  return { ...offering, id: `SPI:${encodeURIComponent(supplierId)}:${encodeURIComponent(offering.productId)}` };
}

export function canSourceCatalogProduct(product: CatalogProduct) {
  return product.status !== 'Archived' && product.status !== 'Discontinued';
}

export function getSupplierQuoteHistory(offering: SupplierProductItem): SupplierQuoteEvent[] {
  if (offering.quoteHistory) return offering.quoteHistory;

  const history: SupplierQuoteEvent[] = [];
  if (offering.previousCostKes !== undefined && offering.previousCostKes !== offering.currentCostKes) {
    history.push({ priceKes: offering.previousCostKes, unit: offering.unit });
  }
  history.push({
    recordedAt: offering.lastPriceUpdate ?? offering.lastUpdated,
    priceKes: offering.currentCostKes,
    unit: offering.unit,
    reason: offering.priceChangeReason,
  });
  return history;
}

export function reconcileSupplierOfferings(
  drafts: readonly SupplierOfferingInput[],
  { supplierId, leadTimeDays, catalog, existing = [], retired = [], recordedAt, recordedBy, reason }: OfferingOptions
): { ok: true; offerings: SupplierProductItem[]; retired: SupplierProductItem[] } | { ok: false; message: string } {
  const products = new Map(catalog.map((product) => [product.id, product]));
  const currentOfferings = new Map(existing.map((offering) => [offering.productId, offering]));
  const pastOfferings = new Map(retired.map((offering) => [offering.productId, offering]));
  const offerings = new Map<string, SupplierProductItem>();
  const date = recordedAt.slice(0, 10);

  for (const [index, draft] of drafts.entries()) {
    const product = products.get(draft.productId);
    const current = currentOfferings.get(draft.productId);
    const prior = current ?? pastOfferings.get(draft.productId);
    if (!product) return { ok: false, message: `Choose a catalogue product for offering ${index + 1}.` };
    if (!current && !canSourceCatalogProduct(product)) {
      return { ok: false, message: `${product.name} is ${product.status.toLowerCase()} and cannot be added.` };
    }
    if (offerings.has(product.id)) return { ok: false, message: `${product.name} is already listed for this supplier.` };

    const quoteChanged = !prior || prior.currentCostKes !== draft.currentCostKes || prior.unit !== draft.unit;
    // Existing quotes may predate changes to the catalogue unit. A new quote must use the current unit.
    if (draft.unit !== product.unit && (!current || quoteChanged)) {
      return { ok: false, message: `Use ${product.unit} as the unit for ${product.name}.` };
    }
    if (!Number.isFinite(draft.currentCostKes) || draft.currentCostKes <= 0) {
      return { ok: false, message: `Enter a positive supplier quote for ${product.name}.` };
    }
    const minOrderQty = draft.minOrderQty ?? draft.moq ?? prior?.minOrderQty ?? prior?.moq ?? 1;
    if (!Number.isFinite(minOrderQty) || minOrderQty <= 0) {
      return { ok: false, message: `Enter a positive minimum order quantity for ${product.name}.` };
    }
    const offeringLeadDays = draft.leadTimeDays ?? prior?.leadTimeDays ?? leadTimeDays;
    if (!Number.isSafeInteger(offeringLeadDays) || offeringLeadDays < 0) {
      return { ok: false, message: `Enter a whole, nonnegative lead time for ${product.name}.` };
    }

    const priorDate = prior?.lastPriceUpdate ?? prior?.lastUpdated;
    const quoteReason = draft.quoteReason?.trim() || reason;
    const history = prior ? getSupplierQuoteHistory(prior) : [];
    const offering: SupplierProductItem = {
      ...prior,
      productId: product.id,
      productName: draft.unit === product.unit ? product.name : current?.productName ?? product.name,
      unit: draft.unit,
      currentCostKes: draft.currentCostKes,
      priceKes: draft.currentCostKes,
      previousCostKes: quoteChanged ? prior?.currentCostKes ?? draft.currentCostKes : prior.previousCostKes,
      lastUpdated: quoteChanged ? date : prior.lastUpdated,
      lastPriceUpdate: quoteChanged ? date : priorDate,
      priceChangeReason: quoteChanged ? quoteReason : prior.priceChangeReason,
      quoteHistory: quoteChanged ? [...history, { recordedAt, recordedBy, priceKes: draft.currentCostKes, unit: draft.unit, reason: quoteReason }] : history,
      leadTimeDays: offeringLeadDays,
      moq: minOrderQty,
      minOrderQty,
      availability: draft.availability ?? prior?.availability ?? 'Available',
      preferredSupplier: draft.preferredSupplier ?? prior?.preferredSupplier ?? false,
      notes: draft.notes ?? prior?.notes,
    };
    offerings.set(product.id, identifySupplierOffering(supplierId, offering));
  }

  for (const [productId, offering] of currentOfferings) pastOfferings.set(productId, offering);
  return {
    ok: true,
    offerings: [...offerings.values()],
    retired: [...pastOfferings.values()]
      .filter((offering) => !offerings.has(offering.productId))
      .map((offering) => identifySupplierOffering(supplierId, offering)),
  };
}

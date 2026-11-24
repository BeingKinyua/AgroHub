'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Filter,
  Plus,
  Search,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { getOrderSourcingLines } from '@/lib/services/procurement-rules';
import {
  ActionableMetricCard,
  Card,
  EmptyState,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  ResilientImage,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { IMAGE_PATHS } from '@/lib/services/initial-data';
import { StockMovementRecord } from '@/types/domain/bos';
import { ModuleChart } from '@/components/ui/ModuleChart';

function InventoryContent() {
  const searchParams = useSearchParams();
  const {
    products,
    warehouses,
    stockBatches,
    stockMovements,
    orders,
    procurementOrders,
    can,
    recordStockMovement,
  } = useBos();

  const [activeTab, setActiveTab] = useState<'direct-flow' | 'batches' | 'products' | 'movements' | 'warehouses'>('direct-flow');
  const [batchFilter, setBatchFilter] = useState<'all' | 'at-risk' | 'expiring'>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [batchId, setBatchId] = useState(stockBatches[0]?.id || '');
  const [movType, setMovType] = useState<StockMovementRecord['type']>('Adjustment');
  const [qtyDelta, setQtyDelta] = useState(-10);
  const [reason, setReason] = useState('');
  const [toLocation, setToLocation] = useState('Westlands Cross-Dock C');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Read search parameters for drill-down support (Section 14 & 23)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const tabParam = searchParams.get('tab');

    if (filterParam === 'expiring' || filterParam === 'at-risk') {
      setActiveTab('batches');
      setBatchFilter(filterParam);
    }

    if (tabParam === 'warehouses' || tabParam === 'movements' || tabParam === 'products') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Top Summary metrics (Section 23: Available, Reserved, Incoming, Low Stock, Expiring)
  const availableSkus = products.filter((product) => product.availableQty > 0).length;
  const reservedSkus = products.filter((product) => product.reservedQty > 0).length;
  const inboundPurchaseOrders = procurementOrders.filter((po) => po.purpose === 'Bulk Stock Procurement' &&
    ['PO Issued', 'Receiving (GRN)', 'Quality Check', 'Partially Received'].includes(po.stage));
  const goodsFlow = orders.filter((order) => order.status !== 'Cancelled' && order.status !== 'Draft')
    .flatMap((order) => getOrderSourcingLines(order, procurementOrders)
      .filter((line) => line.directRequired > 0).map((line) => ({ order, ...line })));
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.availableQty < p.reorderPoint),
    [products]
  );
  const expiringBatches = useMemo(
    () => stockBatches.filter((b) => b.daysToExpiry <= 7),
    [stockBatches]
  );
  const stockByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const batch of stockBatches) totals.set(products.find((product) => product.id === batch.productId)?.category ?? 'Uncategorized',
      (totals.get(products.find((product) => product.id === batch.productId)?.category ?? 'Uncategorized') ?? 0) + batch.availableQty * batch.unitCostKes);
    return [...totals].map(([category, value]) => ({ category, value }));
  }, [products, stockBatches]);
  const stockValueKes = stockBatches.reduce((sum, batch) => sum + batch.availableQty * batch.unitCostKes, 0);
  const movementTypes = useMemo(() => ['Receipt (GRN)', 'Order Pick', 'Transfer', 'Adjustment', 'Wastage']
    .map((type) => ({ type, count: stockMovements.filter((movement) => movement.type === type).length })), [stockMovements]);

  const filteredBatches = useMemo(() => {
    return stockBatches.filter((b) => {
      let matchesRisk = true;
      if (batchFilter === 'at-risk' || batchFilter === 'expiring') {
        matchesRisk = b.daysToExpiry <= 7 || b.status === 'Expiring Soon';
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.warehouseName.toLowerCase().includes(q) ||
        b.binCode.toLowerCase().includes(q);

      return matchesRisk && matchesSearch;
    });
  }, [stockBatches, batchFilter, search]);

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await recordStockMovement({
      batchId,
      type: movType,
      quantityDelta: Number(qtyDelta),
      reason: reason || `${movType} logged by Warehouse Control`,
      toLocation: movType === 'Transfer' ? toLocation : undefined,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setModalOpen(false);
      setReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 23 & 31) */}
      <PageHeader
        title="Inventory"
        description="Track goods moving directly to customers and manage stock held at warehouses."
        actions={
          activeTab !== 'direct-flow' && (can('inventory.adjust') ||
            can('inventory.transfer') ||
            can('inventory.receive')) && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ui-button ui-button-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Record Movement / Wastage</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* View Switcher Tabs (Hybrid Operating Models: Direct Procurement vs FEFO Storage) */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('direct-flow')}
          aria-pressed={activeTab === 'direct-flow'}
          className="ui-tab whitespace-nowrap"
        >
          Direct goods flow
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          aria-pressed={activeTab === 'batches'}
          className="ui-tab whitespace-nowrap"
        >
          Stored stock ({stockBatches.length} batches)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          aria-pressed={activeTab === 'products'}
          className="ui-tab whitespace-nowrap"
        >
          Product Stock Matrix ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          aria-pressed={activeTab === 'movements'}
          className="ui-tab whitespace-nowrap"
        >
          Wastage & Movements ({stockMovements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          aria-pressed={activeTab === 'warehouses'}
          className="ui-tab whitespace-nowrap"
        >
          Cold-Chain Facilities
        </button>
      </div>

      {/* Top Decision Summary Metrics (Section 23: Available, Reserved, Incoming, Low Stock, Expiring) */}
      {activeTab !== 'direct-flow' && <div className="bento-metrics">
        <KPI
          label="Available Stock"
          value={`${availableSkus} SKUs`}
          sublabel="Net unreserved inventory"
          tone="positive"
        />
        <KPI
          label="Reserved for Orders"
          value={`${reservedSkus} SKUs`}
          sublabel="Allocated to active dispatches"
          tone="neutral"
        />
        <KPI
          label="Inbound Purchases"
          value={`${inboundPurchaseOrders.length} POs`}
          sublabel="Awaiting warehouse receipt"
          tone="positive"
        />
        <KPI
          label="Low Stock Deficit"
          value={`${lowStockProducts.length} SKUs`}
          sublabel="Below contracted buffer"
          tone={lowStockProducts.length > 0 ? 'warning' : 'positive'}
        />
        <KPI
          label="Expiring <= 7d"
          value={`${expiringBatches.length} Batches`}
          sublabel="FEFO priority countdown"
          tone={expiringBatches.length > 0 ? 'danger' : 'positive'}
        />
        <KPI label="Owned stock value" value={`KES ${stockValueKes.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`} sublabel="Available quantity × batch cost" />
      </div>}

      {activeTab !== 'direct-flow' && <section aria-label="Inventory analysis" className="grid gap-4 lg:grid-cols-2">
        <ModuleChart title="Owned stock value" subtitle="Available batch value by product category" data={stockByCategory} xKey="category" series={[{ key: 'value', label: 'Stock value (KES)' }]} layout="vertical" />
        <ModuleChart title="Stock movement mix" subtitle="Recorded movements by type" data={movementTypes} xKey="type" series={[{ key: 'count', label: 'Movements' }]} />
      </section>}

      {/* Primary Section: Inventory at Risk (Section 23) */}
      {activeTab !== 'direct-flow' && <section aria-label="Warehouse stock risks">
        <div className="ui-surface p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h2 className="ui-section-title">
                  Perishable batches and stock shortages
                </h2>
                <p className="ui-meta">
                  Take immediate operational action on stock before expiry threshold or school stockout occurs.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-3.5 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                      {batch.batchNumber}
                    </span>
                    <span className="text-xs font-mono-tabular font-bold text-[var(--status-danger-fg)]">
                      {batch.daysToExpiry}d to Expiry
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                    {batch.productName}
                  </div>
                  <div className="ui-meta mt-0.5">
                    {batch.warehouseName} ({batch.binCode}) ·{' '}
                    <strong className="text-[var(--text-primary)]">
                      {batch.availableQty} {batch.unit}
                    </strong>{' '}
                    available
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="ui-meta">
                    Earliest FIFO Pick
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchId(batch.id);
                      setMovType('Transfer');
                      setModalOpen(true);
                    }}
                    className="ui-button ui-button-primary ui-button-compact"
                  >
                    <span>Fast-Track</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Low safety stock alert */}
            {lowStockProducts.slice(0, 1).map((p) => (
              <div
                key={`low-${p.id}`}
                className="p-3.5 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--status-warning-fg)]">
                      {p.sku} · Buffer Deficit
                    </span>
                    <span className="text-xs font-mono-tabular font-bold text-[var(--status-warning-fg)]">
                      Below Reorder Point
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                    {p.name}
                  </div>
                  <div className="ui-meta mt-0.5">
                    Available: <strong>{p.availableQty} {p.unit}</strong> (Buffer target: {p.reorderPoint} {p.unit})
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="ui-meta">
                    Reorder Needed
                  </span>
                  {can('procurement.view') && <Link href="/procurement?filter=receiving"
                    className="ui-button ui-button-secondary">
                    View purchase receipts <ArrowRight size={15} aria-hidden="true" />
                  </Link>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {activeTab === 'direct-flow' && (
        <section aria-labelledby="direct-goods-flow" className="space-y-3">
          <h2 id="direct-goods-flow" className="ui-section-title">Direct goods flow</h2>
          {goodsFlow.length === 0 && <Card><p className="text-sm text-[var(--text-secondary)]">No customer order lines use direct sourcing.</p></Card>}
          {goodsFlow.map(({ id, order, item, directRequired, collected, outstanding, uncommitted }) => (
            <Card key={`${order.id}-${id}`} className="space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="ui-section-title">{item.productName}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{order.orderNumber} · {order.customerName} · Delivery {order.deliveryDate}</p>
                </div>
                <StatusBadge status={outstanding === 0 ? 'Collected' : collected > 0 ? 'Partially collected' : 'Awaiting collection'}
                  tone={outstanding === 0 ? 'success' : 'warning'} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-sm">
                <p>{collected.toLocaleString()} / {directRequired.toLocaleString()} {item.unit} collected
                  {uncommitted > 0 && <span className="text-[var(--text-secondary)]"> · {uncommitted.toLocaleString()} {item.unit} still to order</span>}
                </p>
                {outstanding > 0 && can('procurement.view') && <Link
                  href={`/procurement?order=${encodeURIComponent(order.id)}`}
                  className="ui-button ui-button-secondary">
                  View sourcing <ArrowRight size={16} aria-hidden="true" />
                </Link>}
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* Tab 1: FEFO Batch View (Operating Model B) */}
      {activeTab === 'batches' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Filter Batches:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-canvas)]">
                <button
                  type="button"
                  onClick={() => setBatchFilter('all')}
                  aria-pressed={batchFilter === 'all'}
                  className="ui-tab whitespace-nowrap"
                >
                  All Batches
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilter('at-risk')}
                  aria-pressed={batchFilter === 'at-risk'}
                  className="ui-tab whitespace-nowrap"
                >
                  At Risk (&lt;= 7d)
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search batches by number or product"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch # or produce..."
                className="ui-field w-full pl-8 pr-3"
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-3 px-4">Batch / Lot #</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Warehouse & Bin</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Reserved Qty</th>
                  <th className="py-3 px-4">FEFO Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {b.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      {b.productName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{b.warehouseName}</div>
                      <div className="font-mono-tabular ui-meta">
                        Bin: {b.binCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular">
                      <div>{b.expiryDate || 'No expiry date'}</div>
                      {b.expiryDate && <div
                        className={`text-xs font-semibold ${
                          b.daysToExpiry <= 5
                            ? 'text-[var(--status-danger-fg)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {b.daysToExpiry}d remaining
                      </div>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {b.availableQty.toLocaleString()} {b.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-[var(--text-secondary)]">
                      {b.reservedQty.toLocaleString()} {b.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredBatches.map((b) => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                    {b.batchNumber}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="text-xs font-semibold">{b.productName}</div>
                <div className="ui-meta">
                  {b.warehouseName} ({b.binCode}){b.expiryDate ? ` · Expires ${b.expiryDate} (${b.daysToExpiry}d)` : ''}
                </div>
                <div className="text-xs font-mono-tabular font-semibold">
                  Available: {b.availableQty.toLocaleString()} {b.unit}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 2: Stock Table Matrix */}
      {activeTab === 'products' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Safety Buffer</th>
                  <th className="py-3 px-4 text-right">Institutional Price</th>
                  <th className="py-3 px-4">Stock Posture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {products.map((p) => {
                  const isLow = p.availableQty < p.reorderPoint;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                        {p.availableQty.toLocaleString()} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-[var(--text-secondary)]">
                        {p.reorderPoint.toLocaleString()} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--brand-accent)]">
                        KES {p.pricing.institutionalKes}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`ui-badge ${
                            isLow
                              ? 'ui-tone-warning'
                              : 'ui-tone-success'
                          }`}
                        >
                          {isLow ? 'Safety Buffer Low' : 'Adequate'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Movements & Spoilage Ledger */}
      {activeTab === 'movements' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {stockMovements.map((m) => (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.type} />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {m.productName}
                    </span>
                    <span className="font-mono-tabular text-[var(--text-secondary)]">
                      ({m.batchNumber})
                    </span>
                  </div>
                  <div className="ui-meta mt-1">
                    {m.fromLocation} → {m.toLocation} · Operator: {m.actorName} · {m.reason}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono-tabular text-sm font-semibold ${
                      m.quantityDelta >= 0
                        ? 'text-[var(--brand-accent)]'
                        : 'text-[var(--status-danger-fg)]'
                    }`}
                  >
                    {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta} {m.unit}
                  </div>
                  <div className="ui-meta">
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Cold-Chain Hub Facilities */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => (
              <Card key={wh.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                      {wh.code}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {wh.zoneType}
                    </span>
                  </div>
                  <h3 className="ui-section-title mt-1">
                    {wh.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {wh.location}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span>
                    Bins: <strong className="font-mono-tabular">{wh.binsCount}</strong>
                  </span>
                  <span>
                    Utilization:{' '}
                    <strong className="font-mono-tabular text-[var(--brand-accent)]">
                      {wh.utilizationPct}%
                    </strong>
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Lead: {wh.manager.split(' ')[0]}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden" padding="p-0">
            <div className="h-72 relative">
              <ResilientImage
                src={IMAGE_PATHS.warehouseColdChain}
                alt="Nairobi Cold Hub A interior racking and barcoded fresh produce crates"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[var(--nav-bg)]/95 via-[var(--nav-bg)]/55 to-transparent p-6 text-[var(--nav-text)]">
                <div className="text-xs font-semibold text-[var(--nav-active)]">
                  NAIROBI COLD HUB A · INDUSTRIAL AREA
                </div>
                <h3 className="ui-section-title mt-1 text-[var(--nav-text)]">
                  FEFO Barcoded Cold-Storage & Staging Racks (2°C – 6°C)
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-[var(--nav-text)]">
                  Every inbound cooperative lot receives a batch barcode at Goods Received Note (GRN) inspection. Order picking enforces earliest expiry allocation automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Movement Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Stock Movement / Wastage"
        subtitle="Log an physical count adjustment, inter-hub transfer, GRN receipt, or spoilage quarantine."
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          <div>
            <label htmlFor="inventory-batch" className="ui-label block mb-1">Target Stock Batch</label>
            <select id="inventory-batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="ui-field w-full"
            >
              {stockBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} · {b.productName} ({b.availableQty} {b.unit} avail)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inventory-movement" className="ui-label block mb-1">Movement Type</label>
              <select id="inventory-movement"
                value={movType}
                onChange={(e) => setMovType(e.target.value as StockMovementRecord['type'])}
                className="ui-field w-full"
              >
                <option value="Adjustment">Count Adjustment</option>
                <option value="Transfer">Inter-Hub Transfer</option>
                <option value="Wastage">Spoilage / Wastage</option>
                <option value="Receiving">Inbound GRN Receiving</option>
              </select>
            </div>
            <div>
              <label htmlFor="inventory-quantity" className="ui-label block mb-1">Quantity Delta</label>
              <input id="inventory-quantity"
                type="number"
                value={qtyDelta}
                onChange={(e) => setQtyDelta(Number(e.target.value))}
                className="ui-field w-full font-mono-tabular"
              />
            </div>
          </div>

          {movType === 'Transfer' && (
            <div>
              <label htmlFor="inventory-destination" className="ui-label block mb-1">Destination Facility</label>
              <select id="inventory-destination"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="ui-field w-full"
              >
                <option value="Westlands Cross-Dock C">Westlands Cross-Dock C</option>
                <option value="Dry Bulk Hub B (Embakasi)">Dry Bulk Hub B (Embakasi)</option>
                <option value="Nairobi Cold Hub A">Nairobi Cold Hub A</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="inventory-reason" className="ui-label block mb-1">Operational Reason / Notes</label>
            <input id="inventory-reason"
              type="text"
              placeholder="e.g. Expired batch compost quarantine, school rush transfer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="ui-field w-full"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              Save Movement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Inventory Workbench...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

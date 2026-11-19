'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Layers,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
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
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { OrderLifecycleStatus, OrderRecord } from '@/types/domain/bos';

const STATUS_FILTERS: ('All' | 'Needs Action' | OrderLifecycleStatus)[] = [
  'All',
  'Needs Action',
  'Confirmed',
  'Picking',
  'Packed',
  'Dispatched',
  'Delivered',
  'On Hold',
];

function OrdersWorkbenchContent() {
  const searchParams = useSearchParams();
  const {
    orders,
    procurementOrders,
    customers,
    products,
    warehouses,
    currentUser,
    can,
    createOrder,
    advanceOrderStatus,
    getSuppliersForProduct,
  } = useBos();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Needs Action' | OrderLifecycleStatus>('All');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Read search parameters for drill-down support (Section 14)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const statusParam = searchParams.get('status') as OrderLifecycleStatus | null;
    const orderNumParam = searchParams.get('orderNumber');

    if (filterParam === 'needs-action') {
      setStatusFilter('Needs Action');
    } else if (statusParam && STATUS_FILTERS.includes(statusParam)) {
      setStatusFilter(statusParam);
    }

    if (searchParams.get('action') === 'new') {
      setCreateOpen(true);
    }

    if (orderNumParam) {
      setSearch(orderNumParam);
      const match = orders.find((o) => o.orderNumber.toLowerCase() === orderNumParam.toLowerCase());
      if (match) setSelectedOrder(match);
    }
  }, [searchParams, orders]);

  // Multi-Item Order Composer State (Phase A: 3.1 - 3.7)
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [channel, setChannel] = useState<OrderRecord['channel']>('Institutional Contract');
  const [deliveryDate, setDeliveryDate] = useState(tomorrowStr);
  const [warehouseName, setWarehouseName] = useState(warehouses[0]?.name || 'Nairobi Cold Hub A');
  const [orderReference, setOrderReference] = useState(() => customers[0] ? `PO-${customers[0].code}-${new Date().getFullYear()}-01` : '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => customers[0] ? `${customers[0].deliveryZone}, ${customers[0].county} (Attn: ${customers[0].procurementContact})` : '');
  const [notes, setNotes] = useState('');
  const [composerStep, setComposerStep] = useState<'compose' | 'review'>('compose');

  interface FormLineItem {
    id: string;
    productId: string;
    quantity: number;
    overridePriceKes?: number;
    sourcingMode?: 'direct_procurement' | 'existing_stock' | 'mixed';
    stockAllocatedQty?: number;
    supplierId?: string;
    supplierName?: string;
    purchaseCostKes?: number;
  }

  const [formItems, setFormItems] = useState<FormLineItem[]>([
    {
      id: 'line-1',
      productId: products[0]?.id || '',
      quantity: 50,
      sourcingMode: 'direct_procurement',
    },
  ]);

  type OrderDraft = {
    customerId: string;
    channel: OrderRecord['channel'];
    deliveryDate: string;
    warehouseName: string;
    orderReference: string;
    deliveryAddress: string;
    notes: string;
    items: FormLineItem[];
  };
  const draftKey = currentUser ? `agrohub.order-draft.${currentUser.id}` : '';
  const [savedDraft, setSavedDraft] = useState<OrderDraft | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [composerDirty, setComposerDirty] = useState(false);
  const [composerError, setComposerError] = useState('');

  useEffect(() => {
    try {
      const stored = draftKey ? localStorage.getItem(draftKey) : null;
      setSavedDraft(stored ? JSON.parse(stored) as OrderDraft : null);
    } catch {
      setSavedDraft(null);
    }
  }, [draftKey]);

  function selectCustomer(id: string) {
    setCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      if (cust.isInstitutional) {
        setChannel('Institutional Contract');
      }
      setDeliveryAddress(`${cust.deliveryZone}, ${cust.county} (Attn: ${cust.procurementContact})`);
      setOrderReference(`PO-${cust.code}-${new Date().getFullYear()}-01`);
    }
  }

  function resumeOrderDraft() {
    if (!savedDraft) return;
    setCustomerId(savedDraft.customerId);
    setChannel(savedDraft.channel);
    setDeliveryDate(savedDraft.deliveryDate);
    setWarehouseName(savedDraft.warehouseName);
    setOrderReference(savedDraft.orderReference);
    setDeliveryAddress(savedDraft.deliveryAddress);
    setNotes(savedDraft.notes);
    setFormItems(savedDraft.items);
    setComposerStep('compose');
    setComposerDirty(false);
    setComposerError('');
    setCreateOpen(true);
  }

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  // Dynamic pricing & stock calculation per line item (Section 3.2, 3.3, 3.4)
  const computedLineItems = useMemo(() => {
    const reserved = new Map<string, number>();
    return formItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      let tier: 'Institutional' | 'Wholesale' | 'Retail' | 'Online' = 'Retail';
      let defaultPrice = prod?.pricing.retailKes || 0;

      if (selectedCustomer?.isInstitutional) {
        tier = 'Institutional';
        defaultPrice = prod?.pricing.institutionalKes || 0;
      } else if (channel === 'Recurring Weekly' || channel === 'Tender Supply') {
        tier = 'Wholesale';
        defaultPrice = prod?.pricing.wholesaleKes || 0;
      }

      const unitPrice =
        item.overridePriceKes !== undefined && item.overridePriceKes > 0
          ? item.overridePriceKes
          : defaultPrice;

      const qty = Number(item.quantity) || 0;
      const lineTotal = Math.round(unitPrice * qty);
      const reservedInForm = reserved.get(item.productId) ?? 0;
      const available = Math.max(0, (prod?.availableQty ?? 0) - reservedInForm);

      // Default sourcing mode: if direct is specified or stock is insufficient, direct procurement
      const mode = item.sourcingMode || (qty > available ? 'direct_procurement' : 'existing_stock');
      const isDirectOnly = mode === 'direct_procurement';
      const isStockOnly = mode === 'existing_stock';

      const stockAllocated = isDirectOnly ? 0 : isStockOnly ? qty : item.stockAllocatedQty ?? Math.min(qty, available);
      const directProcured = Math.max(0, qty - stockAllocated);
      const hasShortage = stockAllocated > available || stockAllocated > qty || stockAllocated < 0;
      reserved.set(item.productId, reservedInForm + Math.max(0, stockAllocated));
      const isPriceBelowSchedule =
        item.overridePriceKes !== undefined &&
        item.overridePriceKes > 0 &&
        item.overridePriceKes < defaultPrice;

      const quotingSuppliers = prod
        ? getSuppliersForProduct(prod.id).map((s) => {
            const productSupply = s.suppliedProducts?.find((p) => p.productId === prod.id);
            return {
              supplierId: s.id,
              supplierName: s.name,
              quotingPriceKes: productSupply?.currentCostKes,
              leadTimeDays: productSupply?.leadTimeDays ?? s.leadTimeDays,
              minOrderQty: productSupply?.moq ?? productSupply?.minOrderQty,
            };
          })
        : [];
      const activeSupplier = quotingSuppliers.find((s) => s.supplierId === item.supplierId);
      const purchaseCost = isStockOnly ? undefined : item.purchaseCostKes ?? activeSupplier?.quotingPriceKes;

      return {
        ...item,
        sourcingMode: mode,
        stockAllocatedQty: stockAllocated,
        directProcuredQty: directProcured,
        supplierId: isStockOnly ? undefined : activeSupplier?.supplierId,
        supplierName: isStockOnly ? undefined : activeSupplier?.supplierName,
        purchaseCostKes: purchaseCost,
        quotingSuppliers,
        product: prod,
        pricingTier: tier,
        defaultPrice,
        unitPrice,
        lineTotal,
        availableStock: available,
        hasShortage,
        isPriceBelowSchedule,
      };
    });
  }, [formItems, selectedCustomer, channel, products, getSuppliersForProduct]);

  const orderSubtotalKes = useMemo(
    () => computedLineItems.reduce((acc, it) => acc + it.lineTotal, 0),
    [computedLineItems]
  );

  const totalQuantityUnits = useMemo(
    () => computedLineItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
    [computedLineItems]
  );

  const totalDirectProcuredUnits = useMemo(
    () => computedLineItems.reduce((acc, it) => acc + (Number(it.directProcuredQty) || 0), 0),
    [computedLineItems]
  );

  const totalStockAllocatedUnits = useMemo(
    () => computedLineItems.reduce((acc, it) => acc + (Number(it.stockAllocatedQty) || 0), 0),
    [computedLineItems]
  );

  const hasAnyShortage = computedLineItems.some((it) => it.hasShortage);
  const hasAnyApprovalRequired = computedLineItems.some((it) => it.isPriceBelowSchedule);

  const handleAddItem = () => {
    setComposerDirty(true);
    // Pick the first product not yet added, or fallback to first product
    const existingIds = new Set(formItems.map((it) => it.productId));
    const nextProduct = products.find((p) => !existingIds.has(p.id)) || products[0];
    setFormItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: nextProduct ? nextProduct.id : '',
        quantity: 25,
        sourcingMode: 'direct_procurement',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (formItems.length <= 1) return;
    setComposerDirty(true);
    setFormItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<FormLineItem>) => {
    setFormItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  const handleCreateOrder = async (isDraft: boolean = false) => {
    setComposerError('');
    if (isDraft) {
      if (!draftKey) {
        setComposerError('Sign in to save this draft.');
        return;
      }
      const draft = { customerId, channel, deliveryDate, warehouseName, orderReference, deliveryAddress, notes, items: formItems };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setSavedDraft(draft);
        setComposerDirty(false);
        setCreateOpen(false);
        setFeedback({ msg: 'Order draft saved in this browser.', type: 'success' });
      } catch {
        setComposerError('The browser could not save this draft. Keep this form open to retain your changes.');
      }
      return;
    }
    const validItems = computedLineItems.filter((it) => it.productId && Number.isFinite(it.quantity) && it.quantity > 0);
    if (validItems.length !== computedLineItems.length || !validItems.length) {
      setComposerError('Select a product and enter a quantity greater than zero on every line.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await createOrder({
        customerId,
        channel,
        deliveryDate,
        warehouseName,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          overridePriceKes: it.overridePriceKes ? Number(it.overridePriceKes) : undefined,
          sourcingMode: it.sourcingMode,
          stockAllocatedQty: it.stockAllocatedQty,
          directProcuredQty: it.directProcuredQty,
          supplierId: it.supplierId,
          supplierName: it.supplierName,
          purchaseCostKes: it.purchaseCostKes,
        })),
        notes: notes.trim() || undefined,
        orderReference: orderReference.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
      });

      if (res.ok) {
        setFeedback({ msg: res.message, type: 'success' });
        if (draftKey) {
          try { localStorage.removeItem(draftKey); } catch { /* The order was created already. */ }
        }
        setSavedDraft(null);
        setComposerDirty(false);
        setCreateOpen(false);
        setComposerStep('compose');
        setFormItems([{ id: 'line-1', productId: products[0]?.id || '', quantity: 50, sourcingMode: 'direct_procurement' }]);
        setNotes('');
      } else {
        setComposerError(res.message);
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Top summary metrics (Section 22)
  const openCount = useMemo(
    () => orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Closed').length,
    [orders]
  );
  const needsActionCount = useMemo(
    () => orders.filter((o) => o.status === 'Confirmed' || o.status === 'Picking' || o.status === 'On Hold').length,
    [orders]
  );
  const awaitingPaymentCount = useMemo(
    () => orders.filter((o) => o.paymentStatus !== 'Paid').length,
    [orders]
  );
  const delayedCount = useMemo(
    () => orders.filter((o) => o.status === 'On Hold').length,
    [orders]
  );
  const todayDeliveryCount = useMemo(
    () => orders.filter((o) => o.deliveryDate === '2026-10-01' || o.deliveryDate === '2026-10-02').length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      let matchesStatus = true;
      if (statusFilter === 'Needs Action') {
        matchesStatus = o.status === 'Confirmed' || o.status === 'Picking' || o.status === 'On Hold';
      } else if (statusFilter !== 'All') {
        matchesStatus = o.status === statusFilter;
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.channel.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Customer',
      'Segment',
      'Channel',
      'Status',
      'Delivery Date',
      'Warehouse',
      'Total KES',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      `"${o.customerName}"`,
      o.customerSegment,
      o.channel,
      o.status,
      o.deliveryDate,
      `"${o.warehouseName}"`,
      o.totalKes,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agro-deliveries-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Primary Work Queue (Section 22)
  const orderWorkQueueItems: WorkQueueItem[] = useMemo(() => {
    return orders
      .filter((o) => o.status === 'Confirmed' || o.status === 'Picking' || o.status === 'On Hold')
      .map((o) => {
        let actionLabel = 'Start Picking';
        if (o.status === 'Picking') actionLabel = 'Mark Packed';
        if (o.status === 'On Hold') actionLabel = 'Review Hold';

        return {
          id: o.id,
          title: `${o.orderNumber} · ${o.customerName}`,
          subtitle: `${o.customerSegment} · Due ${o.deliveryDate} at ${o.warehouseName}`,
          tag: o.status,
          severity: o.status === 'On Hold' ? ('critical' as const) : ('warning' as const),
          actionLabel,
          onAction: () => setSelectedOrder(o),
          metadata: `KES ${o.totalKes.toLocaleString()}`,
        };
      });
  }, [orders]);

  const getNextStageLabel = (status: OrderLifecycleStatus): string => {
    switch (status) {
      case 'Confirmed':
        return 'Start Picking';
      case 'Picking':
        return 'Complete Packing';
      default:
        return 'Inspect';
    }
  };

  const getNextStageStatus = (status: OrderLifecycleStatus): OrderLifecycleStatus | null => {
    switch (status) {
      case 'Confirmed':
        return 'Picking';
      case 'Picking':
        return 'Packed';
      default:
        return null;
    }
  };

  const handleQuickAdvance = async (order: OrderRecord) => {
    const next = getNextStageStatus(order.status);
    if (!next) {
      setSelectedOrder(order);
      return;
    }
    const res = await advanceOrderStatus(order.id, next);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setSelectedOrder((selected) => selected?.id === order.id ? { ...selected, status: next } : selected);
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 22 & 31) */}
      <PageHeader
        title="Orders"
        description="Create orders, review sourcing, and track fulfillment."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can('orders.export') && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="ui-button ui-button-secondary"
              >
                <Download className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                <span className="hidden sm:inline">Export Manifest</span>
              </button>
            )}
            {can('orders.create') && savedDraft && (
              <button type="button" onClick={resumeOrderDraft} className="ui-button ui-button-secondary">Resume draft</button>
            )}
            {can('orders.create') && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="ui-button ui-button-primary"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}
          </div>
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Summary Decision Metrics (Section 22) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Open Pipeline"
          value={`${openCount} Orders`}
          sublabel="Active commercial demand"
          tone="positive"
        />
        <KPI
          label="Needs Action"
          value={`${needsActionCount} Orders`}
          sublabel="Picking, staging or hold"
          tone="warning"
        />
        <KPI
          label="Awaiting Payment"
          value={`${awaitingPaymentCount} Invoices`}
          sublabel="Net terms / EFT pending"
          tone="neutral"
        />
        <KPI
          label="Delayed / On Hold"
          value={`${delayedCount} Exception`}
          sublabel="Credit or price approval"
          tone={delayedCount > 0 ? 'danger' : 'positive'}
        />
        <KPI
          label="Today's Delivery"
          value={`${todayDeliveryCount} Scheduled`}
          sublabel="Target SLA 06:30-10:00 EAT"
          tone="positive"
        />
      </div>

      {/* Primary Work Queue: Orders Requiring Action (Section 22) */}
      {orderWorkQueueItems.length > 0 && (
        <WorkQueue
          title="Orders Requiring Immediate Fulfillment Action"
          subtitle="Active warehouse packing deadlines and exception releases"
          badgeCount={orderWorkQueueItems.length}
          items={orderWorkQueueItems}
        />
      )}

      {/* Filter & Search Bar */}
      <Card className="mb-6" padding="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                aria-pressed={statusFilter === st}
                className="ui-tab whitespace-nowrap"
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search by order number or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by order # or customer..."
              className="ui-field w-full pl-9 pr-3"
            />
          </div>
        </div>
      </Card>

      {/* Fulfillment Workbench Table (Section 22: Order, Customer, Value, Status, Delivery, Payment, Primary Action) */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders match the current filter"
          description="Adjust your lifecycle filter or create a new institutional supply order."
          actionLabel={can('orders.create') ? 'Create New Order' : undefined}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer & Segment</th>
                  <th className="py-3 px-4">Delivery & Hub</th>
                  <th className="py-3 px-4">Payment State</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Value (KES)</th>
                  <th className="py-3 px-4 text-right">Primary Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.orderNumber}
                      <div className="ui-meta font-normal">
                        {ord.channel}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ord.customerName}
                      </div>
                      <div className="ui-meta">
                        {ord.customerSegment} · {ord.itemsCount} line item(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono-tabular text-[var(--text-primary)]">
                        {ord.deliveryDate}
                      </div>
                      <div className="ui-meta">
                        {ord.warehouseName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          ord.paymentStatus === 'Paid'
                            ? 'text-[var(--brand-accent)]'
                            : 'text-[var(--status-warning-fg)]'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.totalKes.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {can('fulfillment.manage') && getNextStageStatus(ord.status) && (
                          <button
                            type="button"
                            onClick={() => handleQuickAdvance(ord)}
                            className="ui-button ui-button-primary ui-button-compact"
                          >
                            <span>{getNextStageLabel(ord.status)}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="ui-button ui-button-secondary ui-button-compact"
                          title="Inspect Details"
                          aria-label={`Inspect order ${ord.orderNumber}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Record Cards */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredOrders.map((ord) => (
              <div key={ord.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold">
                    {ord.orderNumber}
                  </span>
                  <StatusBadge status={ord.status} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {ord.customerName}
                  </div>
                  <div className="ui-meta">
                    Delivery: {ord.deliveryDate} · {ord.warehouseName}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                    KES {ord.totalKes.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {can('fulfillment.manage') && getNextStageStatus(ord.status) && (
                      <button
                        type="button"
                        onClick={() => handleQuickAdvance(ord)}
                        className="ui-button ui-button-primary ui-button-compact"
                      >
                        {getNextStageLabel(ord.status)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(ord)}
                      className="ui-button ui-button-secondary ui-button-compact"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order Detail & Lifecycle Progression Modal (Section 22 & 35) */}
      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${selectedOrder.orderNumber} · ${selectedOrder.customerName}`
            : 'Order Fulfillment Workbench'
        }
        subtitle={
          selectedOrder
            ? `${selectedOrder.channel} · Delivery Hub: ${selectedOrder.warehouseName}`
            : ''
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
              <div>
                <div className="ui-meta">
                  Current Lifecycle State
                </div>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="ui-meta">
                  Next Operational Action
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                  {selectedOrder.nextStepLabel}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2 text-[var(--text-primary)]">
                Order Line Items & Sourcing Allocation
              </div>
              <div className="space-y-2">
                {getOrderSourcingLines(selectedOrder, procurementOrders).map(({ item, id, outstanding }) => {
                  const isDirect =
                    item.sourcingMode === 'direct_procurement' ||
                    item.sourcingMode === 'Direct Procurement';
                  const isMixed =
                    item.sourcingMode === 'mixed' ||
                    item.sourcingMode === 'Mixed Sourcing';

                  return (
                    <div
                      key={id}
                      className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.productName}
                          </span>
                          {isDirect ? (
                            <span className="ui-badge ui-tone-success">
                              Direct Farm Procurement
                            </span>
                          ) : isMixed ? (
                            <span className="ui-badge ui-tone-info">
                              Mixed Sourcing
                            </span>
                          ) : (
                            <span className="ui-badge ui-tone-neutral">
                              FEFO Hub Stock
                            </span>
                          )}
                        </div>
                        <div className="ui-meta">
                          {isDirect ? (
                            <span>
                              {item.supplierName ? `Preferred supplier ${item.supplierName}` : 'Open supplier sourcing'}
                              {item.purchaseCostKes ? ` · Estimated cost KES ${item.purchaseCostKes}/${item.unit}` : ''}
                            </span>
                          ) : isMixed ? (
                            <span>
                              Allocated <strong>{item.stockAllocatedQty || 0} {item.unit}</strong> stock · <strong>{item.directProcuredQty || 0} {item.unit}</strong> direct
                            </span>
                          ) : (
                            <span>
                              Batch: <span className="font-mono-tabular text-[var(--brand-accent)]">{item.allocatedBatch}</span>
                            </span>
                          )}
                          <span> · {item.quantity} {item.unit} @ KES {item.unitPriceKes} ({item.pricingTier})</span>
                          {outstanding > 0 && <p className="mt-1 font-medium text-[var(--status-warning-fg)]">{outstanding.toLocaleString()} {item.unit} still to collect</p>}
                        </div>
                      </div>
                      <div className="font-mono-tabular font-semibold">
                        KES {item.lineTotalKes.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {can('procurement.view') && getOrderSourcingLines(selectedOrder, procurementOrders).some((line) => line.outstanding > 0) && (
              <Link href={`/procurement?order=${encodeURIComponent(selectedOrder.id)}`} className="ui-button ui-button-secondary">
                View sourcing <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
              {can('fulfillment.manage') && getNextStageStatus(selectedOrder.status) && (
                <button type="button" onClick={() => handleQuickAdvance(selectedOrder)}
                  className="ui-button ui-button-primary">
                  {getNextStageLabel(selectedOrder.status)}
                </button>
              )}
              {can('deliveries.view') && ['Packed', 'Dispatched', 'Partially Fulfilled'].includes(selectedOrder.status) && (
                <Link href={`/deliveries?order=${encodeURIComponent(selectedOrder.orderNumber)}`}
                  className="ui-button ui-button-secondary">
                  View delivery runs
                </Link>
              )}
              {can('approvals.view') && selectedOrder.status === 'On Hold' && (
                <Link href="/approvals?status=pending"
                  className="ui-button ui-button-secondary">
                  Review approvals
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Multi-Item Order Composer Modal (Phase A: 3.1 - 3.7) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="3xl"
        title={composerStep === 'review' ? 'Review & Confirm Order' : 'Create Multi-Item Order'}
        subtitle={
          composerStep === 'review'
            ? 'Verify customer details, pricing tier schedules, and automated FEFO batch reservations.'
            : 'Compose institutional order lines with dynamic pricing schedules and FEFO stock verification.'
        }
        hasUnsavedChanges={composerDirty && !submittingOrder}
        allowEscapeClose={!submittingOrder}
        allowBackdropClose={!submittingOrder}
        onConfirmDiscard={() => {
          setCreateOpen(false);
          setComposerStep('compose');
          setFormItems([{ id: 'line-1', productId: products[0]?.id || '', quantity: 50 }]);
          setNotes('');
          setComposerDirty(false);
          setComposerError('');
        }}
      >
        {composerStep === 'compose' ? (
          <form
            onChange={() => setComposerDirty(true)}
            onSubmit={(e) => {
              e.preventDefault();
              setComposerStep('review');
            }}
            className="space-y-5"
          >
            {/* Section A: Customer & Order Details */}
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="ui-section-title inline-flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Customer & Logistics Schedule</span>
                </span>
                {selectedCustomer && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full ui-tone-success">
                    {selectedCustomer.segment} · {selectedCustomer.paymentTerms}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <label htmlFor="orders-customer" className="ui-label block mb-1">
                    Select Customer / Institution *
                  </label>
                  <select id="orders-customer"
                    value={customerId}
                    onChange={(e) => selectCustomer(e.target.value)}
                    className="ui-field w-full"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.segment} · {c.county})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="orders-channel" className="ui-label block mb-1">
                    Supply Channel *
                  </label>
                  <select id="orders-channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as OrderRecord['channel'])}
                    className="ui-field w-full"
                  >
                    <option value="Institutional Contract">Institutional Contract</option>
                    <option value="Recurring Weekly">Recurring Weekly</option>
                    <option value="Tender Supply">Tender Supply</option>
                    <option value="Walk-In / Manual">Walk-In / Manual</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="orders-due-date" className="ui-label block mb-1">
                    Expected Delivery Date *
                  </label>
                  <input id="orders-due-date"
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="ui-field w-full"
                  />
                </div>

                <div>
                  <label htmlFor="orders-hub" className="ui-label block mb-1">
                    Fulfillment Hub *
                  </label>
                  <select id="orders-hub"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="ui-field w-full"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name} ({w.zoneType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="orders-reference" className="ui-label block mb-1">
                    Customer PO Reference
                  </label>
                  <input id="orders-reference"
                    type="text"
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    placeholder="e.g. PO-MOI-2026-441"
                    className="ui-field w-full font-mono-tabular"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="orders-address" className="ui-label block mb-1">
                    Delivery Address & Receiving Point
                  </label>
                  <input id="orders-address"
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Specific kitchen gate, stores receiving bay, or contact person"
                    className="ui-field w-full"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Dynamic Multi-Line Items Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="ui-section-title inline-flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                    <span>Order Products & Quantities ({formItems.length} Lines)</span>
                  </span>
                  <p className="ui-meta">
                    Tier pricing auto-applies by customer profile. Override requires authorization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="ui-button ui-button-secondary ui-button-compact"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {computedLineItems.map((item, idx) => {
                  const prod = item.product;
                  const isDirect = item.sourcingMode === 'direct_procurement';
                  const isMixed = item.sourcingMode === 'mixed';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-colors space-y-3 ${
                        item.hasShortage
                          ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Line number and product selector */}
                        <div className="sm:col-span-5">
                          <label htmlFor={`order-product-${item.id}`} className="ui-label block mb-1">
                            Line #{idx + 1} · Product SKU
                          </label>
                          <select id={`order-product-${item.id}`}
                            value={item.productId}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { productId: e.target.value, stockAllocatedQty: undefined, supplierId: undefined, supplierName: undefined, purchaseCostKes: undefined })
                            }
                            className="ui-field w-full"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) · {p.availableQty} {p.unit} in hub
                              </option>
                            ))}
                          </select>
                          {prod && (
                            <div className="flex items-center gap-2 mt-1 ui-meta">
                              <span>SKU: {prod.sku}</span>
                              <span>·</span>
                              <span>Available for this line {item.availableStock} {prod.unit}</span>
                              {item.hasShortage && (
                                <span className="text-[var(--status-warning-fg)] font-semibold">
                                  Stock allocation exceeds this line’s limit
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label htmlFor={`order-quantity-${item.id}`} className="ui-label block mb-1">
                            Qty ({prod?.unit || 'units'})
                          </label>
                          <input id={`order-quantity-${item.id}`}
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { quantity: Number(e.target.value) })
                            }
                            className="ui-field w-full font-mono-tabular"
                          />
                        </div>

                        {/* Tier Price & Override */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor={`order-unit-price-${item.id}`} className="ui-label">
                              Selling Price (KES/{prod?.unit || 'u'})
                            </label>
                            <span className="text-xs text-[var(--brand-accent)] font-semibold">
                              {item.pricingTier}
                            </span>
                          </div>
                          <input id={`order-unit-price-${item.id}`}
                            type="number"
                            placeholder={`Sched: ${item.defaultPrice}`}
                            value={item.overridePriceKes !== undefined ? item.overridePriceKes : ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                overridePriceKes: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className={`ui-field w-full font-mono-tabular ${item.isPriceBelowSchedule ? 'border-[var(--status-warning-border)] text-[var(--status-warning-fg)]' : ''}`}
                          />
                          {item.isPriceBelowSchedule && (
                            <div className="text-xs text-[var(--status-warning-fg)] mt-0.5">
                              Below schedule (Needs approval)
                            </div>
                          )}
                        </div>

                        {/* Line Total & Remove */}
                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-4">
                          <div className="text-right">
                            <div className="ui-meta">Line Total</div>
                            <div className="font-mono-tabular font-semibold text-xs text-[var(--text-primary)]">
                              KES {item.lineTotal.toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={formItems.length <= 1}
                            onClick={() => handleRemoveItem(item.id)}
                            className="ui-button ui-button-ghost ui-button-icon ui-button-compact hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger-fg)]"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sourcing Strategy Row (Hybrid Operating Model) */}
                      <div className="pt-2.5 border-t border-[var(--border-subtle)]/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                        <div className="sm:col-span-4">
                          <label htmlFor={`order-source-${item.id}`} className="ui-label block mb-1">
                            Sourcing Fulfillment Mode
                          </label>
                          <select id={`order-source-${item.id}`}
                            value={item.sourcingMode}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                sourcingMode: e.target.value as FormLineItem['sourcingMode'],
                                stockAllocatedQty: undefined,
                              })
                            }
                            className="ui-field w-full"
                          >
                            <option value="direct_procurement">Farm-to-Client Direct Procurement</option>
                            <option value="existing_stock">Warehouse FEFO Stock</option>
                            <option value="mixed">Mixed (Stock + Direct Farm)</option>
                          </select>
                        </div>

                        {/* Connected Supplier & Farmgate Quoted Cost */}
                        {(isDirect || isMixed) ? (
                          <>
                            <div className="sm:col-span-5">
                              <label htmlFor={`order-supplier-${item.id}`} className="ui-label block mb-1">
                                Sourcing Farm / Cooperative
                              </label>
                              <select id={`order-supplier-${item.id}`}
                                value={item.supplierId || ''}
                                onChange={(e) => {
                                  const selectedSup = item.quotingSuppliers?.find((s) => s.supplierId === e.target.value);
                                  handleUpdateItem(item.id, {
                                    supplierId: e.target.value,
                                    supplierName: selectedSup?.supplierName,
                                    purchaseCostKes: selectedSup?.quotingPriceKes,
                                  });
                                }}
                                className="ui-field w-full"
                              >
                                <option value="">No preferred supplier</option>
                                {item.quotingSuppliers && item.quotingSuppliers.length > 0 && (
                                  item.quotingSuppliers.map((qs, qsIdx) => (
                                    <option key={qs.supplierId || `sup-${qsIdx}`} value={qs.supplierId}>
                                      {qs.supplierName}{qs.quotingPriceKes ? ` · KES ${qs.quotingPriceKes}/${prod?.unit}` : ''}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <label htmlFor={`order-source-cost-${item.id}`} className="ui-label block mb-1">
                                Est. Purchase Cost (KES/{prod?.unit})
                              </label>
                              <input id={`order-source-cost-${item.id}`}
                                type="number"
                                value={item.purchaseCostKes || ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    purchaseCostKes: Number(e.target.value),
                                  })
                                }
                                placeholder="Farmgate cost"
                                className="ui-field w-full font-mono-tabular"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-8 flex items-center gap-2 ui-meta">
                            <span className="font-semibold text-[var(--brand-accent)]">FEFO Warehouse Allocation:</span>
                            <span>{item.quantity} {prod?.unit} to reserve from available stock.</span>
                          </div>
                        )}
                        {isMixed && (
                          <div className="grid items-end gap-3 sm:col-span-12 sm:grid-cols-2">
                            <label className="ui-label">Reserve from stock ({prod?.unit})
                              <input type="number" min="0" step="any" max={Math.min(item.quantity, item.availableStock)}
                                value={item.stockAllocatedQty} onChange={(e) => handleUpdateItem(item.id, { stockAllocatedQty: e.target.value === '' ? undefined : Number(e.target.value) })}
                                className="ui-field mt-1 block w-full" />
                            </label>
                            <p className="py-2 text-sm text-[var(--text-secondary)]">Source directly <strong className="text-[var(--text-primary)]">{item.directProcuredQty} {prod?.unit}</strong></p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Order Summary Bar (Section 3.3) */}
            <div className="ui-surface bg-[var(--bg-subtle)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="ui-meta">Distinct SKUs</div>
                  <div className="text-base font-semibold">{formItems.length} Products</div>
                </div>
                <div>
                  <div className="ui-meta">Direct Procurement</div>
                  <div className="text-base font-semibold font-mono-tabular text-[var(--brand-accent)]">
                    {totalDirectProcuredUnits} Units
                  </div>
                </div>
                <div>
                  <div className="ui-meta">Hub Stock Allocation</div>
                  <div className="text-base font-semibold font-mono-tabular text-[var(--status-success-fg)]">
                    {totalStockAllocatedUnits} Units
                  </div>
                </div>
                <div>
                  <div className="ui-meta">Logistics Flow</div>
                  <div className="text-xs font-semibold flex items-center gap-1 mt-0.5">
                    {totalDirectProcuredUnits > 0 ? (
                      <span className="text-[var(--brand-accent)] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Farm-to-Client Demand Flow</span>
                      </span>
                    ) : (
                      <span className="text-[var(--status-success-fg)] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100% Stock Allocated</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border-subtle)]">
                <div className="ui-meta">Invoiced Total (KES)</div>
                <div className="text-xl font-bold font-mono-tabular text-[var(--brand-accent)]">
                  KES {orderSubtotalKes.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="orders-notes" className="ui-label block mb-1">
                Fulfillment Notes & Instructions
              </label>
              <textarea id="orders-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific packing requirements, cold room segregation, or driver notes..."
                className="ui-field w-full"
              />
            </div>

            {/* Form actions */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="ui-button ui-button-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ui-button ui-button-primary"
              >
                <span>Review Order & Allocations</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Order Review Step (Section 3.6) */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="ui-meta">Client Institution</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {selectedCustomer?.name}
                  </div>
                  <div className="ui-meta">
                    {selectedCustomer?.segment} · {selectedCustomer?.paymentTerms}
                  </div>
                </div>
                <div>
                  <div className="ui-meta">Delivery Destination</div>
                  <div className="font-medium text-[var(--text-primary)] mt-0.5">
                    {deliveryAddress || 'Standard Warehouse Dispatch'}
                  </div>
                  <div className="ui-meta">
                    Target: {deliveryDate} · Hub: {warehouseName}
                  </div>
                </div>
                <div>
                  <div className="ui-meta">Order Channel & PO</div>
                  <div className="font-medium text-[var(--text-primary)] mt-0.5">
                    {channel}
                  </div>
                  <div className="ui-meta font-mono-tabular">
                    Ref: {orderReference || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {composerError && <p role="alert" className="rounded-lg bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger-fg)]">{composerError}</p>}

            {/* Warnings banner if shortage or overrides exist */}
            {(hasAnyShortage || hasAnyApprovalRequired) && (
              <div className="p-3.5 rounded-xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-xs space-y-1">
                {hasAnyShortage && (
                  <div className="text-[var(--status-warning-fg)] flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Adjust the stock quantities or switch the affected lines to mixed or direct sourcing.</span>
                  </div>
                )}
                {hasAnyApprovalRequired && (
                  <div className="text-[var(--status-warning-fg)] flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Price overrides below schedule will trigger commercial supervisor sign-off.</span>
                  </div>
                )}
              </div>
            )}

            {/* Itemized Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
              <table className="ui-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product SKU</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {computedLineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-canvas)]/40">
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[var(--text-primary)]">{item.product?.name}</div>
                        <div className="ui-meta font-mono-tabular">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {item.quantity} {item.product?.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-medium">
                          {item.pricingTier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        KES {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold">
                        KES {item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] font-semibold">
                    <td colSpan={5} className="py-3 px-3 text-right text-xs">
                      Grand Order Total:
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-sm text-[var(--brand-accent)]">
                      KES {orderSubtotalKes.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setComposerStep('compose')}
                className="ui-button ui-button-secondary"
              >
                Back to Edit
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateOrder(true)}
                  disabled={submittingOrder}
                  className="ui-button ui-button-secondary"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateOrder(false)}
                  disabled={submittingOrder || hasAnyShortage}
                  className="ui-button ui-button-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingOrder ? 'Creating order…' : 'Confirm order'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Order Workbench...</div>}>
      <OrdersWorkbenchContent />
    </Suspense>
  );
}

'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
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
    customers,
    products,
    warehouses,
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
  const [orderReference, setOrderReference] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [composerStep, setComposerStep] = useState<'compose' | 'review'>('compose');

  interface FormLineItem {
    id: string;
    productId: string;
    quantity: number;
    overridePriceKes?: number;
    sourcingMode?: 'direct_procurement' | 'existing_stock' | 'mixed';
    stockAllocatedQty?: number;
    directProcuredQty?: number;
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

  // Synchronize customer details (segment, delivery zone, default PO ref)
  useEffect(() => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      if (cust.isInstitutional) {
        setChannel('Institutional Contract');
      }
      setDeliveryAddress(`${cust.deliveryZone}, ${cust.county} (Attn: ${cust.procurementContact})`);
      setOrderReference(`PO-${cust.code}-${new Date().getFullYear()}-01`);
    }
  }, [customerId, customers]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  // Dynamic pricing & stock calculation per line item (Section 3.2, 3.3, 3.4)
  const computedLineItems = useMemo(() => {
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
      const available = prod?.availableQty || 0;

      // Default sourcing mode: if direct is specified or stock is insufficient, direct procurement
      const mode = item.sourcingMode || (qty > available ? 'direct_procurement' : 'existing_stock');
      const isDirectOnly = mode === 'direct_procurement';
      const isStockOnly = mode === 'existing_stock';

      const stockAllocated = item.stockAllocatedQty !== undefined
        ? item.stockAllocatedQty
        : isDirectOnly
        ? 0
        : Math.min(qty, available);

      const directProcured = item.directProcuredQty !== undefined
        ? item.directProcuredQty
        : isDirectOnly
        ? qty
        : Math.max(0, qty - stockAllocated);

      const hasShortage = isStockOnly && qty > available;
      const isPriceBelowSchedule =
        item.overridePriceKes !== undefined &&
        item.overridePriceKes > 0 &&
        item.overridePriceKes < defaultPrice;

      const quotingSuppliers = prod ? getSuppliersForProduct(prod.id) : [];
      const activeSupplier = quotingSuppliers.find((s) => s.supplierId === item.supplierId) || quotingSuppliers[0];
      const purchaseCost = item.purchaseCostKes !== undefined
        ? item.purchaseCostKes
        : (activeSupplier?.quotingPriceKes || prod?.costPriceKes || 0);

      return {
        ...item,
        sourcingMode: mode,
        stockAllocatedQty: stockAllocated,
        directProcuredQty: directProcured,
        supplierId: item.supplierId || activeSupplier?.supplierId,
        supplierName: item.supplierName || activeSupplier?.supplierName,
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
    setFormItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<FormLineItem>) => {
    setFormItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  const handleCreateOrder = async (isDraft: boolean = false) => {
    const validItems = computedLineItems.filter((it) => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setFeedback({
        msg: 'Order must contain at least one valid line item with quantity > 0.',
        type: 'error',
      });
      return;
    }

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

    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setComposerStep('compose');
      setFormItems([{ id: 'line-1', productId: products[0]?.id || '', quantity: 50, sourcingMode: 'direct_procurement' }]);
      setNotes('');
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
      case 'Packed':
        return 'Dispatch Fleet';
      case 'Dispatched':
        return 'Confirm Delivery';
      case 'On Hold':
        return 'Release Hold';
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
      case 'Packed':
        return 'Dispatched';
      case 'Dispatched':
        return 'Delivered';
      case 'On Hold':
        return 'Confirmed';
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
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 22 & 31) */}
      <PageHeader
        kicker="FULFILLMENT WORKBENCH & INSTITUTIONAL SUPPLY"
        title="Order Fulfillment Workbench"
        description="Move institutional contracts, termly school tenders, and commercial orders toward successful on-time fulfillment with FEFO inventory allocation."
        actions={
          <div className="flex items-center gap-2">
            {can('orders.export') && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-10 px-4 rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-2 hover:border-[#4EB462] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                <span className="hidden sm:inline">Export Manifest</span>
              </button>
            )}
            {can('orders.create') && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-10 px-4 rounded-[10px] bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
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
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-canvas)] overflow-x-auto border border-[var(--border-subtle)]">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#1F6A37] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by order # or customer..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer & Segment</th>
                  <th className="py-3 px-4">Delivery & Hub</th>
                  <th className="py-3 px-4">Payment State</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Value (KES)</th>
                  <th className="py-3 px-4 text-right">Primary Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.orderNumber}
                      <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                        {ord.channel}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {ord.customerSegment} · {ord.itemsCount} line item(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono-tabular text-[var(--text-primary)]">
                        {ord.deliveryDate}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {ord.warehouseName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          ord.paymentStatus === 'Paid'
                            ? 'text-[#1F6A37] dark:text-[#4EB462]'
                            : 'text-amber-600 dark:text-amber-400'
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
                        {ord.status !== 'Delivered' && ord.status !== 'Closed' && (
                          <button
                            type="button"
                            onClick={() => handleQuickAdvance(ord)}
                            className="h-8 px-3 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{getNextStageLabel(ord.status)}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="h-8 px-2.5 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] inline-flex items-center gap-1 cursor-pointer"
                          title="Inspect Details"
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
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {ord.customerName}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Delivery: {ord.deliveryDate} · {ord.warehouseName}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    KES {ord.totalKes.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ord.status !== 'Delivered' && (
                      <button
                        type="button"
                        onClick={() => handleQuickAdvance(ord)}
                        className="px-3 py-1 rounded-full bg-[#1F6A37] text-white text-xs font-semibold cursor-pointer"
                      >
                        {getNextStageLabel(ord.status)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(ord)}
                      className="px-2.5 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
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
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Current Lifecycle State
                </div>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--text-secondary)]">
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
                {selectedOrder.items.map((item, idx) => {
                  const isDirect = item.sourcingMode === 'direct_procurement';
                  const isMixed = item.sourcingMode === 'mixed';

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.productName}
                          </span>
                          {isDirect ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Direct Farm Procurement
                            </span>
                          ) : isMixed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                              Mixed Sourcing
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                              FEFO Hub Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {isDirect ? (
                            <span>
                              Farm Partner: <strong className="text-[var(--text-primary)]">{item.supplierName || 'Cooperative Partner'}</strong>
                              {item.purchaseCostKes ? ` · Farmgate Cost: KES ${item.purchaseCostKes}/${item.unit}` : ''}
                            </span>
                          ) : isMixed ? (
                            <span>
                              Allocated: <strong>{item.stockAllocatedQty || 0} {item.unit}</strong> stock · <strong>{item.directProcuredQty || 0} {item.unit}</strong> direct from {item.supplierName || 'Farm'}
                            </span>
                          ) : (
                            <span>
                              Batch: <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">{item.allocatedBatch}</span>
                            </span>
                          )}
                          <span> · {item.quantity} {item.unit} @ KES {item.unitPriceKes} ({item.pricingTier})</span>
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

            {/* Contextual Actions (Section 22: View, Fulfill, Hold, Dispatch, Collect Payment) */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Workflow Decisions
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Confirmed',
                    'Picking',
                    'Packed',
                    'Dispatched',
                    'Delivered',
                    'On Hold',
                  ] as OrderLifecycleStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={selectedOrder.status === st}
                    onClick={async () => {
                      const res = await advanceOrderStatus(selectedOrder.id, st);
                      setFeedback({
                        msg: res.message,
                        type: res.ok ? 'success' : 'error',
                      });
                      if (res.ok) setSelectedOrder({ ...selectedOrder, status: st });
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      selectedOrder.status === st
                        ? 'bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                        : st === 'On Hold'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'bg-[#1F6A37] hover:bg-[#12512C] text-white'
                    }`}
                  >
                    {st === 'On Hold' ? 'Place on Hold' : `Move to ${st}`}
                  </button>
                ))}
              </div>
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
        hasUnsavedChanges={formItems.length > 1 || Boolean(notes) || Boolean(orderReference)}
        onConfirmDiscard={() => {
          setCreateOpen(false);
          setComposerStep('compose');
          setFormItems([{ id: 'line-1', productId: products[0]?.id || '', quantity: 50 }]);
          setNotes('');
        }}
      >
        {composerStep === 'compose' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setComposerStep('review');
            }}
            className="space-y-5"
          >
            {/* Section A: Customer & Order Details */}
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Customer & Logistics Schedule</span>
                </span>
                {selectedCustomer && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E5EFE6] dark:bg-[#122719] text-[#1F6A37] dark:text-[#4EB462]">
                    {selectedCustomer.segment} · {selectedCustomer.paymentTerms}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Select Customer / Institution *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.segment} · {c.county})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Supply Channel *
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as OrderRecord['channel'])}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs cursor-pointer"
                  >
                    <option value="Institutional Contract">Institutional Contract</option>
                    <option value="Recurring Weekly">Recurring Weekly</option>
                    <option value="Tender Supply">Tender Supply</option>
                    <option value="Walk-In / Manual">Walk-In / Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Fulfillment Hub *
                  </label>
                  <select
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs cursor-pointer"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name} ({w.zoneType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Customer PO Reference
                  </label>
                  <input
                    type="text"
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    placeholder="e.g. PO-MOI-2026-441"
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Delivery Address & Receiving Point
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Specific kitchen gate, stores receiving bay, or contact person"
                    className="w-full h-10 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Dynamic Multi-Line Items Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                    <span>Order Products & Quantities ({formItems.length} Lines)</span>
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Tier pricing auto-applies by customer profile. Override requires authorization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="h-8 px-3 rounded-lg bg-[#E5EFE6] dark:bg-[#122719] hover:bg-[#1F6A37] hover:text-white text-[#1F6A37] dark:text-[#4EB462] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
                          ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Line number and product selector */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                            Line #{idx + 1} · Product SKU
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { productId: e.target.value })
                            }
                            className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) · {p.availableQty} {p.unit} in hub
                              </option>
                            ))}
                          </select>
                          {prod && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-secondary)]">
                              <span>SKU: {prod.sku}</span>
                              <span>·</span>
                              <span>Hub Stock: {prod.availableQty} {prod.unit}</span>
                              {item.hasShortage && (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  (Exceeds Stock — Switch to Direct Procurement)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                            Qty ({prod?.unit || 'units'})
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { quantity: Number(e.target.value) })
                            }
                            className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                          />
                        </div>

                        {/* Tier Price & Override */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-medium text-[var(--text-secondary)]">
                              Selling Price (KES/{prod?.unit || 'u'})
                            </label>
                            <span className="text-[10px] text-[#1F6A37] dark:text-[#4EB462] font-semibold">
                              {item.pricingTier}
                            </span>
                          </div>
                          <input
                            type="number"
                            placeholder={`Sched: ${item.defaultPrice}`}
                            value={item.overridePriceKes !== undefined ? item.overridePriceKes : ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                overridePriceKes: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className={`w-full h-9 px-2.5 rounded-lg bg-[var(--bg-canvas)] border text-xs font-mono-tabular ${
                              item.isPriceBelowSchedule
                                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                                : 'border-[var(--border-subtle)]'
                            }`}
                          />
                          {item.isPriceBelowSchedule && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                              Below schedule (Needs approval)
                            </div>
                          )}
                        </div>

                        {/* Line Total & Remove */}
                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-4">
                          <div className="text-right">
                            <div className="text-[10px] text-[var(--text-secondary)]">Line Total</div>
                            <div className="font-mono-tabular font-semibold text-xs text-[var(--text-primary)]">
                              KES {item.lineTotal.toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={formItems.length <= 1}
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sourcing Strategy Row (Hybrid Operating Model) */}
                      <div className="pt-2.5 border-t border-[var(--border-subtle)]/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                            Sourcing Fulfillment Mode
                          </label>
                          <select
                            value={item.sourcingMode}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                sourcingMode: e.target.value as FormLineItem['sourcingMode'],
                              })
                            }
                            className="w-full h-8 px-2.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-medium cursor-pointer"
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
                              <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                                Sourcing Farm / Cooperative
                              </label>
                              <select
                                value={item.supplierId || ''}
                                onChange={(e) => {
                                  const selectedSup = item.quotingSuppliers?.find((s) => s.supplierId === e.target.value);
                                  handleUpdateItem(item.id, {
                                    supplierId: e.target.value,
                                    supplierName: selectedSup?.supplierName,
                                    purchaseCostKes: selectedSup?.quotingPriceKes,
                                  });
                                }}
                                className="w-full h-8 px-2.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] cursor-pointer"
                              >
                                {item.quotingSuppliers && item.quotingSuppliers.length > 0 ? (
                                  item.quotingSuppliers.map((qs) => (
                                    <option key={qs.supplierId} value={qs.supplierId}>
                                      {qs.supplierName} (KES {qs.quotingPriceKes}/{prod?.unit} · {qs.leadTimeDays}d lead · Min {qs.minOrderQty})
                                    </option>
                                  ))
                                ) : (
                                  <option value="">No quoting supplier configured (General Sourcing)</option>
                                )}
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                                Est. Purchase Cost (KES/{prod?.unit})
                              </label>
                              <input
                                type="number"
                                value={item.purchaseCostKes || ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    purchaseCostKes: Number(e.target.value),
                                  })
                                }
                                placeholder="Farmgate cost"
                                className="w-full h-8 px-2.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono-tabular"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-8 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                            <span className="font-semibold text-[#1F6A37] dark:text-[#4EB462]">FEFO Warehouse Allocation:</span>
                            <span>{item.quantity} {prod?.unit} reserved from cold hub inventory batch.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Order Summary Bar (Section 3.3) */}
            <div className="p-4 rounded-xl bg-[#08190C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">Distinct SKUs</div>
                  <div className="text-base font-semibold">{formItems.length} Products</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">Direct Procurement</div>
                  <div className="text-base font-semibold font-mono-tabular text-[#4EB462]">
                    {totalDirectProcuredUnits} Units
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">Hub Stock Allocation</div>
                  <div className="text-base font-semibold font-mono-tabular text-emerald-300">
                    {totalStockAllocatedUnits} Units
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">Logistics Flow</div>
                  <div className="text-xs font-semibold flex items-center gap-1 mt-0.5">
                    {totalDirectProcuredUnits > 0 ? (
                      <span className="text-[#4EB462] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Farm-to-Client Demand Flow</span>
                      </span>
                    ) : (
                      <span className="text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100% Stock Allocated</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Invoiced Total (KES)</div>
                <div className="text-xl font-bold font-mono-tabular text-[#4EB462]">
                  KES {orderSubtotalKes.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Fulfillment Notes & Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific packing requirements, cold room segregation, or driver notes..."
                className="w-full p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>

            {/* Form actions */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-10 px-4 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
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
                  <div className="text-[11px] text-[var(--text-secondary)]">Client Institution</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {selectedCustomer?.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {selectedCustomer?.segment} · {selectedCustomer?.paymentTerms}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Delivery Destination</div>
                  <div className="font-medium text-[var(--text-primary)] mt-0.5">
                    {deliveryAddress || 'Standard Warehouse Dispatch'}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Target: {deliveryDate} · Hub: {warehouseName}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Order Channel & PO</div>
                  <div className="font-medium text-[var(--text-primary)] mt-0.5">
                    {channel}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono-tabular">
                    Ref: {orderReference || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings banner if shortage or overrides exist */}
            {(hasAnyShortage || hasAnyApprovalRequired) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                {hasAnyShortage && (
                  <div className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>One or more products exceed immediate hub stock. Stock override approval required.</span>
                  </div>
                )}
                {hasAnyApprovalRequired && (
                  <div className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Price overrides below schedule will trigger commercial supervisor sign-off.</span>
                  </div>
                )}
              </div>
            )}

            {/* Itemized Table */}
            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
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
                        <div className="text-[10px] text-[var(--text-secondary)] font-mono-tabular">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {item.quantity} {item.product?.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-medium">
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
                    <td className="py-3 px-3 text-right font-mono-tabular text-sm text-[#1F6A37] dark:text-[#4EB462]">
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
                className="h-10 px-4 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Back to Edit
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateOrder(true)}
                  className="h-10 px-4 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateOrder(false)}
                  className="h-10 px-5 rounded-lg bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Create Order</span>
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

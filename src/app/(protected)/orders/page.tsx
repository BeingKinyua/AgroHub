'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShoppingBag,
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

    if (orderNumParam) {
      setSearch(orderNumParam);
      const match = orders.find((o) => o.orderNumber.toLowerCase() === orderNumParam.toLowerCase());
      if (match) setSelectedOrder(match);
    }
  }, [searchParams, orders]);

  // Form state for New Order
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [channel, setChannel] = useState<OrderRecord['channel']>('Institutional Contract');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-01');
  const [warehouseName, setWarehouseName] = useState(warehouses[0]?.name || 'Nairobi Cold Hub A');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(100);
  const [overridePrice, setOverridePrice] = useState('');
  const [notes, setNotes] = useState('');

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

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createOrder({
      customerId,
      channel,
      deliveryDate,
      warehouseName,
      productId,
      quantity: Number(quantity),
      overridePriceKes: overridePrice ? Number(overridePrice) : undefined,
      notes,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setOverridePrice('');
      setNotes('');
    }
  };

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
                className="h-10 px-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-2 hover:border-[#4EB462] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                <span className="hidden sm:inline">Export Manifest</span>
              </button>
            )}
            {can('orders.create') && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
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
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-canvas)] overflow-x-auto">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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
              className="w-full h-9 pl-9 pr-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
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
                            className="h-8 px-3 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{getNextStageLabel(ord.status)}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="h-8 px-2.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] inline-flex items-center gap-1 cursor-pointer"
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
                Allocated FEFO Line Items
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Batch:{' '}
                        <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                          {item.allocatedBatch}
                        </span>{' '}
                        · {item.quantity} {item.unit} @ KES {item.unitPriceKes} ({item.pricingTier})
                      </div>
                    </div>
                    <div className="font-mono-tabular font-semibold">
                      KES {item.lineTotalKes.toLocaleString()}
                    </div>
                  </div>
                ))}
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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

      {/* New Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Institutional Order"
        subtitle="Automated FEFO inventory allocation and pricing validation"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Customer / Institutional Client
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.segment} · {c.paymentTerms})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Supply Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as OrderRecord['channel'])}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Institutional Contract">Institutional Contract</option>
                <option value="Direct Sales">Direct Sales</option>
                <option value="Online Portal">Online Portal</option>
                <option value="Market Off-Take">Market Off-Take</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Fulfillment Hub
              </label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Target Product SKU
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.availableQty} {p.unit} avail)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Order Quantity ({selectedProduct?.unit || 'units'})
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Delivery Target Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Price Override (KES, optional)
              </label>
              <input
                type="number"
                placeholder={selectedProduct ? `Default: ${selectedProduct.pricing.institutionalKes}` : ''}
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Submit Order
            </button>
          </div>
        </form>
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

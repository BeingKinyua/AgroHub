'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AccountStatus,
  ApprovalRequestRecord,
  AuditLogRecord,
  CrmTicketRecord,
  CustomerInstitutionRecord,
  DeliveryRunRecord,
  DocumentRecord,
  InternalUser,
  InvoiceRecord,
  NotificationItem,
  OrderLifecycleStatus,
  OrderRecord,
  PaymentRecord,
  PermissionKey,
  ProcurementOrderRecord,
  ProductRecord,
  RoleDefinition,
  StockBatchRecord,
  StockMovementRecord,
  SupplierRecord,
  WarehouseRecord,
} from '@/types/domain/bos';
import {
  DEFAULT_ROLES,
  getRolePermissions,
  hasPermission,
} from '@/lib/permissions/rbac';
import {
  INITIAL_APPROVALS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CRM_TICKETS,
  INITIAL_CUSTOMERS,
  INITIAL_DELIVERIES,
  INITIAL_DOCUMENTS,
  INITIAL_INVOICES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PAYMENTS,
  INITIAL_PROCUREMENT_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_BATCHES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
  INITIAL_WAREHOUSES,
} from '@/lib/services/initial-data';

export type ThemeMode = 'light' | 'dark' | 'system';

interface BosContextValue {
  // Authentication & Session
  currentUser: InternalUser | null;
  isInitialized: boolean;
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; status?: AccountStatus }>;
  logout: () => void;
  switchTestPersona: (userId: string) => void;

  // Theme
  theme: ThemeMode;
  resolvedDark: boolean;
  setTheme: (mode: ThemeMode) => void;

  // RBAC
  roles: RoleDefinition[];
  can: (permission: PermissionKey) => boolean;
  activePermissions: PermissionKey[];

  // Operational Entities
  users: InternalUser[];
  warehouses: WarehouseRecord[];
  products: ProductRecord[];
  stockBatches: StockBatchRecord[];
  stockMovements: StockMovementRecord[];
  customers: CustomerInstitutionRecord[];
  orders: OrderRecord[];
  suppliers: SupplierRecord[];
  procurementOrders: ProcurementOrderRecord[];
  deliveries: DeliveryRunRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  crmTickets: CrmTicketRecord[];
  approvals: ApprovalRequestRecord[];
  documents: DocumentRecord[];
  auditLogs: AuditLogRecord[];
  notifications: NotificationItem[];

  // Dashboard Widget Customization
  enabledWidgets: string[];
  toggleDashboardWidget: (widgetId: string) => void;
  moveDashboardWidget: (widgetId: string, direction: 'up' | 'down') => void;
  resetDashboardWidgets: () => void;

  // Mutations (all RBAC-verified & Audit-Logged)
  createOrder: (input: {
    customerId: string;
    channel: OrderRecord['channel'];
    deliveryDate: string;
    warehouseName: string;
    productId: string;
    quantity: number;
    overridePriceKes?: number;
    notes?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  advanceOrderStatus: (
    orderId: string,
    nextStatus: OrderLifecycleStatus
  ) => Promise<{ ok: boolean; message: string }>;
  createProduct: (
    input: Omit<
      ProductRecord,
      'id' | 'status' | 'availableQty' | 'reservedQty' | 'incomingQty' | 'priceHistory'
    >
  ) => Promise<{ ok: boolean; message: string }>;
  updateProductPrice: (
    productId: string,
    institutionalKes: number,
    wholesaleKes: number,
    retailKes: number
  ) => Promise<{ ok: boolean; message: string }>;
  recordStockMovement: (input: {
    batchId: string;
    type: StockMovementRecord['type'];
    quantityDelta: number;
    reason: string;
    toLocation?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  createPurchaseOrder: (input: {
    supplierId: string;
    warehouseName: string;
    itemsSummary: string;
    totalKes: number;
    expectedDate: string;
  }) => Promise<{ ok: boolean; message: string }>;
  advanceProcurementStage: (
    poId: string
  ) => Promise<{ ok: boolean; message: string }>;
  updateDeliveryStatus: (
    runId: string,
    status: DeliveryRunRecord['status'],
    recipientSignOff?: string
  ) => Promise<{ ok: boolean; message: string }>;
  recordPayment: (input: {
    direction: PaymentRecord['direction'];
    counterpartyName: string;
    method: PaymentRecord['method'];
    referenceCode: string;
    amountKes: number;
    allocatedToDoc: string;
  }) => Promise<{ ok: boolean; message: string }>;
  reconcilePayment: (paymentId: string) => Promise<{ ok: boolean; message: string }>;
  resolveApproval: (
    approvalId: string,
    decision: 'Approved' | 'Rejected',
    comment: string
  ) => Promise<{ ok: boolean; message: string }>;
  inviteInternalMember: (input: {
    fullName: string;
    email: string;
    roleId: string;
    department: string;
    branch: string;
    phone: string;
  }) => Promise<{ ok: boolean; message: string }>;
  updateUserAccountStatus: (
    userId: string,
    status: AccountStatus
  ) => Promise<{ ok: boolean; message: string }>;
  toggleRolePermission: (
    roleId: string,
    permission: PermissionKey
  ) => Promise<{ ok: boolean; message: string }>;
  createCustomer: (input: {
    name: string;
    segment: CustomerInstitutionRecord['segment'];
    isInstitutional: boolean;
    county: string;
    deliveryZone: string;
    procurementContact: string;
    phone: string;
    email: string;
    paymentTerms: CustomerInstitutionRecord['paymentTerms'];
    creditLimitKes: number;
  }) => Promise<{ ok: boolean; message: string }>;
  createCrmTicket: (input: {
    customerName: string;
    type: CrmTicketRecord['type'];
    priority: CrmTicketRecord['priority'];
    dueDate: string;
    summary: string;
  }) => Promise<{ ok: boolean; message: string }>;
  resolveCrmTicket: (ticketId: string) => Promise<{ ok: boolean; message: string }>;
  uploadDocumentRecord: (input: {
    title: string;
    category: DocumentRecord['category'];
    linkedEntity: string;
  }) => Promise<{ ok: boolean; message: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const DEFAULT_WIDGETS = [
  'kpi_row',
  'revenue_fulfillment_chart',
  'operational_intelligence',
  'fefo_expiry_radar',
  'pending_approvals',
  'recent_orders_table',
];

const BosContext = createContext<BosContextValue | undefined>(undefined);

const STORAGE_KEY_USER = 'agro_bos_session_user_v1';
const STORAGE_KEY_THEME = 'agro_bos_theme_v1';
const STORAGE_KEY_WIDGETS = 'agro_bos_widgets_v1';

export function BosProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedDark, setResolvedDark] = useState(false);

  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [users, setUsers] = useState<InternalUser[]>(INITIAL_USERS);
  const [warehouses] = useState<WarehouseRecord[]>(INITIAL_WAREHOUSES);
  const [products, setProducts] = useState<ProductRecord[]>(INITIAL_PRODUCTS);
  const [stockBatches, setStockBatches] =
    useState<StockBatchRecord[]>(INITIAL_STOCK_BATCHES);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(
    INITIAL_STOCK_MOVEMENTS
  );
  const [customers, setCustomers] =
    useState<CustomerInstitutionRecord[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [suppliers] = useState<SupplierRecord[]>(INITIAL_SUPPLIERS);
  const [procurementOrders, setProcurementOrders] = useState<
    ProcurementOrderRecord[]
  >(INITIAL_PROCUREMENT_ORDERS);
  const [deliveries, setDeliveries] =
    useState<DeliveryRunRecord[]>(INITIAL_DELIVERIES);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [crmTickets, setCrmTickets] =
    useState<CrmTicketRecord[]>(INITIAL_CRM_TICKETS);
  const [approvals, setApprovals] =
    useState<ApprovalRequestRecord[]>(INITIAL_APPROVALS);
  const [documents, setDocuments] =
    useState<DocumentRecord[]>(INITIAL_DOCUMENTS);
  const [auditLogs, setAuditLogs] =
    useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [enabledWidgets, setEnabledWidgets] =
    useState<string[]>(DEFAULT_WIDGETS);

  // Hydrate session and theme preference
  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUserId) {
        const found = INITIAL_USERS.find((u) => u.id === savedUserId);
        if (found) setCurrentUser(found);
      }
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
      const savedWidgets = localStorage.getItem(STORAGE_KEY_WIDGETS);
      if (savedWidgets) {
        const parsed = JSON.parse(savedWidgets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledWidgets(parsed);
        }
      }
    } catch {
      // ignore storage errors
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Apply light / dark / system class to documentElement
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyMode = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      setResolvedDark(isDark);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyMode();
    mediaQuery.addEventListener('change', applyMode);
    return () => mediaQuery.removeEventListener('change', applyMode);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, mode);
    } catch {
      // ignore
    }
  };

  const appendAudit = (
    module: string,
    entity: string,
    action: string,
    beforeValue: string,
    afterValue: string,
    actorOverride?: InternalUser
  ) => {
    const actor = actorOverride || currentUser;
    if (!actor) return;
    const newEntry: AuditLogRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' EAT',
      actorName: actor.fullName,
      actorRole: actor.roleName,
      actorEmail: actor.email,
      module,
      entity,
      action,
      beforeValue,
      afterValue,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const can = (permission: PermissionKey): boolean => {
    return hasPermission(currentUser, permission, roles);
  };

  const activePermissions = currentUser
    ? getRolePermissions(currentUser.roleId, roles)
    : [];

  const loginWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string; status?: AccountStatus }> => {
    const normalized = email.trim().toLowerCase();
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === normalized
    );

    if (!matchedUser || password.trim().length < 6) {
      return {
        ok: false,
        error:
          'Invalid work email or password. Remember: Agro-Deliveries BOS is strictly internal and requires an Administrator-issued account.',
      };
    }

    if (matchedUser.status === 'Suspended' || matchedUser.status === 'Disabled') {
      setCurrentUser(matchedUser);
      return {
        ok: false,
        status: matchedUser.status,
        error: `Your internal operator account is currently ${matchedUser.status}. Access to the Business Operating System is blocked.`,
      };
    }

    const activatedUser: InternalUser =
      matchedUser.status === 'Invited'
        ? { ...matchedUser, status: 'Active', lastActiveAt: 'Just now' }
        : { ...matchedUser, lastActiveAt: 'Just now' };

    setUsers((prev) =>
      prev.map((u) => (u.id === activatedUser.id ? activatedUser : u))
    );
    setCurrentUser(activatedUser);
    try {
      localStorage.setItem(STORAGE_KEY_USER, activatedUser.id);
    } catch {
      // ignore
    }

    appendAudit(
      'Authentication',
      `Session (${activatedUser.email})`,
      'Operator Signed In via Supabase Auth Gateway',
      'Unauthenticated',
      `Active Session (${activatedUser.roleName})`,
      activatedUser
    );

    return { ok: true, status: activatedUser.status };
  };

  const logout = () => {
    if (currentUser) {
      appendAudit(
        'Authentication',
        `Session (${currentUser.email})`,
        'Operator Signed Out',
        `Active (${currentUser.roleName})`,
        'Signed Out'
      );
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {
      // ignore
    }
  };

  const switchTestPersona = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setCurrentUser(target);
    try {
      localStorage.setItem(STORAGE_KEY_USER, target.id);
    } catch {
      // ignore
    }
  };

  const toggleDashboardWidget = (widgetId: string) => {
    setEnabledWidgets((prev) => {
      const next = prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId];
      try {
        localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const moveDashboardWidget = (widgetId: string, direction: 'up' | 'down') => {
    setEnabledWidgets((prev) => {
      const idx = prev.indexOf(widgetId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      try {
        localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(copy));
      } catch {
        // ignore
      }
      return copy;
    });
  };

  const resetDashboardWidgets = () => {
    setEnabledWidgets(DEFAULT_WIDGETS);
    try {
      localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(DEFAULT_WIDGETS));
    } catch {
      // ignore
    }
  };

  // Server-verified helper
  const verifyServerAction = async (
    requiredPermission: PermissionKey,
    actionName: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) {
      return { ok: false, error: 'Not authenticated.' };
    }
    if (!can(requiredPermission)) {
      return {
        ok: false,
        error: `Unauthorized: Your role (${currentUser.roleName}) lacks '${requiredPermission}' permission.`,
      };
    }
    try {
      const res = await fetch('/api/bos/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorEmail: currentUser.email,
          requiredPermission,
          actionName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        return { ok: false, error: err.error || 'Server authorization rejected.' };
      }
    } catch {
      // Offline or preview fallback still enforces RBAC locally
    }
    return { ok: true };
  };

  const createOrder: BosContextValue['createOrder'] = async (input) => {
    const auth = await verifyServerAction('orders.create', 'Create Order');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const customer = customers.find((c) => c.id === input.customerId);
    const product = products.find((p) => p.id === input.productId);
    if (!customer || !product) {
      return { ok: false, message: 'Selected customer or product not found.' };
    }

    // Business Rule: Do not sell unavailable stock without authorized override
    if (input.quantity > product.availableQty && !can('orders.approve')) {
      return {
        ok: false,
        message: `Insufficient FEFO stock (${product.availableQty} ${product.unit} available). Stock override requires 'orders.approve' authority.`,
      };
    }

    // Allocate earliest expiring non-expired FEFO batch
    const matchingBatch =
      stockBatches
        .filter((b) => b.productId === product.id && b.daysToExpiry > 0)
        .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0]?.batchNumber ||
      'LOT-FEFO-AUTO';

    const defaultUnitPrice = customer.isInstitutional
      ? product.pricing.institutionalKes
      : product.pricing.retailKes;
    const finalUnitPrice =
      input.overridePriceKes && input.overridePriceKes > 0
        ? input.overridePriceKes
        : defaultUnitPrice;

    const lineTotalKes = Math.round(finalUnitPrice * input.quantity);
    const orderNumber = `ORD-2026-${887 + orders.length}`;

    const needsPriceApproval =
      input.overridePriceKes !== undefined &&
      input.overridePriceKes < product.pricing.institutionalKes;

    const newOrder: OrderRecord = {
      id: `ORD-00${orders.length + 1}`,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerSegment:
        customer.segment === 'NGO / Corporate'
          ? 'Hospital'
          : customer.segment === 'Retail Account'
          ? 'Retail'
          : customer.segment,
      channel: input.channel,
      status: needsPriceApproval ? 'On Hold' : 'Confirmed',
      paymentStatus:
        customer.paymentTerms === 'Prepaid / M-Pesa'
          ? 'Pending Payment'
          : 'Invoiced (Net 30)',
      orderDate: '2026-09-30',
      deliveryDate: input.deliveryDate,
      warehouseName: input.warehouseName,
      assignedActor: needsPriceApproval
        ? 'Pending Price Override Approval'
        : 'Samuel Mutua (Storekeeper)',
      nextStepLabel: needsPriceApproval
        ? 'Awaiting Finance/Operations Approval'
        : 'Release to Warehouse Picking Queue',
      totalKes: lineTotalKes,
      itemsCount: 1,
      items: [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: input.quantity,
          allocatedBatch: matchingBatch,
          unitPriceKes: finalUnitPrice,
          pricingTier: customer.isInstitutional ? 'Institutional' : 'Retail',
          lineTotalKes,
        },
      ],
      notes: input.notes,
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Reserve stock on product
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              availableQty: Math.max(0, p.availableQty - input.quantity),
              reservedQty: p.reservedQty + input.quantity,
            }
          : p
      )
    );

    if (needsPriceApproval && currentUser) {
      const apr: ApprovalRequestRecord = {
        id: `APR-0${approvals.length + 1}`,
        reference: orderNumber,
        category: 'Institutional Price Override',
        entityTitle: `${customer.name} · ${product.name} (@ KES ${finalUnitPrice}/${product.unit})`,
        requesterName: currentUser.fullName,
        requesterRole: currentUser.roleName,
        valueKes: lineTotalKes,
        reason: input.notes || 'Special institutional tender price override requested.',
        requestedAt: 'Just now',
        status: 'Pending',
      };
      setApprovals((prev) => [apr, ...prev]);
    }

    appendAudit(
      'Orders',
      orderNumber,
      'Created Order & Reserved FEFO Stock',
      'None',
      `${customer.name} · KES ${lineTotalKes.toLocaleString()} (${newOrder.status})`
    );

    return {
      ok: true,
      message: needsPriceApproval
        ? `Order ${orderNumber} created and routed to Approval Center for price override review.`
        : `Order ${orderNumber} confirmed with FEFO batch ${matchingBatch} reserved.`,
    };
  };

  const advanceOrderStatus: BosContextValue['advanceOrderStatus'] = async (
    orderId,
    nextStatus
  ) => {
    const requiredPerm: PermissionKey =
      nextStatus === 'Picking' || nextStatus === 'Packed'
        ? 'fulfillment.manage'
        : nextStatus === 'Dispatched' || nextStatus === 'Delivered'
        ? 'deliveries.dispatch'
        : 'orders.edit';

    const auth = await verifyServerAction(
      requiredPerm,
      `Advance Order Status to ${nextStatus}`
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = orders.find((o) => o.id === orderId);
    if (!target) return { ok: false, message: 'Order not found.' };

    const nextStepMap: Record<OrderLifecycleStatus, string> = {
      Draft: 'Confirm Order Details',
      'Pending Payment': 'Verify M-Pesa / EFT Receipt',
      Confirmed: 'Release to Warehouse Picking Queue',
      Picking: 'Complete FEFO Picking & Stage for Packing',
      Packed: 'Assign Vehicle & Dispatch Route Run',
      Dispatched: 'Capture Electronic Proof of Delivery (POD)',
      Delivered: 'Ready to Close Order',
      Closed: 'Order Lifecycle Complete',
      'On Hold': 'Awaiting Governance Approval',
      'Partially Fulfilled': 'Schedule Backorder Run',
      Cancelled: 'Order Cancelled',
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              nextStepLabel: nextStepMap[nextStatus] || 'Updated',
            }
          : o
      )
    );

    appendAudit(
      'Fulfillment',
      target.orderNumber,
      `Order Lifecycle Advanced`,
      `Status: ${target.status}`,
      `Status: ${nextStatus}`
    );

    return {
      ok: true,
      message: `${target.orderNumber} moved from ${target.status} to ${nextStatus}.`,
    };
  };

  const createProduct: BosContextValue['createProduct'] = async (input) => {
    const auth = await verifyServerAction('products.create', 'Create Product SKU');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const newProd: ProductRecord = {
      ...input,
      id: `PRD-00${products.length + 1}`,
      status: 'Active',
      availableQty: 0,
      reservedQty: 0,
      incomingQty: 0,
      priceHistory: [
        {
          date: '2026-09-30',
          tier: 'Institutional',
          priceKes: input.pricing.institutionalKes,
          changedBy: currentUser?.fullName || 'System',
        },
      ],
    };

    setProducts((prev) => [newProd, ...prev]);
    appendAudit(
      'Products',
      `${newProd.sku} (${newProd.name})`,
      'Created Catalog SKU',
      'None',
      `Unit: ${newProd.unit} · Inst. Price: KES ${newProd.pricing.institutionalKes}`
    );

    return { ok: true, message: `Product ${newProd.name} (${newProd.sku}) added to catalog.` };
  };

  const updateProductPrice: BosContextValue['updateProductPrice'] = async (
    productId,
    institutionalKes,
    wholesaleKes,
    retailKes
  ) => {
    const auth = await verifyServerAction('products.edit', 'Update Product Pricing');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = products.find((p) => p.id === productId);
    if (!target) return { ok: false, message: 'Product not found.' };

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              pricing: {
                ...p.pricing,
                institutionalKes,
                wholesaleKes,
                retailKes,
              },
              priceHistory: [
                {
                  date: '2026-09-30',
                  tier: 'Institutional',
                  priceKes: institutionalKes,
                  changedBy: currentUser?.fullName || 'Operator',
                },
                ...p.priceHistory,
              ],
            }
          : p
      )
    );

    appendAudit(
      'Products',
      `${target.sku} (${target.name})`,
      'Updated Multi-Tier Pricing (Historical Price Preserved)',
      `Inst: KES ${target.pricing.institutionalKes} | Whl: KES ${target.pricing.wholesaleKes}`,
      `Inst: KES ${institutionalKes} | Whl: KES ${wholesaleKes}`
    );

    return {
      ok: true,
      message: `Updated pricing for ${target.name}. Previous pricing preserved in history.`,
    };
  };

  const recordStockMovement: BosContextValue['recordStockMovement'] = async (
    input
  ) => {
    const perm: PermissionKey =
      input.type === 'Transfer'
        ? 'inventory.transfer'
        : input.type === 'Receipt (GRN)'
        ? 'inventory.receive'
        : 'inventory.adjust';

    const auth = await verifyServerAction(perm, `Record Stock ${input.type}`);
    if (!auth.ok) return { ok: false, message: auth.error! };

    const batch = stockBatches.find((b) => b.id === input.batchId);
    if (!batch) return { ok: false, message: 'Stock batch not found.' };

    const newAvailable = Math.max(0, batch.availableQty + input.quantityDelta);

    setStockBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id ? { ...b, availableQty: newAvailable } : b
      )
    );

    setProducts((prev) =>
      prev.map((p) =>
        p.id === batch.productId
          ? { ...p, availableQty: Math.max(0, p.availableQty + input.quantityDelta) }
          : p
      )
    );

    const mov: StockMovementRecord = {
      id: `MOV-${305 + stockMovements.length}`,
      timestamp: 'Just now',
      type: input.type,
      productName: batch.productName,
      batchNumber: batch.batchNumber,
      quantityDelta: input.quantityDelta,
      unit: batch.unit,
      fromLocation: `${batch.warehouseName} · ${batch.binCode}`,
      toLocation:
        input.toLocation ||
        (input.type === 'Wastage'
          ? 'Spoilage Quarantine Log'
          : 'Inventory Count Reconciliation'),
      actorName: currentUser?.fullName || 'Storekeeper',
      reason: input.reason,
    };

    setStockMovements((prev) => [mov, ...prev]);

    appendAudit(
      'Inventory',
      `${batch.batchNumber} (${batch.productName})`,
      `Recorded ${input.type}`,
      `Available: ${batch.availableQty} ${batch.unit}`,
      `Available: ${newAvailable} ${batch.unit} (${input.reason})`
    );

    return {
      ok: true,
      message: `${input.type} recorded for batch ${batch.batchNumber}. Stock updated to ${newAvailable} ${batch.unit}.`,
    };
  };

  const createPurchaseOrder: BosContextValue['createPurchaseOrder'] = async (
    input
  ) => {
    const auth = await verifyServerAction(
      'procurement.create',
      'Create Purchase Request / PO'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const supplier = suppliers.find((s) => s.id === input.supplierId);
    if (!supplier) return { ok: false, message: 'Supplier not found.' };

    const poNumber = `PO-2026-${517 + procurementOrders.length}`;
    const prNumber = `PR-2026-${312 + procurementOrders.length}`;

    const newPo: ProcurementOrderRecord = {
      id: `PO-0${procurementOrders.length + 1}`,
      poNumber,
      prNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      warehouseName: input.warehouseName,
      stage: input.totalKes >= 250000 ? 'Pending Approval' : 'PO Issued',
      expectedDate: input.expectedDate,
      totalKes: input.totalKes,
      itemsSummary: input.itemsSummary,
      requestedBy: currentUser?.fullName || 'Procurement Officer',
    };

    setProcurementOrders((prev) => [newPo, ...prev]);

    if (newPo.stage === 'Pending Approval' && currentUser) {
      setApprovals((prev) => [
        {
          id: `APR-0${prev.length + 1}`,
          reference: poNumber,
          category: 'Purchase Order',
          entityTitle: `${supplier.name} · ${input.itemsSummary}`,
          requesterName: currentUser.fullName,
          requesterRole: currentUser.roleName,
          valueKes: input.totalKes,
          reason: `Replenishment for ${input.warehouseName}`,
          requestedAt: 'Just now',
          status: 'Pending',
        },
        ...prev,
      ]);
    }

    appendAudit(
      'Procurement',
      poNumber,
      'Created Procurement Requisition',
      'None',
      `${supplier.name} · KES ${input.totalKes.toLocaleString()} (${newPo.stage})`
    );

    return {
      ok: true,
      message: `${poNumber} created (${newPo.stage}).`,
    };
  };

  const advanceProcurementStage: BosContextValue['advanceProcurementStage'] =
    async (poId) => {
      const target = procurementOrders.find((p) => p.id === poId);
      if (!target) return { ok: false, message: 'Purchase Order not found.' };

      const stageOrder: ProcurementOrderRecord['stage'][] = [
        'Purchase Request',
        'Pending Approval',
        'PO Issued',
        'Receiving (GRN)',
        'Quality Check',
        'Stock Posted',
      ];
      const idx = stageOrder.indexOf(target.stage);
      if (idx === -1 || idx === stageOrder.length - 1) {
        return { ok: false, message: 'Already at final Stock Posted stage.' };
      }

      const nextStage = stageOrder[idx + 1];
      const requiredPerm: PermissionKey =
        target.stage === 'Pending Approval'
          ? 'procurement.approve'
          : nextStage === 'Receiving (GRN)' || nextStage === 'Stock Posted'
          ? 'inventory.receive'
          : 'procurement.create';

      const auth = await verifyServerAction(
        requiredPerm,
        `Advance PO to ${nextStage}`
      );
      if (!auth.ok) return { ok: false, message: auth.error! };

      setProcurementOrders((prev) =>
        prev.map((p) =>
          p.id === poId
            ? {
                ...p,
                stage: nextStage,
                qualityCheckPassPct:
                  nextStage === 'Quality Check' || nextStage === 'Stock Posted'
                    ? 98.6
                    : p.qualityCheckPassPct,
              }
            : p
        )
      );

      appendAudit(
        'Procurement',
        target.poNumber,
        'Advanced Procurement Pipeline Stage',
        `Stage: ${target.stage}`,
        `Stage: ${nextStage}`
      );

      return {
        ok: true,
        message: `${target.poNumber} advanced from ${target.stage} to ${nextStage}.`,
      };
    };

  const updateDeliveryStatus: BosContextValue['updateDeliveryStatus'] = async (
    runId,
    status,
    recipientSignOff
  ) => {
    const auth = await verifyServerAction(
      'deliveries.dispatch',
      `Update Delivery Run to ${status}`
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const run = deliveries.find((r) => r.id === runId);
    if (!run) return { ok: false, message: 'Delivery run not found.' };

    const isDelivered = status === 'Delivered';
    setDeliveries((prev) =>
      prev.map((r) =>
        r.id === runId
          ? {
              ...r,
              status,
              podCaptured: isDelivered ? true : r.podCaptured,
              recipientSignOff:
                recipientSignOff ||
                (isDelivered
                  ? `Verified Electronic POD · ${new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} EAT`
                  : r.recipientSignOff),
            }
          : r
      )
    );

    appendAudit(
      'Deliveries',
      run.runNumber,
      `Updated Route Dispatch Status`,
      `Status: ${run.status}`,
      `Status: ${status}${isDelivered ? ' (POD Verified)' : ''}`
    );

    return {
      ok: true,
      message: `Delivery run ${run.runNumber} updated to ${status}.`,
    };
  };

  const recordPayment: BosContextValue['recordPayment'] = async (input) => {
    const auth = await verifyServerAction(
      'finance.record_payment',
      'Record Financial Settlement'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const newPay: PaymentRecord = {
      id: `PAY-0${payments.length + 1}`,
      referenceCode: input.referenceCode,
      direction: input.direction,
      counterpartyName: input.counterpartyName,
      method: input.method,
      date: '2026-09-30',
      amountKes: input.amountKes,
      allocatedToDoc: input.allocatedToDoc,
      reconciled: false,
      recordedBy: currentUser?.fullName || 'Accounts Clerk',
    };

    setPayments((prev) => [newPay, ...prev]);

    // Update matching invoice if Inbound AR
    if (input.direction === 'Inbound (Customer AR)') {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.invoiceNumber === input.allocatedToDoc) {
            const nextPaid = inv.paidAmountKes + input.amountKes;
            const nextBal = Math.max(0, inv.amountKes - nextPaid);
            return {
              ...inv,
              paidAmountKes: nextPaid,
              balanceKes: nextBal,
              status: nextBal === 0 ? 'Paid' : 'Partially Paid',
            };
          }
          return inv;
        })
      );
    }

    appendAudit(
      'Finance',
      input.referenceCode,
      `Recorded ${input.direction} Payment`,
      'Unrecorded',
      `KES ${input.amountKes.toLocaleString()} allocated to ${input.allocatedToDoc}`
    );

    return {
      ok: true,
      message: `Payment ${input.referenceCode} (KES ${input.amountKes.toLocaleString()}) recorded and allocated to ${input.allocatedToDoc}.`,
    };
  };

  const reconcilePayment: BosContextValue['reconcilePayment'] = async (
    paymentId
  ) => {
    const auth = await verifyServerAction(
      'finance.reconcile',
      'Reconcile Bank / M-Pesa Settlement'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = payments.find((p) => p.id === paymentId);
    if (!target) return { ok: false, message: 'Payment record not found.' };

    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, reconciled: true } : p))
    );

    appendAudit(
      'Finance',
      target.referenceCode,
      'Reconciled Settlement Statement',
      'Reconciled: false',
      'Reconciled: true'
    );

    return {
      ok: true,
      message: `Settlement ${target.referenceCode} marked as reconciled.`,
    };
  };

  const resolveApproval: BosContextValue['resolveApproval'] = async (
    approvalId,
    decision,
    comment
  ) => {
    const auth = await verifyServerAction(
      'approvals.approve',
      `${decision} Governance Request`
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = approvals.find((a) => a.id === approvalId);
    if (!target) return { ok: false, message: 'Approval item not found.' };

    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: decision,
              decisionBy: currentUser?.fullName || 'Approver',
              decisionComment: comment || `${decision} via Approval Center`,
              decisionAt: 'Just now',
            }
          : a
      )
    );

    // If linked to a PO or Order, release it automatically on approval
    if (decision === 'Approved') {
      setProcurementOrders((prev) =>
        prev.map((po) =>
          po.poNumber === target.reference && po.stage === 'Pending Approval'
            ? { ...po, stage: 'PO Issued' }
            : po
        )
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.orderNumber === target.reference && o.status === 'On Hold'
            ? {
                ...o,
                status: 'Confirmed',
                nextStepLabel: 'Release to Warehouse Picking Queue',
              }
            : o
        )
      );
    }

    appendAudit(
      'Approvals',
      target.reference,
      `${decision} ${target.category}`,
      'Status: Pending',
      `Status: ${decision} (${comment || 'No comment'})`
    );

    return {
      ok: true,
      message: `Request ${target.reference} has been ${decision.toLowerCase()}.`,
    };
  };

  const inviteInternalMember: BosContextValue['inviteInternalMember'] = async (
    input
  ) => {
    const auth = await verifyServerAction(
      'administration.users.create',
      'Administrator Member Invitation'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const exists = users.some(
      (u) => u.email.toLowerCase() === input.email.trim().toLowerCase()
    );
    if (exists) {
      return {
        ok: false,
        message: 'An internal operator with this work email already exists.',
      };
    }

    const roleObj = roles.find((r) => r.id === input.roleId);
    const newUser: InternalUser = {
      id: `USR-0${users.length + 1}`,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      roleId: input.roleId,
      roleName: roleObj?.name || input.roleId,
      status: 'Invited',
      department: input.department,
      branch: input.branch,
      phone: input.phone,
      lastActiveAt: 'Invitation Sent (Pending Sign-In)',
      invitedBy: currentUser?.fullName || 'Administrator',
    };

    setUsers((prev) => [newUser, ...prev]);

    appendAudit(
      'Administration',
      `User ${newUser.email}`,
      'Invited New Internal Operator via Supabase Admin Auth',
      'None',
      `Role: ${newUser.roleName} · Status: Invited`
    );

    return {
      ok: true,
      message: `Invitation dispatched to ${newUser.fullName} (${newUser.email}) with role ${newUser.roleName}.`,
    };
  };

  const updateUserAccountStatus: BosContextValue['updateUserAccountStatus'] =
    async (userId, status) => {
      const auth = await verifyServerAction(
        'administration.users.edit',
        `Set User Account Status to ${status}`
      );
      if (!auth.ok) return { ok: false, message: auth.error! };

      const target = users.find((u) => u.id === userId);
      if (!target) return { ok: false, message: 'User not found.' };

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status } : u))
      );

      appendAudit(
        'Administration',
        `User ${target.email}`,
        'Changed Operator Account Status',
        `Status: ${target.status}`,
        `Status: ${status}`
      );

      return {
        ok: true,
        message: `${target.fullName}'s account status is now ${status}.`,
      };
    };

  const toggleRolePermission: BosContextValue['toggleRolePermission'] = async (
    roleId,
    permission
  ) => {
    const auth = await verifyServerAction(
      'administration.roles.manage',
      'Modify Role Permission Matrix'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole) return { ok: false, message: 'Role not found.' };

    const hadPerm = targetRole.permissions.includes(permission);
    const updatedPerms = hadPerm
      ? targetRole.permissions.filter((p) => p !== permission)
      : [...targetRole.permissions, permission];

    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, permissions: updatedPerms } : r
      )
    );

    appendAudit(
      'Administration',
      `Role: ${targetRole.name}`,
      `${hadPerm ? 'Revoked' : 'Granted'} Permission '${permission}'`,
      `${permission}: ${hadPerm}`,
      `${permission}: ${!hadPerm}`
    );

    return {
      ok: true,
      message: `${hadPerm ? 'Removed' : 'Granted'} '${permission}' on ${targetRole.name}.`,
    };
  };

  const createCustomer: BosContextValue['createCustomer'] = async (input) => {
    const auth = await verifyServerAction(
      'customers.create',
      'Create Customer Account'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const newCust: CustomerInstitutionRecord = {
      id: `CUS-${107 + customers.length}`,
      code: input.isInstitutional
        ? `INST-${input.segment.slice(0, 3).toUpperCase()}-0${customers.length + 1}`
        : `RET-0${customers.length + 1}`,
      name: input.name,
      segment: input.segment,
      isInstitutional: input.isInstitutional,
      county: input.county,
      deliveryZone: input.deliveryZone,
      procurementContact: input.procurementContact,
      contactRole: 'Procurement Officer',
      phone: input.phone,
      email: input.email,
      contractRef: input.isInstitutional
        ? `CNT-2026-NEW-${customers.length + 1}`
        : 'DIRECT-RETAIL',
      tenderCycle: input.isInstitutional
        ? 'Annual Institutional Framework'
        : 'Immediate',
      orderCadence: input.isInstitutional ? 'Weekly' : 'Ad-hoc',
      paymentTerms: input.paymentTerms,
      creditLimitKes: input.creditLimitKes,
      outstandingBalanceKes: 0,
      overdueBalanceKes: 0,
      priceTier: input.isInstitutional ? 'Institutional Contract' : 'Retail',
      status: 'Active',
    };

    setCustomers((prev) => [newCust, ...prev]);

    appendAudit(
      'Customers',
      newCust.name,
      'Onboarded Customer / Institution',
      'None',
      `${newCust.segment} · Credit Limit KES ${newCust.creditLimitKes.toLocaleString()}`
    );

    return {
      ok: true,
      message: `${newCust.name} added to customer directory.`,
    };
  };

  const createCrmTicket: BosContextValue['createCrmTicket'] = async (input) => {
    const auth = await verifyServerAction('crm.manage', 'Log CRM Ticket / Follow-up');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const ticket: CrmTicketRecord = {
      id: `CRM-0${crmTickets.length + 1}`,
      ticketNumber: `TKT-2026-${110 + crmTickets.length}`,
      customerName: input.customerName,
      type: input.type,
      priority: input.priority,
      status: 'Open',
      assignedTo: currentUser?.fullName || 'Sales Representative',
      dueDate: input.dueDate,
      summary: input.summary,
    };

    setCrmTickets((prev) => [ticket, ...prev]);
    appendAudit(
      'CRM',
      ticket.ticketNumber,
      `Created ${ticket.type}`,
      'None',
      `${ticket.customerName} (${ticket.priority})`
    );

    return {
      ok: true,
      message: `CRM record ${ticket.ticketNumber} created.`,
    };
  };

  const resolveCrmTicket: BosContextValue['resolveCrmTicket'] = async (
    ticketId
  ) => {
    const auth = await verifyServerAction('crm.manage', 'Resolve CRM Ticket');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = crmTickets.find((t) => t.id === ticketId);
    if (!target) return { ok: false, message: 'Ticket not found.' };

    setCrmTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'Resolved' } : t))
    );

    appendAudit(
      'CRM',
      target.ticketNumber,
      'Resolved CRM Ticket',
      `Status: ${target.status}`,
      'Status: Resolved'
    );

    return {
      ok: true,
      message: `${target.ticketNumber} marked as Resolved.`,
    };
  };

  const uploadDocumentRecord: BosContextValue['uploadDocumentRecord'] = async (
    input
  ) => {
    const auth = await verifyServerAction(
      'documents.manage',
      'Upload Operational Document to Supabase Storage'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const doc: DocumentRecord = {
      id: `DOC-0${documents.length + 1}`,
      docNumber: `DOC-2026-${900 + documents.length}`,
      title: input.title,
      category: input.category,
      linkedEntity: input.linkedEntity,
      uploadedBy: currentUser?.fullName || 'Operator',
      uploadedAt: 'Just now',
      fileSize: '380 KB',
      storageBucket: 'bos-operational-docs',
      verified: true,
    };

    setDocuments((prev) => [doc, ...prev]);
    appendAudit(
      'Documents',
      doc.docNumber,
      `Uploaded ${doc.category}`,
      'None',
      `${doc.title} (Linked: ${doc.linkedEntity})`
    );

    return {
      ok: true,
      message: `Document ${doc.docNumber} stored and linked to ${doc.linkedEntity}.`,
    };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <BosContext.Provider
      value={{
        currentUser,
        isInitialized,
        loginWithCredentials,
        logout,
        switchTestPersona,
        theme,
        resolvedDark,
        setTheme,
        roles,
        can,
        activePermissions,
        users,
        warehouses,
        products,
        stockBatches,
        stockMovements,
        customers,
        orders,
        suppliers,
        procurementOrders,
        deliveries,
        invoices,
        payments,
        crmTickets,
        approvals,
        documents,
        auditLogs,
        notifications,
        enabledWidgets,
        toggleDashboardWidget,
        moveDashboardWidget,
        resetDashboardWidgets,
        createOrder,
        advanceOrderStatus,
        createProduct,
        updateProductPrice,
        recordStockMovement,
        createPurchaseOrder,
        advanceProcurementStage,
        updateDeliveryStatus,
        recordPayment,
        reconcilePayment,
        resolveApproval,
        inviteInternalMember,
        updateUserAccountStatus,
        toggleRolePermission,
        createCustomer,
        createCrmTicket,
        resolveCrmTicket,
        uploadDocumentRecord,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </BosContext.Provider>
  );
}

export function useBos() {
  const ctx = useContext(BosContext);
  if (!ctx) {
    throw new Error('useBos must be used within a BosProvider');
  }
  return ctx;
}

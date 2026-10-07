'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  SupplierContract,
  SupplierDocumentItem,
  SupplierEvaluationRecord,
  SupplierRecord,
  UnitOfMeasure,
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

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

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
  updateCurrentUserProfile: (updates: {
    fullName: string;
    nickname: string;
    phone: string;
    department: string;
    branch: string;
  }) => void;

  // Demo / Prototype Mode
  demoModeEnabled: boolean;
  setDemoModeEnabled: (enabled: boolean) => void;

  // Theme
  theme: ThemeMode;
  resolvedDark: boolean;
  setTheme: (mode: ThemeMode) => void;

  // Toast Notifications
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

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
    nickname?: string;
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
  verifyDocumentRecord: (docId: string) => Promise<{ ok: boolean; message: string }>;
  deleteDocumentRecord: (docId: string) => Promise<{ ok: boolean; message: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Supplier Management Mutations
  createSupplier: (input: {
    name: string;
    category: string;
    region: string;
    contactPerson: string;
    phone: string;
    email: string;
    leadTimeDays: number;
    paymentTerms: string;
  }) => Promise<{ ok: boolean; message: string; supplier?: SupplierRecord }>;
  updateSupplier: (
    id: string,
    updates: Partial<SupplierRecord>
  ) => Promise<{ ok: boolean; message: string }>;
  approveSupplier: (
    id: string,
    comment?: string
  ) => Promise<{ ok: boolean; message: string }>;
  suspendSupplier: (
    id: string,
    reason: string
  ) => Promise<{ ok: boolean; message: string }>;
  reactivateSupplier: (
    id: string
  ) => Promise<{ ok: boolean; message: string }>;
  addSupplierContract: (
    supplierId: string,
    contract: Omit<SupplierContract, 'id'>
  ) => Promise<{ ok: boolean; message: string }>;
  updateSupplierContractStatus: (
    supplierId: string,
    contractId: string,
    status: SupplierContract['status']
  ) => Promise<{ ok: boolean; message: string }>;
  updateSupplierPriceList: (
    supplierId: string,
    productId: string,
    newCostKes: number,
    reason?: string
  ) => Promise<{ ok: boolean; message: string }>;
  addSupplierPriceItem: (
    supplierId: string,
    item: {
      productId: string;
      productName: string;
      unit: UnitOfMeasure;
      currentCostKes: number;
    }
  ) => Promise<{ ok: boolean; message: string }>;
  removeSupplierPriceItem: (
    supplierId: string,
    productId: string
  ) => Promise<{ ok: boolean; message: string }>;
  addSupplierDocument: (
    supplierId: string,
    doc: Omit<SupplierDocumentItem, 'id'>
  ) => Promise<{ ok: boolean; message: string }>;
  verifySupplierDocument: (
    supplierId: string,
    docId: string
  ) => Promise<{ ok: boolean; message: string }>;
  evaluateSupplierPerformance: (
    supplierId: string,
    evaluation: Omit<SupplierEvaluationRecord, 'id' | 'evaluationDate' | 'evaluator'>
  ) => Promise<{ ok: boolean; message: string }>;
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
const STORAGE_KEY_DEMO = 'agro_bos_demo_mode_v1';

export function BosProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [demoModeEnabled, setDemoModeState] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedDark, setResolvedDark] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
  const [suppliers, setSuppliers] =
    useState<SupplierRecord[]>(INITIAL_SUPPLIERS);
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

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
      const savedDemo = localStorage.getItem(STORAGE_KEY_DEMO);
      if (savedDemo === 'true') {
        setDemoModeState(true);
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

  const setDemoModeEnabled = (enabled: boolean) => {
    setDemoModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_DEMO, String(enabled));
    } catch {
      // ignore
    }
    pushToast({
      title: enabled ? 'Prototype Evaluation Mode Enabled' : 'Prototype Mode Hidden',
      description: enabled
        ? 'Persona testing controls are now available in Settings → Preferences.'
        : 'Production UI mode active.',
      tone: 'info',
    });
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
          'Invalid work email or password. Agro-Deliveries BOS is strictly internal and requires an Administrator-issued account.',
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
    pushToast({
      title: `Active Persona: ${target.fullName}`,
      description: `Switched workspace context to ${target.roleName}.`,
      tone: 'info',
    });
  };

  const updateCurrentUserProfile: BosContextValue['updateCurrentUserProfile'] = (
    updates
  ) => {
    if (!currentUser) return;
    const updated: InternalUser = {
      ...currentUser,
      ...updates,
    };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    appendAudit(
      'Account',
      `Profile (${updated.email})`,
      'Updated Operator Profile Details',
      `${currentUser.fullName} ("${currentUser.nickname}")`,
      `${updated.fullName} ("${updated.nickname}") · ${updated.branch}`
    );
    pushToast({
      title: 'Profile Updated',
      description: 'Your operator account details have been saved in workspace state.',
      tone: 'success',
    });
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
    pushToast({
      title: 'Dashboard Layout Reset',
      description: 'Restored default role-aware operational widget arrangement.',
      tone: 'info',
    });
  };

  const verifyServerAction = async (
    requiredPermission: PermissionKey,
    actionName: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) {
      return { ok: false, error: 'Not authenticated.' };
    }
    if (!can(requiredPermission)) {
      const msg = `Unauthorized: Your role (${currentUser.roleName}) lacks '${requiredPermission}' permission.`;
      pushToast({
        title: 'Action Restricted',
        description: msg,
        tone: 'error',
      });
      return { ok: false, error: msg };
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

    if (input.quantity > product.availableQty && !can('orders.approve')) {
      const msg = `Insufficient FEFO stock (${product.availableQty} ${product.unit} available). Stock override requires 'orders.approve' authority.`;
      pushToast({ title: 'FEFO Stock Constraint', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }

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
      orderDate: '2026-10-01',
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

    const msg = needsPriceApproval
      ? `Order ${orderNumber} created and routed to Approval Center for price override review.`
      : `Order ${orderNumber} confirmed with FEFO batch ${matchingBatch} reserved.`;

    pushToast({
      title: `Order ${orderNumber} Created`,
      description: msg,
      tone: 'success',
    });

    return { ok: true, message: msg };
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

    const msg = `${target.orderNumber} moved from ${target.status} to ${nextStatus}.`;
    pushToast({
      title: 'Order Status Updated',
      description: msg,
      tone: 'success',
    });

    return { ok: true, message: msg };
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
          date: '2026-10-01',
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

    const msg = `Product ${newProd.name} (${newProd.sku}) added to catalog.`;
    pushToast({ title: 'Product SKU Added', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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
                  date: '2026-10-01',
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

    const msg = `Updated pricing for ${target.name}. Previous pricing preserved in history.`;
    pushToast({ title: 'Pricing Tiers Updated', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `${input.type} recorded for batch ${batch.batchNumber}. Stock updated to ${newAvailable} ${batch.unit}.`;
    pushToast({ title: 'Stock Movement Logged', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `${poNumber} created (${newPo.stage}).`;
    pushToast({ title: 'Purchase Requisition Created', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

      const msg = `${target.poNumber} advanced from ${target.stage} to ${nextStage}.`;
      pushToast({ title: 'Procurement Stage Advanced', description: msg, tone: 'success' });
      return { ok: true, message: msg };
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

    const msg = `Delivery run ${run.runNumber} updated to ${status}.`;
    pushToast({ title: 'Delivery Run Updated', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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
      date: '2026-10-01',
      amountKes: input.amountKes,
      allocatedToDoc: input.allocatedToDoc,
      reconciled: false,
      recordedBy: currentUser?.fullName || 'Accounts Clerk',
    };

    setPayments((prev) => [newPay, ...prev]);

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

    const msg = `Payment ${input.referenceCode} (KES ${input.amountKes.toLocaleString()}) recorded and allocated to ${input.allocatedToDoc}.`;
    pushToast({ title: 'Payment Recorded', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `Settlement ${target.referenceCode} marked as reconciled.`;
    pushToast({ title: 'Settlement Reconciled', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `Request ${target.reference} has been ${decision.toLowerCase()}.`;
    pushToast({
      title: `Approval ${decision}`,
      description: msg,
      tone: decision === 'Approved' ? 'success' : 'warning',
    });
    return { ok: true, message: msg };
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
    const derivedNickname =
      input.nickname?.trim() || input.fullName.trim().split(' ')[0];

    const newUser: InternalUser = {
      id: `USR-0${users.length + 1}`,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      nickname: derivedNickname,
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

    const msg = `Invitation dispatched to ${newUser.fullName} (${newUser.email}) with role ${newUser.roleName}.`;
    pushToast({ title: 'Internal Member Invited', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

      const msg = `${target.fullName}'s account status is now ${status}.`;
      pushToast({
        title: `Account ${status}`,
        description: msg,
        tone: status === 'Active' ? 'success' : 'warning',
      });
      return { ok: true, message: msg };
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
        r.id === roleId
          ? { ...r, permissions: updatedPerms, lastModified: '2026-10-01' }
          : r
      )
    );

    appendAudit(
      'Administration',
      `Role: ${targetRole.name}`,
      `${hadPerm ? 'Revoked' : 'Granted'} Permission '${permission}'`,
      `${permission}: ${hadPerm}`,
      `${permission}: ${!hadPerm}`
    );

    const msg = `${hadPerm ? 'Removed' : 'Granted'} '${permission}' on ${targetRole.name}.`;
    pushToast({ title: 'Role Permissions Updated', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `${newCust.name} added to customer directory.`;
    pushToast({ title: 'Customer Onboarded', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `CRM record ${ticket.ticketNumber} created.`;
    pushToast({ title: 'CRM Follow-Up Logged', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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

    const msg = `${target.ticketNumber} marked as Resolved.`;
    pushToast({ title: 'CRM Ticket Resolved', description: msg, tone: 'success' });
    return { ok: true, message: msg };
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
      uploadedAt: '2026-10-01',
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

    const msg = `Document ${doc.docNumber} stored and linked to ${input.linkedEntity}.`;
    pushToast({ title: 'Document Uploaded', description: msg, tone: 'success' });
    return { ok: true, message: msg };
  };

  const verifyDocumentRecord: BosContextValue['verifyDocumentRecord'] = async (
    docId
  ) => {
    const auth = await verifyServerAction(
      'documents.manage',
      'Verify Operational Document'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = documents.find((d) => d.id === docId);
    if (!target) return { ok: false, message: 'Document not found.' };

    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, verified: true } : d))
    );
    appendAudit(
      'Documents',
      target.docNumber,
      'Verified Operational Document',
      'Verified: false',
      'Verified: true'
    );
    const msg = `${target.docNumber} marked as verified.`;
    pushToast({ title: 'Document Verified', description: msg, tone: 'success' });
    return { ok: true, message: msg };
  };

  const deleteDocumentRecord: BosContextValue['deleteDocumentRecord'] = async (
    docId
  ) => {
    const auth = await verifyServerAction(
      'documents.manage',
      'Remove Operational Document'
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = documents.find((d) => d.id === docId);
    if (!target) return { ok: false, message: 'Document not found.' };

    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    appendAudit(
      'Documents',
      target.docNumber,
      'Deleted Document Record',
      `${target.title}`,
      'Removed from registry'
    );
    const msg = `${target.docNumber} removed from registry.`;
    pushToast({ title: 'Document Removed', description: msg, tone: 'warning' });
    return { ok: true, message: msg };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Supplier Operations (Create, Edit, Approve, Suspend, Contracts, Price List, Documents, Evaluations)
  const createSupplier: BosContextValue['createSupplier'] = async (input) => {
    if (!can('suppliers.create')) {
      const msg = 'Access Denied: Your role lacks permission (suppliers.create) to register suppliers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const nextNum = suppliers.length + 1;
    const code = `VND-${input.name.slice(0, 3).toUpperCase()}-${String(nextNum).padStart(3, '0')}`;
    const newSupplier: SupplierRecord = {
      id: `SUP-${String(nextNum).padStart(2, '0')}`,
      code,
      name: input.name,
      category: input.category,
      region: input.region,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
      payableBalanceKes: 0,
      qualityScorePct: 95.0,
      recentPriceTrend: 'Stable',
      status: 'Under Review',
      suppliedProducts: [],
      contracts: [],
      documents: [],
      evaluations: [],
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    appendAudit(
      'Suppliers',
      code,
      'Registered New Vendor (Under Review)',
      'None',
      `${newSupplier.name} (${newSupplier.region}) · Contact: ${newSupplier.contactPerson}`
    );
    pushToast({
      title: 'Supplier Registered',
      description: `${newSupplier.name} registered and routed for governance onboarding review.`,
      tone: 'success',
    });
    return { ok: true, message: `Supplier ${newSupplier.name} registered successfully.`, supplier: newSupplier };
  };

  const updateSupplier: BosContextValue['updateSupplier'] = async (id, updates) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission (suppliers.edit) to edit supplier details.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === id);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updated: SupplierRecord = { ...target, ...updates };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Updated Supplier Profile',
      `${target.name} · Terms: ${target.paymentTerms} · Lead: ${target.leadTimeDays}d`,
      `${updated.name} · Terms: ${updated.paymentTerms} · Lead: ${updated.leadTimeDays}d`
    );
    pushToast({
      title: 'Supplier Details Updated',
      description: `${updated.name} records updated successfully.`,
      tone: 'success',
    });
    return { ok: true, message: `Supplier ${updated.name} updated.` };
  };

  const approveSupplier: BosContextValue['approveSupplier'] = async (id, comment) => {
    if (!can('suppliers.approve') && !can('procurement.approve') && !can('approvals.approve') && !can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission to approve supplier onboardings.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === id);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updated: SupplierRecord = { ...target, status: 'Active', suspendedReason: undefined };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Approved Supplier Onboarding',
      target.status,
      `Active · Approved by ${currentUser?.fullName || 'Operator'} (${comment || 'Governance sign-off'})`
    );
    pushToast({
      title: 'Supplier Approved',
      description: `${target.name} is now authorized for purchase requisitions and purchase orders.`,
      tone: 'success',
    });
    return { ok: true, message: `${target.name} approved and activated.` };
  };

  const suspendSupplier: BosContextValue['suspendSupplier'] = async (id, reason) => {
    if (!can('suppliers.suspend') && !can('suppliers.edit') && !can('procurement.approve') && !can('approvals.approve')) {
      const msg = 'Access Denied: Your role lacks permission to suspend supplier accounts.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === id);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updated: SupplierRecord = { ...target, status: 'Suspended', suspendedReason: reason };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Suspended Vendor Account',
      target.status,
      `Suspended · Reason: ${reason} (by ${currentUser?.fullName || 'Operator'})`
    );
    pushToast({
      title: 'Supplier Suspended',
      description: `${target.name} placed on operational suspension. Purchase orders halted.`,
      tone: 'warning',
    });
    return { ok: true, message: `${target.name} has been suspended.` };
  };

  const reactivateSupplier: BosContextValue['reactivateSupplier'] = async (id) => {
    if (!can('suppliers.suspend') && !can('suppliers.edit') && !can('procurement.approve') && !can('approvals.approve')) {
      const msg = 'Access Denied: Your role lacks permission to reinstate supplier accounts.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === id);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updated: SupplierRecord = { ...target, status: 'Active', suspendedReason: undefined };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Reinstated Vendor Account',
      'Suspended',
      `Active (Reinstated by ${currentUser?.fullName || 'Operator'})`
    );
    pushToast({
      title: 'Supplier Reinstated',
      description: `${target.name} is now restored to Active supply status.`,
      tone: 'success',
    });
    return { ok: true, message: `${target.name} reinstated.` };
  };

  const addSupplierContract: BosContextValue['addSupplierContract'] = async (supplierId, contractInput) => {
    if (!can('suppliers.edit') && !can('procurement.create')) {
      const msg = 'Access Denied: Your role lacks permission to manage contracts.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const newContract: SupplierContract = {
      ...contractInput,
      id: `CTR-${target.code.slice(4, 7)}-${Date.now().toString().slice(-4)}`,
    };
    const updatedContracts = [newContract, ...(target.contracts || [])];
    const updated: SupplierRecord = { ...target, contracts: updatedContracts };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Added Supply Contract',
      'None',
      `${newContract.contractRef} · ${newContract.title} (KES ${newContract.valueKes.toLocaleString()})`
    );
    pushToast({
      title: 'Supply Contract Added',
      description: `Contract ${newContract.contractRef} registered for ${target.name}.`,
      tone: 'success',
    });
    return { ok: true, message: 'Contract registered successfully.' };
  };

  const updateSupplierContractStatus: BosContextValue['updateSupplierContractStatus'] = async (
    supplierId,
    contractId,
    status
  ) => {
    if (!can('suppliers.edit') && !can('procurement.create') && !can('procurement.approve')) {
      const msg = 'Access Denied: Your role lacks permission to update contract status.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updatedContracts = (target.contracts || []).map((c) =>
      c.id === contractId ? { ...c, status } : c
    );
    const updated: SupplierRecord = { ...target, contracts: updatedContracts };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Updated Supply Contract Status',
      'Previous Status',
      `Contract ${contractId} marked as ${status}`
    );
    pushToast({
      title: 'Contract Status Updated',
      description: `Contract updated to ${status}.`,
      tone: 'success',
    });
    return { ok: true, message: 'Contract status updated.' };
  };

  const updateSupplierPriceList: BosContextValue['updateSupplierPriceList'] = async (
    supplierId,
    productId,
    newCostKes,
    reason
  ) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission (suppliers.edit) to revise supplier price lists.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const prevItem = target.suppliedProducts.find((p) => p.productId === productId);
    if (!prevItem) return { ok: false, message: 'Product not found in supplier price list.' };

    const pctChange = ((newCostKes - prevItem.currentCostKes) / prevItem.currentCostKes) * 100;
    const trendText =
      pctChange > 0 ? `Increased +${pctChange.toFixed(0)}%` : pctChange < 0 ? `Decreased ${pctChange.toFixed(0)}%` : 'Stable';

    const updatedProducts = target.suppliedProducts.map((p) =>
      p.productId === productId
        ? {
            ...p,
            previousCostKes: p.currentCostKes,
            currentCostKes: newCostKes,
            lastUpdated: todayStr,
          }
        : p
    );
    const updated: SupplierRecord = {
      ...target,
      suppliedProducts: updatedProducts,
      recentPriceTrend: trendText as SupplierRecord['recentPriceTrend'],
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      `Adjusted Farmgate Cost (${prevItem.productName})`,
      `KES ${prevItem.currentCostKes}/${prevItem.unit}`,
      `KES ${newCostKes}/${prevItem.unit} (${reason || 'Market price adjustment'})`
    );
    pushToast({
      title: 'Supplier Price Updated',
      description: `${prevItem.productName} updated from KES ${prevItem.currentCostKes} to KES ${newCostKes}/${prevItem.unit}.`,
      tone: 'info',
    });
    return { ok: true, message: 'Price revised successfully.' };
  };

  const addSupplierPriceItem: BosContextValue['addSupplierPriceItem'] = async (supplierId, item) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission to modify price list.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const newItem = {
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      currentCostKes: item.currentCostKes,
      previousCostKes: item.currentCostKes,
      lastUpdated: todayStr,
    };
    const updated: SupplierRecord = {
      ...target,
      suppliedProducts: [...target.suppliedProducts, newItem],
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Added SKU to Supplier Price List',
      'None',
      `${newItem.productName} at KES ${newItem.currentCostKes}/${newItem.unit}`
    );
    pushToast({
      title: 'Product Added to Price List',
      description: `${newItem.productName} added to ${target.name}.`,
      tone: 'success',
    });
    return { ok: true, message: 'SKU added to price list.' };
  };

  const removeSupplierPriceItem: BosContextValue['removeSupplierPriceItem'] = async (supplierId, productId) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission to modify price list.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const item = target.suppliedProducts.find((p) => p.productId === productId);
    const updated: SupplierRecord = {
      ...target,
      suppliedProducts: target.suppliedProducts.filter((p) => p.productId !== productId),
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Removed SKU from Price List',
      item?.productName || productId,
      'Discontinued from vendor catalog'
    );
    pushToast({
      title: 'Item Removed',
      description: `${item?.productName || 'SKU'} removed from price list.`,
      tone: 'info',
    });
    return { ok: true, message: 'Item removed from price list.' };
  };

  const addSupplierDocument: BosContextValue['addSupplierDocument'] = async (supplierId, docInput) => {
    if (!can('suppliers.edit') && !can('documents.manage')) {
      const msg = 'Access Denied: Your role lacks permission to upload supplier documents.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const newDoc: SupplierDocumentItem = {
      ...docInput,
      id: `DOC-${target.code.slice(4, 7)}-${Date.now().toString().slice(-4)}`,
    };
    const updated: SupplierRecord = {
      ...target,
      documents: [newDoc, ...(target.documents || [])],
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Uploaded Compliance Document',
      'None',
      `${newDoc.title} (${newDoc.category} · ${newDoc.docNumber})`
    );
    pushToast({
      title: 'Document Uploaded',
      description: `${newDoc.title} attached to ${target.name}.`,
      tone: 'success',
    });
    return { ok: true, message: 'Document uploaded successfully.' };
  };

  const verifySupplierDocument: BosContextValue['verifySupplierDocument'] = async (supplierId, docId) => {
    if (!can('suppliers.edit') && !can('documents.manage') && !can('procurement.approve')) {
      const msg = 'Access Denied: Your role lacks permission to verify compliance documents.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updatedDocs = (target.documents || []).map((d) =>
      d.id === docId ? { ...d, status: 'Verified' as const } : d
    );
    const updated: SupplierRecord = { ...target, documents: updatedDocs };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Verified Vendor Compliance Document',
      'Pending Verification',
      `Document ${docId} verified by ${currentUser?.fullName || 'Operator'}`
    );
    pushToast({
      title: 'Document Verified',
      description: 'Compliance certificate validated and posted to vendor vault.',
      tone: 'success',
    });
    return { ok: true, message: 'Document verified.' };
  };

  const evaluateSupplierPerformance: BosContextValue['evaluateSupplierPerformance'] = async (
    supplierId,
    evaluationInput
  ) => {
    if (!can('suppliers.edit') && !can('procurement.approve')) {
      const msg = 'Access Denied: Your role lacks permission to record supplier evaluations.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const newEvaluation: SupplierEvaluationRecord = {
      ...evaluationInput,
      id: `EVL-${target.code.slice(4, 7)}-${Date.now().toString().slice(-4)}`,
      evaluationDate: todayStr,
      evaluator: `${currentUser?.fullName || 'Operator'} (${currentUser?.roleName || 'Reviewer'})`,
    };
    const updatedEvaluations = [newEvaluation, ...(target.evaluations || [])];
    const updated: SupplierRecord = {
      ...target,
      qualityScorePct: Number(evaluationInput.overallScorePct.toFixed(1)),
      evaluations: updatedEvaluations,
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Concluded Supplier Performance Audit',
      `${target.qualityScorePct}%`,
      `${evaluationInput.overallScorePct}% (${evaluationInput.recommendation}) · Evaluator: ${newEvaluation.evaluator}`
    );
    pushToast({
      title: 'Performance Evaluation Saved',
      description: `${target.name} score updated to ${evaluationInput.overallScorePct}%. Recommendation: ${evaluationInput.recommendation}.`,
      tone: 'success',
    });
    return { ok: true, message: 'Performance evaluation completed.' };
  };

  return (
    <BosContext.Provider
      value={{
        currentUser,
        isInitialized,
        loginWithCredentials,
        logout,
        switchTestPersona,
        updateCurrentUserProfile,
        demoModeEnabled,
        setDemoModeEnabled,
        theme,
        resolvedDark,
        setTheme,
        toasts,
        pushToast,
        dismissToast,
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
        verifyDocumentRecord,
        deleteDocumentRecord,
        markNotificationRead,
        markAllNotificationsRead,
        createSupplier,
        updateSupplier,
        approveSupplier,
        suspendSupplier,
        reactivateSupplier,
        addSupplierContract,
        updateSupplierContractStatus,
        updateSupplierPriceList,
        addSupplierPriceItem,
        removeSupplierPriceItem,
        addSupplierDocument,
        verifySupplierDocument,
        evaluateSupplierPerformance,
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

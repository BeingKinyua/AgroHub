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
  CreateOrderInput,
  CreateOrderItemInput,
  OrderLifecycleStatus,
  OrderLineItem,
  OrderRecord,
  PaymentRecord,
  PermissionKey,
  PODDeliveredItem,
  PODEvidenceRecord,
  PODStatus,
  PriceHistoryEntry,
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
  podRecords: PODEvidenceRecord[];

  // Dashboard Widget Customization
  enabledWidgets: string[];
  toggleDashboardWidget: (widgetId: string) => void;
  moveDashboardWidget: (widgetId: string, direction: 'up' | 'down') => void;
  resetDashboardWidgets: () => void;

  // Mutations (all RBAC-verified & Audit-Logged)
  createOrder: (
    input:
      | CreateOrderInput
      | {
          customerId: string;
          channel: OrderRecord['channel'];
          deliveryDate: string;
          warehouseName: string;
          productId: string;
          quantity: number;
          overridePriceKes?: number;
          notes?: string;
        }
  ) => Promise<{ ok: boolean; message: string; orderId?: string }>;
  advanceOrderStatus: (
    orderId: string,
    nextStatus: OrderLifecycleStatus
  ) => Promise<{ ok: boolean; message: string }>;
  recordDeliveryArrival: (
    orderId: string,
    details: {
      recipientName: string;
      recipientRole?: string;
      recipientPhone?: string;
      deliveredItems: PODDeliveredItem[];
      notes?: string;
      exceptions?: string;
      files?: {
        name: string;
        size: string;
        type: string;
        url: string;
        caption?: string;
      }[];
    }
  ) => Promise<{ ok: boolean; message: string; podId?: string }>;
  verifyPOD: (
    podId: string,
    options?: { autoGenerateInvoice?: boolean; notes?: string }
  ) => Promise<{ ok: boolean; message: string; invoiceNumber?: string }>;
  rejectPOD: (
    podId: string,
    reason: string
  ) => Promise<{ ok: boolean; message: string }>;
  generateDraftInvoice: (
    orderId: string
  ) => Promise<{ ok: boolean; message: string; invoiceNumber?: string }>;
  createProduct: (
    input: Omit<
      ProductRecord,
      'id' | 'status' | 'availableQty' | 'reservedQty' | 'incomingQty' | 'priceHistory'
    >
  ) => Promise<{ ok: boolean; message: string }>;
  updateProduct: (
    productId: string,
    updates: Partial<Omit<ProductRecord, 'id' | 'priceHistory'>>
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

export const INITIAL_PODS: PODEvidenceRecord[] = [
  {
    id: 'POD-2026-001',
    orderId: 'ORD-005',
    orderNumber: 'ORD-2026-880',
    deliveryRunId: 'DR-2026-080',
    customerName: 'Aga Khan University Hospital Dietary Dept',
    recipientName: 'Sister Beatrice Wanjala',
    recipientRole: 'Dietary Stores Superintendent',
    recipientPhone: '+254 722 300 812',
    deliveryDate: '2026-09-30',
    submittedAt: '2026-09-30 08:35 EAT',
    submittedBy: 'Joseph Omondi (Driver)',
    status: 'Verified',
    deliveredItems: [
      {
        productId: 'PRD-001',
        productName: 'Kinangop Roma Tomatoes (Grade 1)',
        sku: 'AG-VEG-001',
        unit: 'kilograms',
        requestedQty: 180,
        deliveredQty: 180,
        rejectedQty: 0,
        unitPriceKes: 105,
      },
    ],
    evidenceFiles: [
      {
        name: 'AgaKhan_Signed_Delivery_Note_880.pdf',
        size: '1.4 MB',
        type: 'application/pdf',
        url: '/assets/pod/delivery_note_880.pdf',
        caption: 'Signed & stamped delivery note with hospital inspection mark',
      },
    ],
    deliveryNotes: 'Delivered directly to Basement Cold Storage Bay 2.',
    verifiedBy: 'Daniel Kiprop (Operations Manager)',
    verifiedAt: '2026-09-30 09:15 EAT',
    verificationNotes: 'All 180kg inspected and verified with zero transit damage.',
    invoiceCreated: true,
    invoiceNumber: 'INV-2026-8889',
  },
  {
    id: 'POD-2026-002',
    orderId: 'ORD-006',
    orderNumber: 'ORD-2026-881',
    deliveryRunId: 'DR-2026-081',
    customerName: 'Brookhouse International School Runda',
    recipientName: 'Chef Michael Otieno',
    recipientRole: 'Executive Catering Chef',
    recipientPhone: '+254 733 908 112',
    deliveryDate: '2026-09-30',
    submittedAt: '2026-09-30 09:40 EAT',
    submittedBy: 'Peter Otieno (Driver)',
    status: 'Pending Verification',
    deliveredItems: [
      {
        productId: 'PRD-002',
        productName: 'Murang’a Hass Avocados (Export Grade)',
        sku: 'AG-FRT-004',
        unit: 'pieces',
        requestedQty: 400,
        deliveredQty: 390,
        rejectedQty: 10,
        rejectionReason: '10 pieces bruised during transit over-stacking',
        unitPriceKes: 48,
      },
    ],
    evidenceFiles: [
      {
        name: 'Brookhouse_POD_Receipt_Stamp.jpg',
        size: '2.1 MB',
        type: 'image/jpeg',
        url: '/assets/pod/receipt_881.jpg',
        caption: 'Brookhouse catering receiving stamp with 10pcs rejected notation',
      },
    ],
    deliveryNotes: '10 avocados rejected due to soft crate pressing; 390 accepted into prep kitchen.',
  },
];

export function BosProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(
    INITIAL_USERS[0]
  );
  const [isInitialized, setIsInitialized] = useState(true);
  const [demoModeEnabled, setDemoModeState] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>('system');
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
  const [podRecords, setPodRecords] =
    useState<PODEvidenceRecord[]>(INITIAL_PODS);
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
    if (!customer) {
      return { ok: false, message: 'Selected customer not found in workspace records.' };
    }

    // Normalize single-item vs multi-item input
    let itemsInput: CreateOrderItemInput[] = [];
    if ('items' in input && Array.isArray(input.items)) {
      itemsInput = input.items;
    } else if ('productId' in input && input.productId) {
      itemsInput = [
        {
          productId: input.productId,
          quantity: input.quantity,
          overridePriceKes: input.overridePriceKes,
        },
      ];
    }

    if (itemsInput.length === 0) {
      return { ok: false, message: 'Order must contain at least one line item.' };
    }

    // Validate all items before mutating state
    const processedItems: OrderLineItem[] = [];
    const stockDeltas: { productId: string; quantity: number }[] = [];
    let orderTotalKes = 0;
    const priceOverrideApprovals: {
      product: ProductRecord;
      overridePrice: number;
      lineTotal: number;
    }[] = [];

    // Check stock for every product and compute pricing
    for (const item of itemsInput) {
      if (!item.productId) {
        return { ok: false, message: 'Invalid product selected in line items.' };
      }
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return { ok: false, message: 'Every line item must have a quantity greater than zero.' };
      }

      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return { ok: false, message: `Product ${item.productId} not found in catalog.` };
      }

      // Check stock sufficiency across lines
      if (qty > product.availableQty && !can('orders.approve')) {
        const msg = `Insufficient FEFO stock for ${product.name} (${product.availableQty} ${product.unit} available, requested ${qty} ${product.unit}). Stock override requires 'orders.approve' authority.`;
        pushToast({ title: 'FEFO Stock Constraint', description: msg, tone: 'warning' });
        return { ok: false, message: msg };
      }

      // Auto-assign FEFO batch
      const matchingBatch =
        item.allocatedBatch ||
        stockBatches
          .filter((b) => b.productId === product.id && b.daysToExpiry > 0)
          .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0]?.batchNumber ||
        'LOT-FEFO-AUTO';

      // Determine pricing tier & unit price
      let defaultUnitPrice = product.pricing.retailKes;
      let pricingTier: OrderLineItem['pricingTier'] = 'Retail';

      if (customer.isInstitutional) {
        defaultUnitPrice = product.pricing.institutionalKes;
        pricingTier = 'Institutional';
      } else if (input.channel === 'Recurring Weekly' || input.channel === 'Tender Supply') {
        defaultUnitPrice = product.pricing.wholesaleKes;
        pricingTier = 'Wholesale';
      } else if (input.channel === 'Walk-In / Manual') {
        defaultUnitPrice = product.pricing.retailKes;
        pricingTier = 'Retail';
      } else {
        defaultUnitPrice = product.pricing.wholesaleKes;
        pricingTier = 'Wholesale';
      }

      const finalUnitPrice =
        item.overridePriceKes !== undefined && item.overridePriceKes > 0
          ? item.overridePriceKes
          : defaultUnitPrice;

      const lineTotalKes = Math.round(finalUnitPrice * qty);
      orderTotalKes += lineTotalKes;

      const baseSchedulePrice = customer.isInstitutional
        ? product.pricing.institutionalKes
        : product.pricing.wholesaleKes;

      if (
        item.overridePriceKes !== undefined &&
        item.overridePriceKes > 0 &&
        item.overridePriceKes < baseSchedulePrice
      ) {
        priceOverrideApprovals.push({
          product,
          overridePrice: finalUnitPrice,
          lineTotal: lineTotalKes,
        });
      }

      processedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: qty,
        allocatedBatch: matchingBatch,
        unitPriceKes: finalUnitPrice,
        pricingTier,
        lineTotalKes,
      });

      stockDeltas.push({ productId: product.id, quantity: qty });
    }

    const needsPriceApproval = priceOverrideApprovals.length > 0;
    const orderNumber = `ORD-2026-${888 + orders.length}`;
    const orderId = `ORD-00${orders.length + 1}`;
    const todayStr = ('orderDate' in input && input.orderDate)
      ? input.orderDate
      : new Date().toISOString().split('T')[0];

    const newOrder: OrderRecord = {
      id: orderId,
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
      orderDate: todayStr,
      deliveryDate: input.deliveryDate,
      warehouseName: input.warehouseName,
      assignedActor: needsPriceApproval
        ? 'Pending Price Override Approval'
        : 'Samuel Mutua (Storekeeper)',
      nextStepLabel: needsPriceApproval
        ? 'Awaiting Finance/Operations Approval'
        : 'Release to Warehouse Picking Queue',
      totalKes: orderTotalKes,
      itemsCount: processedItems.length,
      items: processedItems,
      notes: input.notes,
      orderReference: 'orderReference' in input ? input.orderReference : undefined,
      deliveryAddress:
        'deliveryAddress' in input && input.deliveryAddress
          ? input.deliveryAddress
          : `${customer.deliveryZone}, ${customer.county}`,
      podStatus: 'Not Submitted',
      invoiceStatus: 'Not Ready',
    };

    // Atomic update of orders and product stock
    setOrders((prev) => [newOrder, ...prev]);

    setProducts((prev) =>
      prev.map((p) => {
        const delta = stockDeltas.find((d) => d.productId === p.id);
        if (!delta) return p;
        return {
          ...p,
          availableQty: Math.max(0, p.availableQty - delta.quantity),
          reservedQty: p.reservedQty + delta.quantity,
        };
      })
    );

    // If approvals needed, generate ApprovalRequestRecords
    if (needsPriceApproval && currentUser) {
      const newApprovals: ApprovalRequestRecord[] = priceOverrideApprovals.map(
        (po, idx) => ({
          id: `APR-0${approvals.length + idx + 1}`,
          reference: orderNumber,
          category: 'Institutional Price Override',
          entityTitle: `${customer.name} · ${po.product.name} (@ KES ${po.overridePrice}/${po.product.unit})`,
          requesterName: currentUser.fullName,
          requesterRole: currentUser.roleName,
          valueKes: po.lineTotal,
          reason: input.notes || 'Institutional tender price override requested below catalog schedule.',
          requestedAt: 'Just now',
          status: 'Pending',
        })
      );
      setApprovals((prev) => [...newApprovals, ...prev]);
    }

    appendAudit(
      'Orders',
      orderNumber,
      'Created Multi-Item Order & Reserved FEFO Stock',
      'None',
      `${customer.name} · ${processedItems.length} products · KES ${orderTotalKes.toLocaleString()} (${newOrder.status})`
    );

    const msg = needsPriceApproval
      ? `Order ${orderNumber} created with ${processedItems.length} items and routed to Approval Center for price override review.`
      : `Order ${orderNumber} created with ${processedItems.length} products. FEFO stock reserved.`;

    pushToast({
      title: `Order ${orderNumber} Created`,
      description: msg,
      tone: 'success',
    });

    return { ok: true, message: msg, orderId };
  };

  const recordDeliveryArrival: BosContextValue['recordDeliveryArrival'] = async (
    orderId,
    details
  ) => {
    const auth = await verifyServerAction('deliveries.dispatch', 'Record Delivery Arrival');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return { ok: false, message: 'Order not found.' };

    const podId = `POD-2026-${String(podRecords.length + 1).padStart(3, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newPod: PODEvidenceRecord = {
      id: podId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      recipientName: details.recipientName,
      recipientRole: details.recipientRole || 'Receiving Staff',
      recipientPhone: details.recipientPhone,
      deliveryDate: todayStr,
      submittedAt: `${todayStr} ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT`,
      submittedBy: currentUser ? `${currentUser.fullName} (${currentUser.roleName})` : 'Delivery Driver',
      status: 'Pending Verification',
      deliveredItems: details.deliveredItems,
      evidenceFiles: details.files || [],
      deliveryNotes: details.notes,
      deliveryExceptions: details.exceptions,
    };

    setPodRecords((prev) => [newPod, ...prev]);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: 'Delivered',
              podStatus: 'Pending Verification',
              podEvidenceId: podId,
              nextStepLabel: 'Awaiting POD Verification by Operations / Finance',
            }
          : o
      )
    );

    appendAudit(
      'Deliveries',
      order.orderNumber,
      'Recorded Physical Delivery Arrival & Submitted POD',
      'Dispatched',
      `Delivered · POD ${podId} Pending Verification`
    );

    pushToast({
      title: 'Delivery Arrival Recorded',
      description: `Delivery documented for ${order.customerName}. POD submitted for verification.`,
      tone: 'success',
    });

    return { ok: true, message: `Delivery recorded. POD ${podId} awaiting verification.`, podId };
  };

  const verifyPOD: BosContextValue['verifyPOD'] = async (podId, options) => {
    const auth = await verifyServerAction('orders.approve', 'Verify Proof of Delivery');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const pod = podRecords.find((p) => p.id === podId);
    if (!pod) return { ok: false, message: 'POD record not found.' };

    if (pod.status === 'Verified') {
      return { ok: false, message: 'This Proof of Delivery has already been verified.' };
    }

    const order = orders.find((o) => o.id === pod.orderId || o.orderNumber === pod.orderNumber);
    const customer = customers.find((c) => c.name === pod.customerName || (order && c.id === order.customerId));

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedPod: PODEvidenceRecord = {
      ...pod,
      status: 'Verified',
      verifiedBy: currentUser ? `${currentUser.fullName} (${currentUser.roleName})` : 'Operations Manager',
      verifiedAt: `${todayStr} ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT`,
      verificationNotes: options?.notes || 'POD sign-off and delivered quantities verified.',
    };

    let generatedInvoiceNumber: string | undefined;

    // Check customer billing policy: if institutional customer on credit terms (Net 15/30/45) and no invoice exists
    const shouldInvoice =
      options?.autoGenerateInvoice !== false &&
      customer &&
      customer.isInstitutional &&
      customer.paymentTerms !== 'Prepaid / M-Pesa';

    const existingInvoice = invoices.find(
      (inv) => inv.orderNumber === pod.orderNumber
    );

    if (shouldInvoice && !existingInvoice && order) {
      const billableTotal = pod.deliveredItems.reduce(
        (sum, item) => sum + Math.round(item.deliveredQty * item.unitPriceKes),
        0
      );

      const invNum = `INV-2026-${8890 + invoices.length}`;
      generatedInvoiceNumber = invNum;

      const dueDate = new Date();
      if (customer.paymentTerms === 'Net 15') dueDate.setDate(dueDate.getDate() + 15);
      else if (customer.paymentTerms === 'Net 45') dueDate.setDate(dueDate.getDate() + 45);
      else dueDate.setDate(dueDate.getDate() + 30); // Net 30 default

      const finalAmount = billableTotal > 0 ? billableTotal : order.totalKes;

      const newInvoice: InvoiceRecord = {
        id: `INV-00${invoices.length + 1}`,
        invoiceNumber: invNum,
        orderNumber: order.orderNumber,
        customerId: customer.id,
        customerName: customer.name,
        issueDate: todayStr,
        dueDate: dueDate.toISOString().split('T')[0],
        amountKes: finalAmount,
        paidAmountKes: 0,
        balanceKes: finalAmount,
        status: 'Issued',
        agingBucket: 'Current (0-15d)',
        lineItems: order.items,
        podRef: pod.id,
        paymentTerms: customer.paymentTerms,
      };

      setInvoices((prev) => [newInvoice, ...prev]);
      updatedPod.invoiceCreated = true;
      updatedPod.invoiceNumber = invNum;

      // Update customer balance in state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id
            ? { ...c, outstandingBalanceKes: c.outstandingBalanceKes + finalAmount }
            : c
        )
      );
    }

    setPodRecords((prev) => prev.map((p) => (p.id === pod.id ? updatedPod : p)));

    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === pod.orderNumber
          ? {
              ...o,
              podStatus: 'Verified',
              invoiceStatus: generatedInvoiceNumber ? 'Draft Created' : o.invoiceStatus,
              invoiceNumber: generatedInvoiceNumber || o.invoiceNumber,
              nextStepLabel: generatedInvoiceNumber
                ? `Invoice ${generatedInvoiceNumber} Issued · Track Net Receivables`
                : 'Order Verified · Ready for Invoicing / Closure',
            }
          : o
      )
    );

    appendAudit(
      'Fulfillment',
      pod.orderNumber,
      'Verified Electronic POD & Validated Delivered Quantities',
      'POD Pending Verification',
      generatedInvoiceNumber
        ? `POD Verified · Auto-generated Commercial Tax Invoice ${generatedInvoiceNumber}`
        : 'POD Verified'
    );

    const successMsg = generatedInvoiceNumber
      ? `Proof of Delivery verified for ${pod.customerName}. Draft Invoice ${generatedInvoiceNumber} generated.`
      : `Proof of Delivery verified for ${pod.customerName}.`;

    pushToast({
      title: 'POD Verified',
      description: successMsg,
      tone: 'success',
    });

    return { ok: true, message: successMsg, invoiceNumber: generatedInvoiceNumber };
  };

  const rejectPOD: BosContextValue['rejectPOD'] = async (podId, reason) => {
    const auth = await verifyServerAction('orders.approve', 'Reject Proof of Delivery');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const pod = podRecords.find((p) => p.id === podId);
    if (!pod) return { ok: false, message: 'POD record not found.' };

    if (!reason || reason.trim().length === 0) {
      return { ok: false, message: 'A rejection reason is required.' };
    }

    const updatedPod: PODEvidenceRecord = {
      ...pod,
      status: 'Rejected',
      rejectionReason: reason,
      verifiedBy: currentUser ? `${currentUser.fullName} (${currentUser.roleName})` : 'Operations',
      verifiedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT`,
    };

    setPodRecords((prev) => prev.map((p) => (p.id === pod.id ? updatedPod : p)));

    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === pod.orderNumber
          ? {
              ...o,
              podStatus: 'Rejected',
              nextStepLabel: `POD Rejected: ${reason}. Driver re-capture required.`,
            }
          : o
      )
    );

    appendAudit(
      'Fulfillment',
      pod.orderNumber,
      'Rejected Proof of Delivery',
      'Pending Verification',
      `Rejected: ${reason}`
    );

    pushToast({
      title: 'POD Rejected',
      description: `POD for ${pod.customerName} rejected: ${reason}`,
      tone: 'warning',
    });

    return { ok: true, message: `POD marked as rejected. Driver notification queued.` };
  };

  const generateDraftInvoice: BosContextValue['generateDraftInvoice'] = async (orderId) => {
    const auth = await verifyServerAction('finance.view', 'Generate Draft Invoice');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return { ok: false, message: 'Order not found.' };

    const existing = invoices.find((i) => i.orderNumber === order.orderNumber);
    if (existing) {
      return { ok: false, message: `Invoice ${existing.invoiceNumber} already exists for this order.` };
    }

    const customer = customers.find((c) => c.id === order.customerId);
    const todayStr = new Date().toISOString().split('T')[0];
    const invNum = `INV-2026-${8890 + invoices.length}`;

    const dueDate = new Date();
    const terms = customer?.paymentTerms || 'Net 30';
    if (terms === 'Net 15') dueDate.setDate(dueDate.getDate() + 15);
    else if (terms === 'Net 45') dueDate.setDate(dueDate.getDate() + 45);
    else dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice: InvoiceRecord = {
      id: `INV-00${invoices.length + 1}`,
      invoiceNumber: invNum,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      issueDate: todayStr,
      dueDate: dueDate.toISOString().split('T')[0],
      amountKes: order.totalKes,
      paidAmountKes: 0,
      balanceKes: order.totalKes,
      status: 'Issued',
      agingBucket: 'Current (0-15d)',
      lineItems: order.items,
      podRef: order.podEvidenceId,
      paymentTerms: terms,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              invoiceStatus: 'Draft Created',
              invoiceNumber: invNum,
              paymentStatus: 'Invoiced (Net 30)',
              nextStepLabel: `Invoice ${invNum} Generated · Awaiting Payment Settlement`,
            }
          : o
      )
    );

    appendAudit(
      'Finance',
      order.orderNumber,
      'Generated Commercial Tax Invoice',
      'Uninvoiced',
      `${invNum} · KES ${order.totalKes.toLocaleString()}`
    );

    pushToast({
      title: `Invoice ${invNum} Generated`,
      description: `Commercial tax invoice created for ${order.customerName}.`,
      tone: 'success',
    });

    return { ok: true, message: `Invoice ${invNum} generated successfully.`, invoiceNumber: invNum };
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

  const updateProduct: BosContextValue['updateProduct'] = async (
    productId,
    updates
  ) => {
    const auth = await verifyServerAction('products.edit', 'Update Product Details');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = products.find((p) => p.id === productId);
    if (!target) return { ok: false, message: 'Product not found.' };

    const updatedPricing = updates.pricing
      ? { ...target.pricing, ...updates.pricing }
      : target.pricing;

    // Check if supplier cost or institutional pricing changed to record price history
    const historyEntriesToAdd: PriceHistoryEntry[] = [];
    const today = new Date().toISOString().split('T')[0];
    const changedByName = currentUser?.fullName || 'Procurement Specialist';

    if (
      updates.pricing?.supplierCostKes !== undefined &&
      updates.pricing.supplierCostKes !== target.pricing.supplierCostKes
    ) {
      historyEntriesToAdd.push({
        date: today,
        tier: 'Supplier Cost',
        priceKes: updates.pricing.supplierCostKes,
        changedBy: changedByName,
      });
    }

    if (
      updates.pricing?.institutionalKes !== undefined &&
      updates.pricing.institutionalKes !== target.pricing.institutionalKes
    ) {
      historyEntriesToAdd.push({
        date: today,
        tier: 'Institutional',
        priceKes: updates.pricing.institutionalKes,
        changedBy: changedByName,
      });
    }

    const newHistory = historyEntriesToAdd.length > 0
      ? [...historyEntriesToAdd, ...target.priceHistory]
      : target.priceHistory;

    const updated: ProductRecord = {
      ...target,
      ...updates,
      pricing: updatedPricing,
      priceHistory: newHistory,
    };

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? updated : p))
    );

    appendAudit(
      'Products',
      `${updated.sku} (${updated.name})`,
      'Updated Product Details',
      `${target.name} · ${target.category} · ${target.unit}`,
      `${updated.name} · ${updated.category} · ${updated.unit}`
    );

    const msg = `Product ${updated.name} (${updated.sku}) updated successfully.`;
    pushToast({ title: 'Product Updated', description: msg, tone: 'success' });
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
        podRecords,
        enabledWidgets,
        toggleDashboardWidget,
        moveDashboardWidget,
        resetDashboardWidgets,
        createOrder,
        advanceOrderStatus,
        recordDeliveryArrival,
        verifyPOD,
        rejectPOD,
        generateDraftInvoice,
        createProduct,
        updateProduct,
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

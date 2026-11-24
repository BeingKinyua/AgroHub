'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AccountStatus,
  ApprovalRequestRecord,
  AuditLogRecord,
  CrmTicketRecord,
  CustomerInstitutionRecord,
  DeliveryRunRecord,
  DocumentRecord,
  DriverRecord,
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
  PODEvidenceRecord,
  PODStatus,
  PriceHistoryEntry,
  ProcurementOrderRecord,
  ProductRecord,
  PurchaseLineInput,
  PurchaseReceiptLineInput,
  PurchaseReceiptRecord,
  RoleDefinition,
  StockBatchRecord,
  StockMovementRecord,
  SupplierContract,
  SupplierDocumentItem,
  SupplierEvaluationRecord,
  SupplierPayableRecord,
  SupplierPaymentRecord,
  SupplierRecord,
  UnitOfMeasure,
  VehicleRecord,
  WarehouseRecord,
} from '@/types/domain/bos';
import {
  buildPurchaseLines,
  getOrderSourcingLines,
  getSupplierDueDate,
  isCalendarDate,
  planPurchaseReceipt,
  purchaseLineId,
  reserveOrderStock,
  resolveOrderAllocation,
} from '@/lib/services/procurement-rules';
import {
  calculateInvoiceEligibility,
  isSupplierEligibleForPurchasing,
  calculateSupplierBalances,
  validateSupplierPayment,
  generateNextSku,
} from '@/lib/services/business-rules';
import {
  allocateInvoicePayment,
  canAccessDeliveryRun,
  getDeliveryRunStops,
  getExistingPODInvoice,
  getOrderReceipts,
  getPODExpectedLines,
  getUnassignedPackedOrders,
  isDeliveryPlanDate,
  isOpenPODDiscrepancy,
  isPendingPOD,
  isReplacementBatchUsable,
  permitsManualOrderStage,
  planReplacementLoad,
  preparePODReceipt,
  replacementPicksCoverDemand,
  replacementStockNeededThrough,
  type DeliveryPlanInput,
  type PODQuantityInput,
  type ReplacementLoadInput,
} from '@/lib/services/delivery-workflow';
import { canSourceCatalogProduct, identifySupplierOffering, reconcileSupplierOfferings } from '@/lib/services/supplier-offerings';
import type { SupplierOfferingInput } from '@/lib/services/supplier-offerings';
import { getNairobiDate, offsetBusinessDate } from '@/lib/services/workspace-metrics';
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
  INITIAL_DRIVERS,
  INITIAL_INVOICES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PAYMENTS,
  INITIAL_PROCUREMENT_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_BATCHES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIER_PAYABLES,
  INITIAL_SUPPLIER_PAYMENTS,
  INITIAL_USERS,
  INITIAL_VEHICLES,
  INITIAL_WAREHOUSES,
} from '@/lib/services/initial-data';

export type ThemeMode = 'light' | 'dark' | 'system';

type SupplierDetailsInput = Pick<SupplierRecord,
  'name' | 'category' | 'region' | 'contactPerson' | 'phone' | 'email' | 'leadTimeDays' | 'paymentTerms' | 'paymentDetails'
> & { suppliedProducts?: SupplierOfferingInput[] };

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
  vehicles: VehicleRecord[];
  drivers: DriverRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
  deletedSkus: string[];

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
      receivingDepartment?: string;
      deliveryRunId?: string;
      quantities: PODQuantityInput[];
      quantitiesConfirmed: boolean;
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
    options: { quantities: PODQuantityInput[]; quantitiesConfirmed: boolean; createInvoice: boolean; notes?: string }
  ) => Promise<{ ok: boolean; message: string; invoiceNumber?: string }>;
  rejectPOD: (
    podId: string,
    reason: string
  ) => Promise<{ ok: boolean; message: string }>;
  reconcilePODDiscrepancy: (
    podId: string,
    resolution: {
      action: 'Accept Final Quantities' | 'Schedule Re-delivery';
      notes: string;
      replacementDate?: string;
    }
  ) => Promise<{ ok: boolean; message: string }>;
  generateDraftInvoice: (
    orderId: string,
    podId?: string
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
    warehouseId?: string;
    lines: PurchaseLineInput[];
    expectedDate: string;
    purpose: NonNullable<ProcurementOrderRecord['purpose']>;
    customerOrderId?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  advanceProcurementStage: (
    poId: string
  ) => Promise<{ ok: boolean; message: string }>;
  closePurchaseBalance: (poId: string, reason: string) => Promise<{ ok: boolean; message: string }>;
  updateDeliveryStatus: (
    runId: string,
    status: DeliveryRunRecord['status'],
    recipientSignOff?: string
  ) => Promise<{ ok: boolean; message: string }>;
  createDeliveryRun: (input: DeliveryPlanInput) => Promise<{ ok: boolean; message: string }>;
  loadReplacementRun: (runId: string, input: ReplacementLoadInput) => Promise<{ ok: boolean; message: string }>;
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
  createSupplier: (input: SupplierDetailsInput) => Promise<{ ok: boolean; message: string; supplier?: SupplierRecord }>;
  updateSupplier: (
    id: string,
    updates: Partial<SupplierDetailsInput>
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

  // SKU & Product Lifecycle
  getNextSku: (category: string) => string;
  archiveProduct: (productId: string) => Promise<{ ok: boolean; message: string }>;
  restoreProduct: (productId: string) => Promise<{ ok: boolean; message: string }>;
  deleteProduct: (productId: string) => Promise<{ ok: boolean; message: string }>;

  // Supplier Enhancements & Sourcing
  archiveSupplier: (supplierId: string) => Promise<{ ok: boolean; message: string }>;
  restoreSupplier: (supplierId: string) => Promise<{ ok: boolean; message: string }>;
  deleteSupplier: (supplierId: string) => Promise<{ ok: boolean; message: string }>;
  addSupplierProduct: (
    supplierId: string,
    item: {
      productId: string;
      productName: string;
      unit: UnitOfMeasure;
      currentCostKes: number;
      leadTimeDays?: number;
      moq?: number;
    }
  ) => Promise<{ ok: boolean; message: string }>;
  getSuppliersForProduct: (productId: string) => SupplierRecord[];

  // Procurement Sourcing & Supplier Payables
  confirmPurchaseAndCollection: (input: {
    poId: string;
    receiptId: string;
    lines: PurchaseReceiptLineInput[];
    legacyCostKes?: number;
    receiptRef?: string;
    supplierInvoiceRef?: string;
    dueDate?: string;
    settlement?: { amountKes: number; method: 'Cash' | 'M-Pesa Business'; reference: string };
  }) => Promise<{ ok: boolean; message: string; payableId?: string }>;
  recordSupplierPayment: (input: {
    payableId: string;
    amountKes: number;
    paymentMethod: SupplierPaymentRecord['paymentMethod'];
    referenceNumber: string;
    notes?: string;
  }) => Promise<{ ok: boolean; message: string }>;

  // Fleet & Driver Management
  createVehicle: (input: Omit<VehicleRecord, 'id'>) => Promise<{ ok: boolean; message: string }>;
  updateVehicle: (id: string, updates: Partial<VehicleRecord>) => Promise<{ ok: boolean; message: string }>;
  createDriver: (input: Omit<DriverRecord, 'id' | 'deliveriesCompleted' | 'rating'>) => Promise<{ ok: boolean; message: string }>;
  updateDriver: (id: string, updates: Partial<DriverRecord>) => Promise<{ ok: boolean; message: string }>;
  reassignDeliveryRun: (
    runId: string,
    vehicleIdOrDetails:
      | string
      | {
          vehicleId?: string;
          vehicleReg?: string;
          driverId?: string;
          driverName?: string;
          driverPhone?: string;
          transportCostKes?: number;
        },
    driverId?: string
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

// Commands may resume after authorization before React has rendered the previous update.
function useBusinessRecords<T>(initial: T[]) {
  const [records, setRecords] = useState(initial);
  const current = useRef(initial);
  const update = (transform: (previous: T[]) => T[]) => {
    current.current = transform(current.current);
    setRecords(current.current);
  };
  return [records, update, current] as const;
}

const INITIAL_SUPPLIERS_WITH_OFFERINGS = INITIAL_SUPPLIERS.map((supplier) => ({
  ...supplier,
  suppliedProducts: supplier.suppliedProducts.map((offering) => identifySupplierOffering(supplier.id, offering)),
}));

export function BosProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(
    INITIAL_USERS[0]
  );
  const [isInitialized, setIsInitialized] = useState(true);
  const [demoModeEnabled, setDemoModeState] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedDark, setResolvedDark] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [users, setUsers] = useState<InternalUser[]>(INITIAL_USERS);
  const [warehouses] = useState<WarehouseRecord[]>(INITIAL_WAREHOUSES);
  const [products, setProducts, currentProducts] = useBusinessRecords(INITIAL_PRODUCTS);
  const [stockBatches, setStockBatches, currentStockBatches] = useBusinessRecords(INITIAL_STOCK_BATCHES);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(
    INITIAL_STOCK_MOVEMENTS
  );
  const [customers, setCustomers] =
    useState<CustomerInstitutionRecord[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders, currentOrders] = useBusinessRecords(INITIAL_ORDERS);
  const [suppliers, setSuppliers, currentSuppliers] = useBusinessRecords(INITIAL_SUPPLIERS_WITH_OFFERINGS);
  const supplierSequence = useRef(Math.max(0, ...INITIAL_SUPPLIERS.map((supplier) => Number(supplier.id.match(/^SUP-(\d+)$/)?.[1] ?? 0))));
  const [procurementOrders, setProcurementOrders, currentProcurementOrders] = useBusinessRecords(INITIAL_PROCUREMENT_ORDERS);
  const [deliveries, setDeliveries, currentDeliveries] = useBusinessRecords(INITIAL_DELIVERIES);
  const [podLedger, setPodLedger] = useState({ records: INITIAL_PODS, invoices: INITIAL_INVOICES });
  const podLedgerRef = useRef(podLedger);
  const { records: podRecords, invoices } = podLedger;
  const updatePodLedger = (update: (current: typeof podLedger) => typeof podLedger) => {
    const next = update(podLedgerRef.current);
    podLedgerRef.current = next;
    setPodLedger(next);
  };
  const [payments, setPayments, currentPayments] = useBusinessRecords<PaymentRecord>(INITIAL_PAYMENTS);
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
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<DriverRecord[]>(INITIAL_DRIVERS);
  const [supplierPayables, setSupplierPayables, currentSupplierPayables] = useBusinessRecords(INITIAL_SUPPLIER_PAYABLES);
  const [supplierPayments, setSupplierPayments, currentSupplierPayments] = useBusinessRecords(INITIAL_SUPPLIER_PAYMENTS);
  const [deletedSkus, setDeletedSkus] = useState<string[]>([]);
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
    const reservedByProduct = new Map<string, number>();
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
      const product = currentProducts.current.find((p) => p.id === item.productId);
      if (!product || !canSourceCatalogProduct(product)) {
        return { ok: false, message: 'Select a product currently available to order.' };
      }
      if ((item.overridePriceKes !== undefined && (!Number.isFinite(item.overridePriceKes) || item.overridePriceKes <= 0)) ||
          (item.purchaseCostKes !== undefined && (!Number.isFinite(item.purchaseCostKes) || item.purchaseCostKes < 0))) {
        return { ok: false, message: `Enter a valid price and estimated sourcing cost for ${product.name}.` };
      }

      const reserved = reservedByProduct.get(product.id) ?? 0;
      const allocation = resolveOrderAllocation(item, Math.max(0, product.availableQty - reserved));
      if (allocation.ok === false) return { ok: false, message: `${product.name}. ${allocation.message}` };
      const { quantity: qty, sourcingMode, stockQty, directQty } = allocation;
      reservedByProduct.set(product.id, reserved + stockQty);

      // Auto-assign FEFO batch
      const matchingBatch =
        item.allocatedBatch ||
        (stockQty === 0
          ? 'DIRECT-FARM-DISPATCH'
          : currentStockBatches.current
              .filter((b) => b.productId === product.id && b.daysToExpiry > 0)
              .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0]?.batchNumber ||
            'LOT-FEFO-AUTO');

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
        id: `line-${processedItems.length + 1}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: qty,
        allocatedBatch: matchingBatch,
        unitPriceKes: finalUnitPrice,
        pricingTier,
        lineTotalKes,
        sourcingMode,
        stockAllocatedQty: stockQty,
        directProcuredQty: directQty,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        purchaseCostKes: item.purchaseCostKes,
      });

    }

    const needsPriceApproval = priceOverrideApprovals.length > 0;
    const needsSourcing = processedItems.some((item) => (item.directProcuredQty ?? 0) > 0);
    const orderNumber = `ORD-2026-${888 + currentOrders.current.length}`;
    const orderId = `ORD-00${currentOrders.current.length + 1}`;
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
        : needsSourcing ? 'Source outstanding customer quantities' : 'Release to Warehouse Picking Queue',
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

    setProducts((prev) => reserveOrderStock(prev, processedItems));

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

  const syncRunReceipts = (run: DeliveryRunRecord, records: PODEvidenceRecord[]) => {
    const stops = getDeliveryRunStops(run, currentOrders.current, records);
    const received = stops.filter(({ receipt }) => receipt && receipt.status !== 'Rejected').length;
    const status = received === stops.length ? 'Delivered' : received > 0 ? 'Partially Delivered' : 'Dispatched';
    setDeliveries((previous) => previous.map((entry) => entry.id === run.id ? {
      ...entry,
      status,
      podCaptured: received === stops.length,
      recipientSignOff: received ? `${received} of ${stops.length} stops recorded` : undefined,
    } : entry));
  };

  const recordDeliveryArrival: BosContextValue['recordDeliveryArrival'] = async (orderId, details) => {
    const auth = await verifyServerAction('deliveries.dispatch', 'Record Delivery Arrival');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const order = currentOrders.current.find((entry) => entry.id === orderId || entry.orderNumber === orderId);
    if (!order) return { ok: false, message: 'Order not found.' };

    const run = currentDeliveries.current.find((entry) => entry.id === details.deliveryRunId);
    if (!run || !['Dispatched', 'Partially Delivered'].includes(run.status)) {
      return { ok: false, message: 'Select an order on a dispatched delivery run.' };
    }
    if (!canAccessDeliveryRun(run, currentUser, drivers)) {
      return { ok: false, message: 'This delivery run is assigned to another driver.' };
    }
    if (!run.ordersIncluded.some((identifier) => identifier === order.id || identifier === order.orderNumber)) {
      return { ok: false, message: 'This order does not belong to the selected delivery run.' };
    }

    const { records } = podLedgerRef.current;
    const receipts = getOrderReceipts(order, records);
    const sameStop = receipts.find((pod) => pod.deliveryRunId === run.id || pod.deliveryRunId === run.runNumber);
    if (sameStop && sameStop.status !== 'Rejected') {
      return { ok: false, message: 'This stop already has a proof of delivery.' };
    }
    if (receipts.some(isPendingPOD)) {
      return { ok: false, message: 'The previous proof of delivery must be reviewed before further quantities can be recorded.' };
    }
    if (order.status === 'Cancelled' || order.status === 'Closed' || receipts.some((pod) => pod.shortageAccepted)) {
      return { ok: false, message: 'This order is closed to new receipts.' };
    }
    if (!details.recipientName.trim() || !details.quantitiesConfirmed) {
      return { ok: false, message: 'Enter the recipient name and confirm the received and accepted quantities.' };
    }

    const expected = getPODExpectedLines(order, records);
    if (run.sourcePODId && (!run.replacementLoad || !replacementPicksCoverDemand(expected, run.replacementLoad.picks))) {
      return { ok: false, message: 'The replacement run has no confirmed load for these outstanding quantities.' };
    }
    const result = preparePODReceipt(expected, details.quantities);
    if (result.ok === false) return result;

    const now = new Date();
    const today = getNairobiDate(now);
    const podId = `POD-${today.slice(0, 4)}-${String(records.length + 1).padStart(3, '0')}`;
    const newReceipt: PODEvidenceRecord = {
      id: podId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryRunId: run.id,
      customerName: order.customerName,
      recipientName: details.recipientName.trim(),
      recipientRole: details.recipientRole?.trim(),
      recipientPhone: details.recipientPhone,
      receivingDepartment: details.receivingDepartment?.trim(),
      deliveryDate: today,
      submittedAt: now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      submittedBy: currentUser!.fullName,
      status: 'Pending Verification',
      reconciliationStatus: result.hasDiscrepancies ? 'Disputed' : 'Fully Reconciled',
      deliveredItems: result.items,
      evidenceFiles: details.files || [],
      deliveryNotes: details.notes,
      deliveryExceptions: details.exceptions,
      hasDiscrepancies: result.hasDiscrepancies,
    };

    const nextRecords = [newReceipt, ...records];
    updatePodLedger((ledger) => ({ ...ledger, records: nextRecords }));
    syncRunReceipts(run, nextRecords);
    setOrders((previous) => previous.map((entry) => entry.id === order.id ? {
      ...entry,
      status: result.hasOutstanding ? 'Partially Fulfilled' : 'Delivered',
      podStatus: 'Pending Verification',
      podEvidenceId: podId,
      nextStepLabel: 'Review received and accepted quantities',
    } : entry));

    if (result.hasDiscrepancies) {
      setNotifications((previous) => [{
        id: `NOTIF-${podId}`,
        severity: 'Warning',
        title: `Delivery discrepancy · ${order.orderNumber}`,
        description: `${order.customerName} recorded a delivery discrepancy. Review the proof of delivery.`,
        timestamp: now.toISOString(),
        href: '/fulfillment#pod-queue',
        permissionRequired: 'fulfillment.manage',
        read: false,
      }, ...previous]);
    }

    appendAudit('Deliveries', order.orderNumber, 'Submitted proof of delivery', order.status, podId);
    return { ok: true, message: `${podId} submitted for verification.`, podId };
  };

  const getAcceptedGoodsInvoice = (pod: PODEvidenceRecord, order: OrderRecord, currentInvoices: InvoiceRecord[]) => {
    const existing = getExistingPODInvoice(pod, currentInvoices);
    const eligibility = calculateInvoiceEligibility(pod, existing?.invoiceNumber);
    const customer = customers.find((entry) => entry.id === order.customerId);
    if (!eligibility.eligible) return { ok: false as const, message: eligibility.reason ?? 'No accepted goods to invoice.' };
    if (!customer?.isInstitutional || customer.paymentTerms === 'Prepaid / M-Pesa') {
      return { ok: false as const, message: 'This customer is not on institutional credit terms.' };
    }

    const issueDate = getNairobiDate();
    const year = issueDate.slice(0, 4);
    const sequence = 8890 + currentInvoices.length;
    const terms = customer.paymentTerms;
    const invoice: InvoiceRecord = {
      id: `INV-00${currentInvoices.length + 1}`,
      invoiceNumber: `INV-${year}-${sequence}`,
      orderNumber: order.orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      issueDate,
      dueDate: offsetBusinessDate(issueDate, Number(terms.slice(4))),
      amountKes: eligibility.billableTotalKes,
      paidAmountKes: 0,
      balanceKes: eligibility.billableTotalKes,
      status: 'Issued',
      agingBucket: 'Current (0-15d)',
      lineItems: eligibility.billableLines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        unit: line.unit as UnitOfMeasure,
        quantity: line.billableQty,
        allocatedBatch: 'Delivered-Verified',
        unitPriceKes: line.unitPriceKes,
        pricingTier: 'Institutional',
        lineTotalKes: line.lineTotalKes,
      })),
      podRef: pod.id,
      paymentTerms: terms,
    };
    return { ok: true as const, invoice };
  };

  const addCustomerInvoiceBalance = (invoice: InvoiceRecord) => {
    setCustomers((previous) => previous.map((customer) => customer.id === invoice.customerId
      ? { ...customer, outstandingBalanceKes: customer.outstandingBalanceKes + invoice.amountKes }
      : customer));
  };

  const verifyPOD: BosContextValue['verifyPOD'] = async (podId, options) => {
    const auth = await verifyServerAction('orders.approve', 'Verify Proof of Delivery');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const ledger = podLedgerRef.current;
    const pod = ledger.records.find((entry) => entry.id === podId);
    if (!pod || !isPendingPOD(pod)) return { ok: false, message: 'Only a pending proof of delivery can be verified.' };
    if (!options.quantitiesConfirmed) return { ok: false, message: 'Confirm the quantities checked against the delivery evidence.' };

    const order = currentOrders.current.find((entry) => entry.id === pod.orderId && entry.orderNumber === pod.orderNumber);
    if (!order) return { ok: false, message: 'The order linked to this proof of delivery could not be identified.' };
    if (order.status === 'Cancelled' || order.status === 'Closed') {
      return { ok: false, message: 'The linked order is closed to verification.' };
    }
    const expected = getPODExpectedLines(order, ledger.records, pod);
    const result = preparePODReceipt(expected, options.quantities);
    if (result.ok === false) return result;

    const verified: PODEvidenceRecord = {
      ...pod,
      status: 'Verified',
      capturedItems: pod.capturedItems ?? pod.deliveredItems,
      deliveredItems: result.items,
      hasDiscrepancies: result.hasDiscrepancies,
      reconciliationStatus: result.hasDiscrepancies ? 'Disputed' : 'Fully Reconciled',
      verifiedBy: currentUser!.fullName,
      verifiedAt: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      verificationNotes: options.notes?.trim() || undefined,
    };

    const billing = options.createInvoice ? getAcceptedGoodsInvoice(verified, order, ledger.invoices) : null;
    if (billing?.ok === false) return billing;
    const invoice = billing?.ok === true ? billing.invoice : undefined;
    updatePodLedger((current) => ({
      records: current.records.map((entry) => {
        if (entry.id === podId) return invoice
          ? { ...verified, invoiceCreated: true, invoiceNumber: invoice.invoiceNumber }
          : verified;
        if (entry.orderId === order.id && entry.replacementRunId && entry.reconciliationStatus === 'Pending Resolution' && !result.hasOutstanding) {
          return {
            ...entry,
            reconciliationStatus: 'Fully Reconciled',
            discrepancyNotes: [entry.discrepancyNotes, `Remaining goods verified on ${podId}.`].filter(Boolean).join(' · '),
          };
        }
        return entry;
      }),
      invoices: invoice ? [invoice, ...current.invoices] : current.invoices,
    }));
    if (invoice) addCustomerInvoiceBalance(invoice);

    setOrders((previous) => previous.map((entry) => entry.id === order.id ? {
      ...entry,
      status: result.hasOutstanding ? 'Partially Fulfilled' : 'Delivered',
      podStatus: 'Verified',
      invoiceStatus: invoice ? 'Issued' : entry.invoiceStatus,
      invoiceNumber: invoice?.invoiceNumber ?? entry.invoiceNumber,
      nextStepLabel: result.hasOutstanding ? 'Review outstanding quantities'
        : result.hasDiscrepancies ? 'Resolve the delivery discrepancy'
        : invoice ? 'Review invoice and close order' : 'Review billing and close order',
    } : entry));

    appendAudit('Fulfillment', order.orderNumber, 'Verified accepted delivery quantities', 'Pending Verification',
      invoice ? `Verified · ${invoice.invoiceNumber}` : 'Verified');
    return {
      ok: true,
      message: invoice ? `Proof of delivery verified and invoice ${invoice.invoiceNumber} issued.` : 'Proof of delivery verified.',
      invoiceNumber: invoice?.invoiceNumber,
    };
  };

  const reconcilePODDiscrepancy: BosContextValue['reconcilePODDiscrepancy'] = async (podId, resolution) => {
    const auth = await verifyServerAction('orders.approve', 'Reconcile Delivery Discrepancy');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const { records } = podLedgerRef.current;
    const pod = records.find((entry) => entry.id === podId);
    if (!pod || pod.status !== 'Verified' || !isOpenPODDiscrepancy(pod)) {
      return { ok: false, message: 'Verify the quantities before resolving an open delivery discrepancy.' };
    }
    const notes = resolution.notes.trim();
    if (!notes) return { ok: false, message: 'Enter the resolution notes.' };
    const order = currentOrders.current.find((entry) => entry.id === pod.orderId && entry.orderNumber === pod.orderNumber);
    if (!order) return { ok: false, message: 'The linked order could not be identified.' };
    const expected = getPODExpectedLines(order, records);
    const hasOutstanding = expected.some((line) => line.outstandingQty > 0);
    const openReplacementRun = currentDeliveries.current.some((run) => run.sourcePODId &&
      run.ordersIncluded.includes(order.orderNumber) && run.status !== 'Delivered' && run.status !== 'Rescheduled');
    if (openReplacementRun || getOrderReceipts(order, records).some(isPendingPOD)) {
      return { ok: false, message: 'Complete the pending delivery or verification before resolving the remaining quantities.' };
    }

    let replacementRunId = pod.replacementRunId;
    if (resolution.action === 'Schedule Re-delivery') {
      if (replacementRunId) return { ok: false, message: 'A replacement run is already scheduled.' };
      const original = currentDeliveries.current.find((entry) => entry.id === pod.deliveryRunId || entry.runNumber === pod.deliveryRunId);
      if (!original || !hasOutstanding) {
        return { ok: false, message: 'A linked route and outstanding order quantities are required.' };
      }
      const scheduledDate = resolution.replacementDate ?? '';
      if (!isDeliveryPlanDate(scheduledDate)) {
        return { ok: false, message: 'Choose a replacement delivery date on or after today.' };
      }

      replacementRunId = `RUN-R-${pod.id}`;
      const replacement: DeliveryRunRecord = {
        id: replacementRunId,
        runNumber: `${original.runNumber}-R${pod.id.split('-').at(-1)}`,
        routeZone: original.routeZone,
        vehicleReg: original.vehicleReg,
        driverName: original.driverName,
        driverPhone: original.driverPhone,
        departureTime: 'To be confirmed',
        scheduledDate,
        status: 'Planned',
        ordersIncluded: [order.orderNumber],
        institutionsServed: [order.customerName],
        totalWeightKg: expected.filter((line) => line.unit === 'kilograms').reduce((sum, line) => sum + line.outstandingQty, 0),
        assignedDriverId: original.assignedDriverId,
        assignedVehicleId: original.assignedVehicleId,
        sourcePODId: pod.id,
        podCaptured: false,
      };
      setDeliveries((previous) => [replacement, ...previous]);
      setOrders((previous) => previous.map((entry) => entry.id === order.id
        ? { ...entry, nextStepLabel: `Replacement delivery planned for ${scheduledDate}` }
        : entry));
    }

    const reconciliationStatus = resolution.action === 'Schedule Re-delivery' ? 'Pending Resolution' : 'Fully Reconciled';
    const shortageAccepted = resolution.action === 'Accept Final Quantities' && hasOutstanding;
    updatePodLedger((ledger) => ({
      ...ledger,
      records: ledger.records.map((entry) => entry.id === pod.id ? {
        ...entry,
        replacementRunId,
        reconciliationStatus,
        shortageAccepted,
        discrepancyNotes: [entry.discrepancyNotes, `${resolution.action} · ${notes} · ${currentUser!.fullName}`].filter(Boolean).join(' · '),
      } : entry.orderId === order.id && entry.replacementRunId && entry.reconciliationStatus === 'Pending Resolution' && shortageAccepted
        ? { ...entry, reconciliationStatus: 'Fully Reconciled', discrepancyNotes: [entry.discrepancyNotes, `Final quantities accepted on ${pod.id}.`].filter(Boolean).join(' · ') }
        : entry),
    }));
    if (shortageAccepted) {
      setOrders((previous) => previous.map((entry) => entry.id === order.id
        ? { ...entry, status: 'Delivered', nextStepLabel: 'Review billing and close order' }
        : entry));
    }
    appendAudit('Fulfillment', pod.orderNumber, resolution.action, pod.reconciliationStatus || 'Disputed', notes);
    return { ok: true, message: resolution.action === 'Schedule Re-delivery' ? 'Replacement delivery planned.' : 'Final accepted quantities recorded.' };
  };

  const rejectPOD: BosContextValue['rejectPOD'] = async (podId, reason) => {
    const auth = await verifyServerAction('orders.approve', 'Reject Proof of Delivery');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const { records } = podLedgerRef.current;
    const pod = records.find((entry) => entry.id === podId);
    if (!pod || !isPendingPOD(pod)) return { ok: false, message: 'Only a pending proof of delivery can be rejected.' };
    const note = reason.trim();
    if (!note) return { ok: false, message: 'Enter a rejection reason.' };

    const nextRecords: PODEvidenceRecord[] = records.map((entry) => entry.id === podId ? {
      ...entry,
      status: 'Rejected',
      rejectionReason: note,
      verifiedBy: currentUser!.fullName,
      verifiedAt: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
    } : entry);
    updatePodLedger((ledger) => ({ ...ledger, records: nextRecords }));
    const run = currentDeliveries.current.find((entry) => entry.id === pod.deliveryRunId || entry.runNumber === pod.deliveryRunId);
    if (run) syncRunReceipts(run, nextRecords);

    setOrders((previous) => previous.map((order) => order.id === pod.orderId ? {
      ...order,
      status: 'Dispatched',
      podStatus: 'Rejected',
      nextStepLabel: 'Capture a corrected proof of delivery',
    } : order));

    appendAudit('Fulfillment', pod.orderNumber, 'Rejected proof of delivery', 'Pending Verification', note);
    return { ok: true, message: 'Proof of delivery rejected. The stop is open for a corrected receipt.' };
  };

  const generateDraftInvoice: BosContextValue['generateDraftInvoice'] = async (orderId, podId) => {
    const auth = await verifyServerAction('finance.record_payment', 'Issue Accepted Goods Invoice');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const order = currentOrders.current.find((entry) => entry.id === orderId || entry.orderNumber === orderId);
    if (!order) return { ok: false, message: 'Order not found.' };

    const ledger = podLedgerRef.current;
    const eligible = getOrderReceipts(order, ledger.records).filter((entry) => entry.status === 'Verified');
    const pod = podId ? eligible.find((entry) => entry.id === podId)
      : eligible.find((entry) => calculateInvoiceEligibility(entry, getExistingPODInvoice(entry, ledger.invoices)?.invoiceNumber).eligible);
    if (!pod) return { ok: false, message: 'Select a verified receipt with unbilled accepted quantities.' };

    const billing = getAcceptedGoodsInvoice(pod, order, ledger.invoices);
    if (billing.ok === false) return billing;
    const { invoice } = billing;
    updatePodLedger((current) => ({
      records: current.records.map((entry) => entry.id === pod.id
        ? { ...entry, invoiceCreated: true, invoiceNumber: invoice.invoiceNumber }
        : entry),
      invoices: [invoice, ...current.invoices],
    }));
    addCustomerInvoiceBalance(invoice);

    setOrders((previous) => previous.map((entry) => entry.id === order.id ? {
      ...entry,
      invoiceStatus: 'Issued',
      invoiceNumber: invoice.invoiceNumber,
    } : entry));

    appendAudit('Finance', order.orderNumber, 'Issued accepted-goods invoice', pod.id, invoice.invoiceNumber);
    return { ok: true, message: `Invoice ${invoice.invoiceNumber} issued.`, invoiceNumber: invoice.invoiceNumber };
  };

  const advanceOrderStatus: BosContextValue['advanceOrderStatus'] = async (
    orderId,
    nextStatus
  ) => {
    const requiredPerm: PermissionKey =
      nextStatus === 'Picking' || nextStatus === 'Packed'
        ? 'fulfillment.manage'
        : 'orders.edit';

    const auth = await verifyServerAction(
      requiredPerm,
      `Advance Order Status to ${nextStatus}`
    );
    if (!auth.ok) return { ok: false, message: auth.error! };

    const target = currentOrders.current.find((o) => o.id === orderId);
    if (!target) return { ok: false, message: 'Order not found.' };
    if (!permitsManualOrderStage(target.status, nextStatus)) {
      return { ok: false, message: 'Use the next available action for this order in Fulfillment, Deliveries, or Approvals.' };
    }
    if (nextStatus === 'Closed') {
      const receipts = getOrderReceipts(target, podLedgerRef.current.records);
      const outstanding = getPODExpectedLines(target, receipts).some((line) => line.outstandingQty > 0);
      if (target.status !== 'Delivered' || !receipts.some((pod) => pod.status === 'Verified') ||
          receipts.some((pod) => isPendingPOD(pod) || isOpenPODDiscrepancy(pod)) ||
          (outstanding && !receipts.some((pod) => pod.shortageAccepted))) {
        return { ok: false, message: 'Verify delivery quantities and resolve open discrepancies before closing.' };
      }
      const customer = customers.find((entry) => entry.id === target.customerId);
      if (customer?.isInstitutional && customer.paymentTerms !== 'Prepaid / M-Pesa' && receipts.some((pod) =>
        pod.status === 'Verified' && calculateInvoiceEligibility(pod, getExistingPODInvoice(pod, podLedgerRef.current.invoices)?.invoiceNumber).eligible)) {
        return { ok: false, message: 'Issue the invoices for verified accepted quantities before closing.' };
      }
    }

    const stillSourcing = getOrderSourcingLines(target, currentProcurementOrders.current)
      .filter((line) => line.outstanding > 0);
    if (nextStatus === 'Packed' && stillSourcing.length) {
      const required = stillSourcing.map(({ item, outstanding }) =>
        `${item.productName} ${outstanding.toLocaleString()} ${item.unit}`
      ).join(', ');
      return { ok: false, message: `Source the outstanding quantities before packing or dispatching. ${required}.` };
    }

    const nextStepMap: Record<OrderLifecycleStatus, string> = {
      Draft: 'Confirm Order Details',
      'Pending Payment': 'Verify M-Pesa / EFT Receipt',
      Confirmed: stillSourcing.length ? 'Source outstanding customer quantities' : 'Release to Warehouse Picking Queue',
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

    const target = currentProducts.current.find((p) => p.id === productId);
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

    const target = currentProducts.current.find((p) => p.id === productId);
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

    const batch = currentStockBatches.current.find((b) => b.id === input.batchId);
    if (!batch) return { ok: false, message: 'Stock batch not found.' };

    const product = currentProducts.current.find((item) => item.id === batch.productId);
    const newAvailable = batch.availableQty + input.quantityDelta;
    if (!product || !Number.isFinite(input.quantityDelta) || input.quantityDelta === 0 ||
        newAvailable < 0 || product.availableQty + input.quantityDelta < 0) {
      return { ok: false, message: 'Enter a stock movement within the available batch and product quantities.' };
    }

    setStockBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id ? { ...b, availableQty: newAvailable } : b
      )
    );

    setProducts((prev) =>
      prev.map((p) =>
        p.id === batch.productId
          ? { ...p, availableQty: p.availableQty + input.quantityDelta }
          : p
      )
    );

    const mov: StockMovementRecord = {
      id: `MOV-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
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

    const supplier = currentSuppliers.current.find((s) => s.id === input.supplierId);
    if (!supplier) return { ok: false, message: 'Supplier not found.' };

    const eligibility = isSupplierEligibleForPurchasing(supplier);
    if (!eligibility.eligible) {
      pushToast({ title: 'Supplier Ineligible', description: eligibility.reason!, tone: 'warning' });
      return { ok: false, message: eligibility.reason! };
    }

    if (!isCalendarDate(input.expectedDate)) return { ok: false, message: 'Enter a valid expected date.' };
    const direct = input.purpose === 'Direct Customer Fulfillment';
    const warehouse = warehouses.find((item) => item.id === input.warehouseId);
    const order = direct ? currentOrders.current.find((item) => item.id === input.customerOrderId) : undefined;
    if (direct && (!order || !['Confirmed', 'Picking', 'Partially Fulfilled'].includes(order.status))) {
      return { ok: false, message: 'Select a confirmed customer order with open sourcing demand.' };
    }
    if (!direct && !warehouse) return { ok: false, message: 'Select the warehouse receiving the goods.' };
    const demand = order ? getOrderSourcingLines(order, currentProcurementOrders.current) : undefined;
    const planned = buildPurchaseLines(supplier, currentProducts.current, input.lines, demand);
    if (planned.ok === false) return planned;

    const records = currentProcurementOrders.current;
    const poNumber = `PO-${input.expectedDate.slice(0, 4)}-${517 + records.length}`;
    const prNumber = `PR-${input.expectedDate.slice(0, 4)}-${312 + records.length}`;
    const itemsSummary = planned.lines.map((line) => `${line.quantity.toLocaleString()} ${line.unit} ${line.productName}`).join(' · ');

    const newPo: ProcurementOrderRecord = {
      id: `PO-0${records.length + 1}`,
      poNumber,
      prNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      warehouseName: direct ? 'Direct to customer' : warehouse!.name,
      warehouseId: warehouse?.id,
      purpose: input.purpose,
      customerOrderId: order?.id,
      customerOrderNumber: order?.orderNumber,
      lines: planned.lines,
      paymentTerms: supplier.paymentTerms,
      stage: planned.totalKes >= 250000 ? 'Pending Approval' : 'PO Issued',
      expectedDate: input.expectedDate,
      totalKes: planned.totalKes,
      itemsSummary,
      requestedBy: currentUser?.fullName || 'Procurement Officer',
    };

    setProcurementOrders((prev) => [newPo, ...prev]);

    if (newPo.stage === 'Pending Approval' && currentUser) {
      setApprovals((prev) => [
        {
          id: `APR-0${prev.length + 1}`,
          reference: poNumber,
          category: 'Purchase Order',
          entityTitle: `${supplier.name} · ${itemsSummary}`,
          requesterName: currentUser.fullName,
          requesterRole: currentUser.roleName,
          valueKes: planned.totalKes,
          reason: order ? `Direct sourcing for ${order.orderNumber}` : `Replenishment for ${warehouse!.name}`,
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
      `${supplier.name} · KES ${planned.totalKes.toLocaleString()} (${newPo.stage})`
    );

    const msg = `${poNumber} created (${newPo.stage}).`;
    pushToast({ title: 'Purchase Requisition Created', description: msg, tone: 'success' });
    return { ok: true, message: msg };
  };

  const advanceProcurementStage: BosContextValue['advanceProcurementStage'] =
    async (poId) => {
      const target = currentProcurementOrders.current.find((p) => p.id === poId);
      if (!target) return { ok: false, message: 'Purchase Order not found.' };

      if (target.stage !== 'Purchase Request' && target.stage !== 'Pending Approval') {
        return { ok: false, message: 'Use goods collection or warehouse receiving to advance an issued purchase order.' };
      }

      const nextStage = target.stage === 'Purchase Request' ? 'Pending Approval' : 'PO Issued';
      const requiredPerm = nextStage === 'PO Issued' ? 'procurement.approve' : 'procurement.create';

      const auth = await verifyServerAction(
        requiredPerm,
        `Advance PO to ${nextStage}`
      );
      if (!auth.ok) return { ok: false, message: auth.error! };
      if (currentProcurementOrders.current.find((po) => po.id === poId)?.stage !== target.stage) {
        return { ok: false, message: 'The purchase order stage has changed. Review the current status.' };
      }
      const supplier = currentSuppliers.current.find((item) => item.id === target.supplierId);
      if (nextStage === 'PO Issued' && (!supplier || !isSupplierEligibleForPurchasing(supplier).eligible)) {
        return { ok: false, message: 'An active eligible supplier is required before issuing a purchase order.' };
      }

      setProcurementOrders((prev) =>
        prev.map((p) => p.id === poId ? { ...p, stage: nextStage } : p)
      );
      if (nextStage === 'PO Issued') {
        setApprovals((prev) => prev.map((item) => item.reference === target.poNumber && item.status === 'Pending'
          ? { ...item, status: 'Approved', decisionBy: currentUser?.fullName, decisionAt: new Date().toISOString() }
          : item));
      }

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

  const closePurchaseBalance: BosContextValue['closePurchaseBalance'] = async (poId, reason) => {
    const auth = await verifyServerAction('procurement.approve', 'Close Outstanding Purchase Balance');
    if (!auth.ok) return { ok: false, message: auth.error! };
    const target = currentProcurementOrders.current.find((po) => po.id === poId);
    if (!target?.lines?.length || !['PO Issued', 'Partially Received'].includes(target.stage)) {
      return { ok: false, message: 'This purchase order has no open quantities to close.' };
    }
    const closureReason = reason.trim();
    if (!closureReason) return { ok: false, message: 'Enter why the remaining quantities will not be received.' };

    const stage = target.receipts?.length ? 'Closed Short' : 'Cancelled';
    setProcurementOrders((previous) => previous.map((po) => po.id === poId ? { ...po, stage, closureReason } : po));
    appendAudit('Procurement', target.poNumber, 'Closed unreceived purchase balance', target.stage, `${stage} · ${closureReason}`);
    const message = `The remaining quantities on ${target.poNumber} are available for a new purchase.`;
    pushToast({ title: 'Purchase balance closed', description: message, tone: 'success' });
    return { ok: true, message };
  };

  const createDeliveryRun: BosContextValue['createDeliveryRun'] = async (input) => {
    const auth = await verifyServerAction('deliveries.assign', 'Plan Delivery Run');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const routeZone = input.routeZone.trim();
    if (!routeZone || !isDeliveryPlanDate(input.scheduledDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.departureTime)) {
      return { ok: false, message: 'Enter a route name, a current or future date, and a valid departure time.' };
    }
    const runs = currentDeliveries.current;
    const available = getUnassignedPackedOrders(currentOrders.current, runs);
    const orderIds = new Set(input.orderIds);
    const stops = available.filter((order) => orderIds.has(order.id));
    if (!stops.length || stops.length !== orderIds.size) {
      return { ok: false, message: 'Choose packed orders that are available for route assignment.' };
    }
    if (stops.some((order) => getOrderSourcingLines(order, currentProcurementOrders.current).some((line) => line.outstanding > 0))) {
      return { ok: false, message: 'Complete sourcing for every order in the run.' };
    }
    const vehicle = vehicles.find((entry) => entry.id === input.vehicleId);
    const driver = drivers.find((entry) => entry.id === input.driverId);
    if (!vehicle || !driver || ['Maintenance', 'Out of Service'].includes(vehicle.status) || ['Leave', 'Off Duty'].includes(driver.status)) {
      return { ok: false, message: 'Choose an available vehicle and driver.' };
    }
    const runPrefix = `RUN-${input.scheduledDate.replaceAll('-', '')}`;
    let sequence = 1;
    while (runs.some((run) => run.runNumber === `${runPrefix}-${sequence}`)) sequence++;
    const runNumber = `${runPrefix}-${sequence}`;
    const run: DeliveryRunRecord = {
      id: runNumber,
      runNumber,
      routeZone,
      scheduledDate: input.scheduledDate,
      departureTime: `${input.departureTime} EAT`,
      vehicleReg: vehicle.registration,
      vehicleId: vehicle.id,
      assignedVehicleId: vehicle.id,
      driverName: driver.fullName,
      driverPhone: driver.phone,
      assignedDriverId: driver.id,
      status: 'Planned',
      ordersIncluded: stops.map((order) => order.orderNumber),
      institutionsServed: stops.map((order) => order.customerName),
      totalWeightKg: stops.flatMap((order) => order.items).filter((item) => item.unit === 'kilograms')
        .reduce((sum, item) => sum + item.quantity, 0),
      podCaptured: false,
    };
    setDeliveries((previous) => [run, ...previous]);
    const plannedIds = new Set(stops.map((order) => order.id));
    setOrders((previous) => previous.map((order) => plannedIds.has(order.id)
      ? { ...order, nextStepLabel: `Delivery run ${runNumber} planned`, deliveryRunId: run.id }
      : order));
    appendAudit('Deliveries', runNumber, 'Planned delivery run', 'Unassigned', `${stops.length} stops · ${input.scheduledDate}`);
    return { ok: true, message: `${runNumber} planned for ${stops.length} customer ${stops.length === 1 ? 'stop' : 'stops'}.` };
  };

  const getReplacementDemand = (run: DeliveryRunRecord) => {
    const { records } = podLedgerRef.current;
    const source = records.find((pod) => pod.id === run.sourcePODId && pod.replacementRunId === run.id &&
      pod.status === 'Verified' && pod.reconciliationStatus === 'Pending Resolution');
    const order = source && currentOrders.current.find((entry) => entry.id === source.orderId && entry.orderNumber === source.orderNumber);
    if (!order || run.ordersIncluded.length !== 1 || ![order.id, order.orderNumber].includes(run.ordersIncluded[0]) ||
        order.status !== 'Partially Fulfilled' || getOrderReceipts(order, records).some(isPendingPOD)) return null;
    return { order, expected: getPODExpectedLines(order, records) };
  };

  const loadReplacementRun: BosContextValue['loadReplacementRun'] = async (runId, input) => {
    const auth = await verifyServerAction('fulfillment.manage', 'Pick Stock for Replacement Delivery');
    if (!auth.ok) return { ok: false, message: auth.error! };

    const run = currentDeliveries.current.find((entry) => entry.id === runId);
    if (!run?.sourcePODId || run.status !== 'Planned' || run.replacementLoad) {
      return { ok: false, message: 'Stock can only be picked once for a planned replacement run.' };
    }
    const demand = getReplacementDemand(run);
    if (!demand) return { ok: false, message: 'Review the source proof of delivery and the outstanding order quantities.' };
    const warehouse = warehouses.find((entry) => entry.id === input.warehouseId);
    if (!warehouse) return { ok: false, message: 'Select the warehouse supplying the replacement goods.' };

    const now = new Date();
    const neededThrough = replacementStockNeededThrough(run, getNairobiDate(now));
    const before = currentStockBatches.current;
    const plan = planReplacementLoad(demand.expected, warehouse.id, input.picks, before, currentProducts.current, neededThrough);
    if (plan.ok === false) return plan;

    const timestamp = now.toISOString();
    const actor = currentUser!.fullName;
    const movements = plan.picks.map((pick, index): StockMovementRecord => {
      const batch = before.find((entry) => entry.id === pick.batchId)!;
      return {
        id: `MOV-${run.id}-${index + 1}`,
        timestamp,
        type: 'Order Pick',
        productName: batch.productName,
        batchNumber: pick.batchNumber,
        quantityDelta: -pick.quantity,
        unit: pick.unit,
        fromLocation: `${warehouse.name} · ${batch.binCode}`,
        toLocation: run.runNumber,
        actorName: actor,
        reason: `Replacement delivery for ${demand.order.orderNumber} · ${run.sourcePODId}`,
      };
    });
    setProducts(() => plan.products);
    setStockBatches(() => plan.batches);
    setStockMovements((previous) => [...movements, ...previous]);
    setDeliveries((previous) => previous.map((entry) => entry.id === runId ? {
      ...entry,
      status: 'Loaded',
      replacementLoad: { warehouseId: warehouse.id, warehouseName: warehouse.name, loadedAt: timestamp, loadedBy: actor, picks: plan.picks },
    } : entry));
    setOrders((previous) => previous.map((order) => order.id === demand.order.id
      ? { ...order, nextStepLabel: `Replacement run ${run.runNumber} is loaded and ready for dispatch` }
      : order));
    appendAudit('Deliveries', run.runNumber, 'Loaded replacement from warehouse stock', 'Planned', `${warehouse.name} · ${plan.picks.length} batch picks`);
    return { ok: true, message: `Replacement stock picked from ${warehouse.name}. ${run.runNumber} is ready to dispatch.` };
  };

  const updateDeliveryStatus: BosContextValue['updateDeliveryStatus'] = async (runId, status) => {
    const auth = await verifyServerAction('deliveries.dispatch', `Update Delivery Run to ${status}`);
    if (!auth.ok) return { ok: false, message: auth.error! };

    const run = currentDeliveries.current.find((entry) => entry.id === runId);
    if (!run || !canAccessDeliveryRun(run, currentUser, drivers)) {
      return { ok: false, message: 'Assigned delivery run not found.' };
    }
    if (run.sourcePODId && (status !== 'Dispatched' || run.status !== 'Loaded' || !run.replacementLoad)) {
      return { ok: false, message: 'Confirm the warehouse stock picked for this replacement run before dispatch.' };
    }
    const canLoad = status === 'Loaded' && run.status === 'Planned';
    const canDispatch = status === 'Dispatched' && (run.status === 'Planned' || run.status === 'Loaded');
    if (!canLoad && !canDispatch) {
      return { ok: false, message: 'Advance a planned or loaded run here. Use proof of delivery to record arrivals.' };
    }

    if (run.sourcePODId) {
      const demand = getReplacementDemand(run);
      const load = run.replacementLoad!;
      const neededThrough = replacementStockNeededThrough(run);
      const containsUnusableStock = load.picks.some((pick) => {
        const batch = currentStockBatches.current.find((entry) => entry.id === pick.batchId);
        const product = currentProducts.current.find((entry) => entry.id === pick.productId);
        return !batch || !product || batch.warehouseId !== load.warehouseId || !isReplacementBatchUsable(batch, product, neededThrough);
      });
      if (!demand || !replacementPicksCoverDemand(demand.expected, load.picks) || containsUnusableStock) {
        return { ok: false, message: 'The recorded warehouse stock no longer matches eligible goods for this replacement run.' };
      }
    }

    const stops = getDeliveryRunStops(run, currentOrders.current, podLedgerRef.current.records);
    const blockedStop = stops.find(({ order }) => {
      if (!order) return true;
      if (run.sourcePODId) return false;
      return !['Packed', 'Dispatched'].includes(order.status) ||
        getOrderSourcingLines(order, currentProcurementOrders.current).some((line) => line.outstanding > 0);
    });
    if (!stops.length || blockedStop) {
      return { ok: false, message: blockedStop
        ? `Ready the quantities for order ${blockedStop.identifier} before starting this run.`
        : 'Add an order stop before starting this run.' };
    }

    setDeliveries((previous) => previous.map((entry) => entry.id === run.id ? { ...entry, status } : entry));
    if (canDispatch) {
      const orderIds = new Set(stops.map(({ order }) => order?.id));
      setOrders((previous) => previous.map((order) => orderIds.has(order.id) ? {
        ...order,
        status: 'Dispatched',
        podStatus: 'Not Submitted',
        deliveryRunId: run.id,
        nextStepLabel: 'Record actual quantities at the delivery stop',
      } : order));
    }
    appendAudit('Deliveries', run.runNumber, 'Updated route status', run.status, status);
    return { ok: true, message: `Delivery run ${run.runNumber} updated to ${status}.` };
  };

  const recordPayment: BosContextValue['recordPayment'] = async (input) => {
    const auth = await verifyServerAction('finance.record_payment', 'Record Customer Payment');
    if (!auth.ok) return { ok: false, message: auth.error! };
    if (input.direction !== 'Inbound (Customer AR)') {
      return { ok: false, message: 'Allocate supplier payments from the supplier account.' };
    }
    if (!can('finance.allocate_payment')) {
      return { ok: false, message: 'Your role cannot allocate invoice payments.' };
    }

    const referenceCode = input.referenceCode.trim();
    if (!referenceCode) return { ok: false, message: 'Enter the payment reference.' };
    if (currentPayments.current.some((payment) => payment.direction === input.direction && payment.method === input.method &&
      payment.referenceCode.trim().toUpperCase() === referenceCode.toUpperCase())) {
      return { ok: false, message: 'A payment with this channel and reference is already recorded.' };
    }

    const currentInvoices = podLedgerRef.current.invoices;
    const invoice = currentInvoices.find((entry) => entry.invoiceNumber === input.allocatedToDoc);
    if (!invoice) return { ok: false, message: 'Select an open customer invoice.' };
    const updatedInvoice = allocateInvoicePayment(invoice, input.amountKes);
    if (!updatedInvoice) return { ok: false, message: 'Enter a positive payment up to the remaining invoice balance.' };

    const amountKes = Math.round(input.amountKes * 100) / 100;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    const newPayment: PaymentRecord = {
      id: `PAY-0${currentPayments.current.length + 1}`,
      referenceCode,
      direction: input.direction,
      counterpartyName: invoice.customerName,
      method: input.method,
      date,
      amountKes,
      allocatedToDoc: invoice.invoiceNumber,
      reconciled: false,
      recordedBy: currentUser!.fullName,
    };

    const nextInvoices = currentInvoices.map((entry) => entry.id === invoice.id ? updatedInvoice : entry);
    updatePodLedger((ledger) => ({ ...ledger, invoices: nextInvoices }));
    setPayments((previous) => [newPayment, ...previous]);
    setCustomers((previous) => previous.map((customer) => customer.id === invoice.customerId ? {
      ...customer,
      outstandingBalanceKes: Math.max(0, Math.round((customer.outstandingBalanceKes - amountKes) * 100) / 100),
      overdueBalanceKes: invoice.dueDate < date
        ? Math.max(0, Math.round((customer.overdueBalanceKes - amountKes) * 100) / 100)
        : customer.overdueBalanceKes,
    } : customer));

    const balance = nextInvoices.reduce((total, entry) => entry.orderNumber === invoice.orderNumber ? total + entry.balanceKes : total, 0);
    const unbilled = podLedgerRef.current.records.some((pod) => pod.orderNumber === invoice.orderNumber && pod.status === 'Verified' &&
      calculateInvoiceEligibility(pod, getExistingPODInvoice(pod, nextInvoices)?.invoiceNumber).eligible);
    setOrders((previous) => previous.map((order) => order.orderNumber === invoice.orderNumber ? {
      ...order,
      paymentStatus: balance === 0 && !unbilled && ['Delivered', 'Closed'].includes(order.status) ? 'Paid' : 'Partially Paid',
      invoiceStatus: balance === 0 && !unbilled && ['Delivered', 'Closed'].includes(order.status) ? 'Paid' : order.invoiceStatus,
    } : order));

    appendAudit('Finance', referenceCode, 'Recorded customer invoice payment', invoice.invoiceNumber,
      `KES ${amountKes.toLocaleString()} allocated`);
    return { ok: true, message: `KES ${amountKes.toLocaleString()} allocated to ${invoice.invoiceNumber}.` };
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
    const pendingPo = currentProcurementOrders.current.find((po) => po.poNumber === target.reference);
    if (pendingPo && pendingPo.stage !== 'Pending Approval') {
      return { ok: false, message: 'The purchase order has already been reviewed.' };
    }
    if (pendingPo && decision === 'Approved') {
      const supplier = currentSuppliers.current.find((item) => item.id === pendingPo.supplierId);
      if (!supplier || !isSupplierEligibleForPurchasing(supplier).eligible) {
        return { ok: false, message: 'An active eligible supplier is required before approving a purchase order.' };
      }
    }

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

    if (pendingPo) {
      setProcurementOrders((prev) =>
        prev.map((po) =>
          po.id === pendingPo.id
            ? { ...po, stage: decision === 'Approved' ? 'PO Issued' : 'Cancelled' }
            : po
        )
      );
    }
    if (decision === 'Approved') {
      setOrders((prev) =>
        prev.map((o) =>
          o.orderNumber === target.reference && o.status === 'On Hold'
            ? {
                ...o,
                status: 'Confirmed',
                nextStepLabel: getOrderSourcingLines(o, currentProcurementOrders.current).some((line) => line.outstanding > 0)
                  ? 'Source outstanding customer quantities' : 'Release to Warehouse Picking Queue',
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
    const name = input.name.trim();
    if (!name) return { ok: false, message: 'Enter a supplier name.' };
    if (!Number.isSafeInteger(input.leadTimeDays) || input.leadTimeDays < 0) {
      return { ok: false, message: 'Enter a whole, nonnegative lead time.' };
    }
    const nextNum = supplierSequence.current + 1;
    const supplierId = `SUP-${String(nextNum).padStart(2, '0')}`;
    const code = `VND-${name.slice(0, 3).toUpperCase()}-${String(nextNum).padStart(3, '0')}`;
    const result = reconcileSupplierOfferings(input.suppliedProducts ?? [], {
      supplierId,
      catalog: currentProducts.current,
      leadTimeDays: input.leadTimeDays,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUser?.fullName,
      reason: 'Initial supplier quote',
    });
    if (result.ok === false) return result;
    const suppliedProducts = result.offerings;
    supplierSequence.current = nextNum;

    const newSupplier: SupplierRecord = {
      id: supplierId,
      code,
      name,
      category: input.category,
      region: input.region,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
      paymentDetails: input.paymentDetails,
      payableBalanceKes: 0,
      qualityScorePct: 95.0,
      recentPriceTrend: 'Stable',
      status: 'Under Review',
      suppliedProducts,
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
      `${newSupplier.name} (${newSupplier.region}) · Linked Products: ${suppliedProducts.length}`
    );
    pushToast({
      title: 'Supplier Registered',
      description: `${newSupplier.name} registered with ${suppliedProducts.length} supplied product(s).`,
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
    const target = currentSuppliers.current.find((supplier) => supplier.id === id);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const { suppliedProducts, ...details } = updates;
    const name = details.name?.trim() ?? target.name;
    const leadTimeDays = details.leadTimeDays ?? target.leadTimeDays;
    if (!name) return { ok: false, message: 'Enter a supplier name.' };
    if (!Number.isSafeInteger(leadTimeDays) || leadTimeDays < 0) {
      return { ok: false, message: 'Enter a whole, nonnegative lead time.' };
    }
    const result = suppliedProducts && reconcileSupplierOfferings(suppliedProducts, {
      supplierId: target.id,
      catalog: currentProducts.current,
      existing: target.suppliedProducts,
      retired: target.retiredSuppliedProducts,
      leadTimeDays,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUser?.fullName,
      reason: 'Supplier offering updated',
    });
    if (result?.ok === false) return result;
    const changes: Partial<SupplierRecord> = {
      ...details,
      name,
      leadTimeDays,
      ...(result && { suppliedProducts: result.offerings, retiredSuppliedProducts: result.retired }),
    };
    for (const offering of result?.offerings ?? []) {
      const prior = target.suppliedProducts.find((item) => item.productId === offering.productId);
      if (!prior || (prior.unit === offering.unit && prior.currentCostKes === offering.currentCostKes)) continue;
      const changePercent = Math.round((offering.currentCostKes / prior.currentCostKes - 1) * 100);
      if (prior.unit !== offering.unit || !Number.isFinite(changePercent)) changes.recentPriceTrend = 'Price Review Needed';
      else if (changePercent > 0) changes.recentPriceTrend = `Increased +${changePercent}%`;
      else if (changePercent < 0) changes.recentPriceTrend = `Decreased ${changePercent}%`;
      else changes.recentPriceTrend = 'Stable';
      break;
    }
    const updated = { ...target, ...changes };
    setSuppliers((prev) => prev.map((supplier) => supplier.id === id ? { ...supplier, ...changes } : supplier));
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

  const updateSupplierPriceList: BosContextValue['updateSupplierPriceList'] = async (supplierId, productId, currentCostKes, quoteReason) => {
    const target = currentSuppliers.current.find((supplier) => supplier.id === supplierId);
    const offering = target?.suppliedProducts.find((item) => item.productId === productId);
    if (!offering) return { ok: false, message: 'Product not found in supplier price list.' };

    return updateSupplier(supplierId, {
      suppliedProducts: target.suppliedProducts.map((item) => item.productId === productId ? { ...item, currentCostKes, quoteReason } : item),
    });
  };

  const addSupplierPriceItem: BosContextValue['addSupplierPriceItem'] = async (supplierId, item) => {
    const target = currentSuppliers.current.find((supplier) => supplier.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };
    return updateSupplier(supplierId, { suppliedProducts: [...target.suppliedProducts, item] });
  };

  const removeSupplierPriceItem: BosContextValue['removeSupplierPriceItem'] = async (supplierId, productId) => {
    const target = currentSuppliers.current.find((supplier) => supplier.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };
    return updateSupplier(supplierId, {
      suppliedProducts: target.suppliedProducts.filter((item) => item.productId !== productId),
    });
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

  // SKU Auto-Sequence Generator strictly formatted AD-{CAT}-{SEQ}
  const getNextSku: BosContextValue['getNextSku'] = (category: string) => {
    const categoryMap: Record<string, string> = {
      Vegetables: 'VEG',
      Fruits: 'FRU',
      'Cereals & Pulses': 'CER',
      'Tubers & Roots': 'TUB',
      'Dairy & Eggs': 'DAI',
      'Herbs & Spices': 'HRB',
    };
    const prefix = categoryMap[category] || category.slice(0, 3).toUpperCase();
    const regex = new RegExp(`^AD-${prefix}-(\\d+)$`);
    
    let maxSeq = 0;
    products.forEach((p) => {
      const match = p.sku.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });
    deletedSkus.forEach((sku) => {
      const match = sku.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });
    
    const nextSeq = maxSeq + 1;
    return `AD-${prefix}-${String(nextSeq).padStart(3, '0')}`;
  };

  const archiveProduct: BosContextValue['archiveProduct'] = async (productId) => {
    if (!can('products.edit')) {
      const msg = 'Access Denied: Your role lacks permission (products.edit) to archive products.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = currentProducts.current.find((p) => p.id === productId);
    if (!target) return { ok: false, message: 'Product not found.' };

    const now = new Date().toISOString();
    const updated: ProductRecord = {
      ...target,
      status: 'Archived',
      archivedAt: now,
    };
    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    appendAudit(
      'Products',
      `${target.sku} (${target.name})`,
      'Archived Product SKU',
      target.status,
      'Archived'
    );
    pushToast({
      title: 'Product Archived',
      description: `${target.name} (${target.sku}) has been archived. It will no longer appear for active order placement.`,
      tone: 'info',
    });
    return { ok: true, message: `Product ${target.sku} archived successfully.` };
  };

  const restoreProduct: BosContextValue['restoreProduct'] = async (productId) => {
    if (!can('products.edit')) {
      const msg = 'Access Denied: Your role lacks permission (products.edit) to restore products.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = currentProducts.current.find((p) => p.id === productId);
    if (!target) return { ok: false, message: 'Product not found.' };

    const updated: ProductRecord = {
      ...target,
      status: 'Active',
      archivedAt: undefined,
    };
    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    appendAudit(
      'Products',
      `${target.sku} (${target.name})`,
      'Restored Product SKU',
      'Archived',
      'Active'
    );
    pushToast({
      title: 'Product Restored',
      description: `${target.name} (${target.sku}) is restored to Active status.`,
      tone: 'success',
    });
    return { ok: true, message: `Product ${target.sku} restored successfully.` };
  };

  const deleteProduct: BosContextValue['deleteProduct'] = async (productId) => {
    if (!can('products.edit')) {
      const msg = 'Access Denied: Your role lacks permission (products.edit) to delete products.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = currentProducts.current.find((p) => p.id === productId);
    if (!target) return { ok: false, message: 'Product not found.' };

    // Strict dependency check
    const hasOrderRefs = currentOrders.current.some((o) =>
      o.items?.some((i) => i.productId === productId || i.sku === target.sku)
    );
    const hasStockRefs = currentStockBatches.current.some((b) => b.productId === productId || b.sku === target.sku);
    const hasProcurementRefs = currentProcurementOrders.current.some((p) =>
      p.lines?.some((l) => l.productId === productId || l.sku === target.sku)
    );

    const hasSupplierRefs = suppliers.some((supplier) => [...supplier.suppliedProducts, ...(supplier.retiredSuppliedProducts ?? [])].some((offering) => offering.productId === productId));
    if (hasOrderRefs || hasStockRefs || hasProcurementRefs || hasSupplierRefs) {
      const reason = [
        hasOrderRefs ? 'historical customer orders' : '',
        hasStockRefs ? 'warehouse stock batches' : '',
        hasProcurementRefs ? 'procurement purchase orders' : '',
        hasSupplierRefs ? 'supplier offerings' : '',
      ]
        .filter(Boolean)
        .join(', ');
      const msg = `Cannot permanently delete product: SKU ${target.sku} is referenced in ${reason}. Please Archive the product instead to maintain audit integrity.`;
      pushToast({ title: 'Deletion Prohibited', description: msg, tone: 'error' });
      return { ok: false, message: msg };
    }

    setDeletedSkus((prev) => [...prev, target.sku]);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    appendAudit(
      'Products',
      `${target.sku} (${target.name})`,
      'Permanently Deleted Product SKU',
      target.status,
      'Deleted'
    );
    pushToast({
      title: 'Product Deleted',
      description: `${target.name} (${target.sku}) was permanently removed from the catalog.`,
      tone: 'info',
    });
    return { ok: true, message: 'Product deleted successfully.' };
  };

  const archiveSupplier: BosContextValue['archiveSupplier'] = async (supplierId) => {
    if (!can('suppliers.edit') && !can('suppliers.suspend')) {
      const msg = 'Access Denied: Your role lacks permission to archive suppliers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const updated: SupplierRecord = {
      ...target,
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Archived Supplier',
      target.status,
      `${target.status} (Archived)`
    );
    pushToast({
      title: 'Supplier Archived',
      description: `${target.name} has been archived.`,
      tone: 'info',
    });
    return { ok: true, message: `${target.name} archived.` };
  };

  const restoreSupplier: BosContextValue['restoreSupplier'] = async (supplierId) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission to restore suppliers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    // Preserving governance status: Restoring an archived supplier must not automatically approve
    // or reactivate a supplier who was previously suspended or under review.
    const updated: SupplierRecord = {
      ...target,
      isArchived: false,
      archivedAt: undefined,
    };
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
    appendAudit(
      'Suppliers',
      target.code,
      'Restored Supplier from Archive',
      'Archived',
      target.status
    );
    pushToast({
      title: 'Supplier Restored',
      description: `${target.name} restored from archive (Status: ${target.status}).`,
      tone: 'success',
    });
    return { ok: true, message: `${target.name} restored.` };
  };

  const deleteSupplier: BosContextValue['deleteSupplier'] = async (supplierId) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission to delete suppliers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const hasProcurement = procurementOrders.some((p) => p.supplierId === supplierId);
    const hasPayables = supplierPayables.some((p) => p.supplierId === supplierId);

    if (hasProcurement || hasPayables) {
      const msg = `Cannot permanently delete supplier: ${target.name} has associated purchase orders or payables ledger records. Please Archive or Suspend instead.`;
      pushToast({ title: 'Deletion Prohibited', description: msg, tone: 'error' });
      return { ok: false, message: msg };
    }

    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
    appendAudit(
      'Suppliers',
      target.code,
      'Permanently Deleted Supplier',
      target.status,
      'Deleted'
    );
    pushToast({
      title: 'Supplier Deleted',
      description: `${target.name} was removed from the directory.`,
      tone: 'info',
    });
    return { ok: true, message: 'Supplier deleted successfully.' };
  };

  const addSupplierProduct: BosContextValue['addSupplierProduct'] = async (supplierId, item) => {
    if (!can('suppliers.edit')) {
      const msg = 'Access Denied: Your role lacks permission (suppliers.edit) to configure sourcing products.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = currentSuppliers.current.find((supplier) => supplier.id === supplierId);
    if (!target) return { ok: false, message: 'Supplier not found.' };

    const previous = target.suppliedProducts.find((offering) => offering.productId === item.productId);
    return updateSupplier(supplierId, {
      suppliedProducts: previous
        ? target.suppliedProducts.map((offering) => offering.productId === item.productId
          ? { ...offering, ...item, minOrderQty: item.moq ?? offering.minOrderQty }
          : offering)
        : [...target.suppliedProducts, item],
    });
  };

  const getSuppliersForProduct: BosContextValue['getSuppliersForProduct'] = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || !canSourceCatalogProduct(product)) return [];
    return suppliers.filter(
      (s) =>
        isSupplierEligibleForPurchasing(s).eligible &&
        s.suppliedProducts.some((offering) => offering.productId === productId && offering.unit === product.unit && offering.availability !== 'Unavailable')
    );
  };

  const confirmPurchaseAndCollection: BosContextValue['confirmPurchaseAndCollection'] = async (input) => {
    const initial = currentProcurementOrders.current.find((po) => po.id === input.poId);
    if (!initial) return { ok: false, message: 'Purchase order not found.' };

    const bulk = initial.purpose === 'Bulk Stock Procurement' && Boolean(initial.lines?.length);
    const permission: PermissionKey = bulk ? 'inventory.receive' :
      can('procurement.create') ? 'procurement.create' :
      can('procurement.approve') ? 'procurement.approve' : 'inventory.receive';
    const auth = await verifyServerAction(permission, bulk ? 'Receive Purchase into Stock' : 'Record Purchase Collection');
    if (!auth.ok) return { ok: false, message: auth.error! };
    if (input.settlement) {
      const settlementAuth = await verifyServerAction('finance.record_payment', 'Record Supplier Settlement at Receipt');
      if (!settlementAuth.ok) return { ok: false, message: settlementAuth.error! };
    }

    const target = currentProcurementOrders.current.find((po) => po.id === input.poId)!;
    const receiptId = input.receiptId.trim();
    if (!receiptId) return { ok: false, message: 'The receipt is missing its record ID.' };
    const receiptKey = `${target.id}-${receiptId}`;
    const existingReceipt = target.receipts?.find((entry) => entry.id === receiptId);
    if (existingReceipt) {
      return { ok: true, message: 'This receipt has already been recorded.', payableId: existingReceipt.payableId };
    }
    const structured = Boolean(target.lines?.length);
    const legacyPayable = !structured ? currentSupplierPayables.current.find(
      (payable) => payable.purchaseOrderId === target.id || payable.poId === target.id || payable.poNumber === target.poNumber
    ) : undefined;
    if (!structured && (target.goodsCollected || target.supplierPayableCreated || legacyPayable)) {
      return { ok: false, message: 'This legacy purchase already has a collection or supplier payable.' };
    }
    if (!['PO Issued', 'Receiving (GRN)', 'Quality Check', 'Partially Received'].includes(target.stage)) {
      return { ok: false, message: 'Only an issued purchase order with a receiving balance can be collected.' };
    }

    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const supplier = currentSuppliers.current.find((item) => item.id === target.supplierId);
    const terms = target.paymentTerms ?? supplier?.paymentTerms ?? '';
    const dueDate = getSupplierDueDate(today, terms) ?? input.dueDate?.trim();
    if (!dueDate || !isCalendarDate(dueDate)) {
      return { ok: false, message: 'Enter the agreed due date for these payment terms.' };
    }
    const planned = structured ? planPurchaseReceipt(target, input.lines) : undefined;
    if (planned?.ok === false) return planned;
    const totalKes = planned?.totalKes ?? Math.round((input.legacyCostKes ?? 0) * 100) / 100;
    if (!Number.isFinite(totalKes) || totalKes <= 0) {
      return { ok: false, message: 'Enter a positive actual purchase cost.' };
    }

    const paid = input.settlement ? Math.round(input.settlement.amountKes * 100) / 100 : 0;
    const paymentRef = input.settlement?.reference.trim();
    if (input.settlement && (!paymentRef || !Number.isFinite(paid) || paid <= 0 || paid > totalKes ||
        !['Cash', 'M-Pesa Business'].includes(input.settlement.method))) {
      return { ok: false, message: 'Enter a payment reference and an amount within the received goods total.' };
    }

    const warehouse = bulk ? warehouses.find((item) =>
      target.warehouseId ? item.id === target.warehouseId : item.name === target.warehouseName
    ) : undefined;
    if (bulk && !warehouse) return { ok: false, message: 'The receiving warehouse could not be found.' };
    const actor = currentUser?.fullName ?? 'Procurement Operations';
    const batches: StockBatchRecord[] = [];
    for (const entry of warehouse ? planned?.lines ?? [] : []) {
      const line = target.lines!.find((line, index) => purchaseLineId(line, index) === entry.lineId)!;
      const product = currentProducts.current.find((item) => item.id === line.productId && item.unit === line.unit);
      if (!product) return { ok: false, message: `The catalogue record for ${line.productName} could not be matched.` };
      const expiryDate = entry.expiryDate?.trim() ?? '';
      if ((product.expiryTracked || expiryDate) && (!isCalendarDate(expiryDate) || expiryDate < today)) {
        return { ok: false, message: `Enter a current or future expiry date for ${line.productName}.` };
      }
      const daysToExpiry = expiryDate
        ? (Date.parse(expiryDate) - Date.parse(today)) / 86400000
        : Number.MAX_SAFE_INTEGER;
      batches.push({
        id: `${receiptKey}-${entry.lineId}`,
        batchNumber: `${target.poNumber}-R${(target.receipts?.length ?? 0) + 1}-${batches.length + 1}`,
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        unit: line.unit,
        warehouseId: warehouse!.id,
        warehouseName: warehouse!.name,
        binCode: 'Receiving',
        supplierName: target.supplierName,
        receivedDate: today,
        expiryDate,
        daysToExpiry,
        availableQty: entry.quantity,
        reservedQty: 0,
        unitCostKes: entry.unitCostKes,
        fefoPriority: daysToExpiry <= 7 ? 1 : 3,
        status: daysToExpiry <= 7 ? 'Expiring Soon' : 'Nominal',
      });
    }

    const payableId = `AP-${receiptKey}`;
    const receipt: PurchaseReceiptRecord = {
      id: receiptId,
      receivedAt: today,
      receivedBy: actor,
      receiptRef: input.receiptRef?.trim() || undefined,
      supplierInvoiceRef: input.supplierInvoiceRef?.trim() || undefined,
      lines: planned?.lines ?? [],
      totalKes,
      payableId,
    };
    const balanceKes = Math.round((totalKes - paid) * 100) / 100;
    const newPayable: SupplierPayableRecord = {
      id: payableId,
      supplierId: target.supplierId,
      supplierName: target.supplierName,
      purchaseOrderId: target.id,
      purchaseReceiptId: receipt.id,
      poNumber: target.poNumber,
      customerOrderNumber: target.customerOrderNumber,
      invoiceRef: receipt.supplierInvoiceRef,
      amountKes: totalKes,
      paidAmountKes: paid,
      balanceKes,
      dueDate,
      status: balanceKes === 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid',
      issueDate: today,
      goodsCollectedDate: today,
      lineItemsSummary: batches.length
        ? batches.map((batch) => `${batch.availableQty} ${batch.unit} ${batch.productName}`).join(' · ')
        : structured ? receipt.lines.map((line) => {
            const item = target.lines!.find((candidate, index) => purchaseLineId(candidate, index) === line.lineId)!;
            return `${line.quantity} ${item.unit} ${item.productName}`;
          }).join(' · ') : target.itemsSummary,
      createdAt: today,
    };

    const complete = planned?.complete ?? true;
    const updatedPo: ProcurementOrderRecord = {
      ...target,
      stage: complete ? (bulk ? 'Stock Posted' : 'Goods Collected') : 'Partially Received',
      goodsCollected: complete,
      receipts: [...(target.receipts ?? []), receipt],
      collectionDate: today,
      actualPurchaseCostKes: Math.round(((target.actualPurchaseCostKes ?? 0) + totalKes) * 100) / 100,
      supplierPayableCreated: true,
      supplierPayableId: target.supplierPayableId ?? payableId,
    };

    setProcurementOrders((prev) => prev.map((po) => po.id === target.id ? updatedPo : po));
    setSupplierPayables((prev) => [newPayable, ...prev]);
    setSuppliers((prev) => prev.map((item) => item.id === target.supplierId ? {
      ...item,
      payableBalanceKes: Math.round(((item.payableBalanceKes ?? 0) + balanceKes) * 100) / 100,
    } : item));

    if (input.settlement && paymentRef) {
      const payment: SupplierPaymentRecord = {
        id: `SPAY-${receiptKey}`,
        payableId,
        supplierPayableId: payableId,
        supplierId: target.supplierId,
        supplierName: target.supplierName,
        amountKes: paid,
        paymentMethod: input.settlement.method,
        referenceNumber: paymentRef,
        paymentDate: today,
        recordedBy: actor,
      };
      setSupplierPayments((prev) => [payment, ...prev]);
    }
    if (batches.length) {
      setStockBatches((prev) => [...batches, ...prev]);
      setStockMovements((prev) => [...batches.map((batch): StockMovementRecord => ({
        id: `MOV-${batch.id}`,
        timestamp: now.toISOString(),
        type: 'Receipt (GRN)',
        productName: batch.productName,
        batchNumber: batch.batchNumber,
        quantityDelta: batch.availableQty,
        unit: batch.unit,
        fromLocation: target.supplierName,
        toLocation: batch.warehouseName,
        actorName: actor,
        reason: receipt.receiptRef || target.poNumber,
      })), ...prev]);
      const receivedByProduct = new Map<string, number>();
      for (const batch of batches) {
        receivedByProduct.set(batch.productId, (receivedByProduct.get(batch.productId) ?? 0) + batch.availableQty);
      }
      setProducts((prev) => prev.map((product) => {
        const add = receivedByProduct.get(product.id);
        return add ? { ...product, availableQty: product.availableQty + add } : product;
      }));
    }

    if (target.customerOrderId) {
      setOrders((prev) => prev.map((order) => {
        if (order.id !== target.customerOrderId || !['Confirmed', 'Picking', 'Partially Fulfilled'].includes(order.status)) return order;
        const pending = getOrderSourcingLines(order, currentProcurementOrders.current).some((line) => line.outstanding > 0);
        return { ...order, nextStepLabel: pending ? 'Source outstanding customer quantities' : 'Finish picking and pack for dispatch' };
      }));
    }

    const action = bulk ? 'Warehouse receipt' : 'Goods collection';
    appendAudit(
      'Procurement',
      target.poNumber,
      `${action} recorded`,
      `PO stage ${target.stage}`,
      `${updatedPo.stage} · KES ${totalKes.toLocaleString()} · KES ${balanceKes.toLocaleString()} outstanding`
    );
    const message = `${action} recorded for ${target.poNumber}. Supplier balance on this receipt is KES ${balanceKes.toLocaleString()}.`;
    pushToast({ title: `${action} recorded`, description: message, tone: 'success' });
    return { ok: true, message, payableId };
  };

  const recordSupplierPayment: BosContextValue['recordSupplierPayment'] = async (input) => {
    if (!can('finance.record_payment')) {
      const msg = 'Access Denied: Your role lacks permission (finance.record_payment) to disburse vendor payments.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const payable = currentSupplierPayables.current.find((record) => record.id === input.payableId);
    if (!payable) return { ok: false, message: 'Supplier payable not found.' };

    const amountKes = Math.round(input.amountKes * 100) / 100;
    const referenceNumber = input.referenceNumber.trim();
    const validation = validateSupplierPayment(payable, amountKes, {
      number: referenceNumber,
      method: input.paymentMethod,
      existing: currentSupplierPayments.current,
    });
    if (!validation.valid) return { ok: false, message: validation.message ?? 'Invalid supplier payment.' };

    const paymentDate = getNairobiDate();
    const paidAmountKes = Math.round((payable.paidAmountKes + amountKes) * 100) / 100;
    const balanceKes = Math.round((payable.balanceKes - amountKes) * 100) / 100;
    const status = balanceKes === 0 ? 'Paid' : 'Partially Paid';

    const newPayment: SupplierPaymentRecord = {
      id: `SPAY-${payable.id}-${currentSupplierPayments.current.length + 1}`,
      payableId: payable.id,
      supplierId: payable.supplierId,
      supplierName: payable.supplierName,
      amountKes,
      paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber,
      notes: input.notes,
      recordedBy: currentUser?.fullName || 'Finance Operations',
    };

    setSupplierPayments((prev) => [newPayment, ...prev]);

    setSupplierPayables((prev) =>
      prev.map((p) =>
        p.id === input.payableId
          ? { ...p, paidAmountKes, balanceKes, status }
          : p
      )
    );

    const payableBalanceKes = calculateSupplierBalances(currentSupplierPayables.current, payable.supplierId).outstandingBalanceKes;
    setSuppliers((prev) => prev.map((supplier) => supplier.id === payable.supplierId ? { ...supplier, payableBalanceKes } : supplier));

    appendAudit(
      'Finance',
      payable.poNumber,
      'Disbursed Supplier Payment',
      `Outstanding: KES ${payable.balanceKes.toLocaleString()}`,
      `Paid KES ${amountKes.toLocaleString()} via ${input.paymentMethod} (${referenceNumber})`
    );

    pushToast({
      title: 'Supplier Payment Recorded',
      description: `Disbursed KES ${amountKes.toLocaleString()} to ${payable.supplierName} (${input.paymentMethod} Ref: ${referenceNumber}).`,
      tone: 'success',
    });

    return { ok: true, message: 'Supplier payment recorded successfully.' };
  };

  const createVehicle: BosContextValue['createVehicle'] = async (input) => {
    if (!can('fleet.manage')) {
      const msg = 'Access Denied: Your role lacks permission (fleet.manage) to register vehicles.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const newVehicle: VehicleRecord = {
      ...input,
      id: `VEH-${String(vehicles.length + 1).padStart(3, '0')}`,
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    appendAudit(
      'Fleet',
      newVehicle.registration,
      'Registered Fleet Vehicle',
      'None',
      `${newVehicle.makeModel} (${newVehicle.type}) · Capacity: ${newVehicle.capacityKg} kg`
    );
    pushToast({
      title: 'Vehicle Registered',
      description: `${newVehicle.registration} (${newVehicle.makeModel}) added to active fleet.`,
      tone: 'success',
    });
    return { ok: true, message: 'Vehicle registered.' };
  };

  const updateVehicle: BosContextValue['updateVehicle'] = async (id, updates) => {
    if (!can('fleet.manage')) {
      const msg = 'Access Denied: Your role lacks permission (fleet.manage) to update vehicles.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = vehicles.find((v) => v.id === id);
    if (!target) return { ok: false, message: 'Vehicle not found.' };

    const updated = { ...target, ...updates };
    setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
    appendAudit(
      'Fleet',
      target.registration,
      'Updated Vehicle Record',
      target.status,
      updated.status
    );
    pushToast({
      title: 'Vehicle Updated',
      description: `${target.registration} updated successfully.`,
      tone: 'success',
    });
    return { ok: true, message: 'Vehicle updated.' };
  };

  const createDriver: BosContextValue['createDriver'] = async (input) => {
    if (!can('fleet.manage')) {
      const msg = 'Access Denied: Your role lacks permission (fleet.manage) to onboard drivers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const newDriver: DriverRecord = {
      ...input,
      id: `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
      deliveriesCompleted: 0,
      rating: 5.0,
    };
    setDrivers((prev) => [newDriver, ...prev]);
    appendAudit(
      'Fleet',
      newDriver.fullName,
      'Onboarded Delivery Driver',
      'None',
      `DL: ${newDriver.licenseNumber} · Phone: ${newDriver.phone}`
    );
    pushToast({
      title: 'Driver Onboarded',
      description: `${newDriver.fullName} added to driver roster.`,
      tone: 'success',
    });
    return { ok: true, message: 'Driver onboarded.' };
  };

  const updateDriver: BosContextValue['updateDriver'] = async (id, updates) => {
    if (!can('fleet.manage')) {
      const msg = 'Access Denied: Your role lacks permission (fleet.manage) to update drivers.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const target = drivers.find((d) => d.id === id);
    if (!target) return { ok: false, message: 'Driver not found.' };

    const updated = { ...target, ...updates };
    setDrivers((prev) => prev.map((d) => (d.id === id ? updated : d)));
    appendAudit(
      'Fleet',
      target.fullName,
      'Updated Driver Record',
      target.status,
      updated.status
    );
    pushToast({
      title: 'Driver Updated',
      description: `${target.fullName} updated successfully.`,
      tone: 'success',
    });
    return { ok: true, message: 'Driver updated.' };
  };

  const reassignDeliveryRun: BosContextValue['reassignDeliveryRun'] = async (
    runId,
    vehicleIdOrDetails,
    driverIdArg
  ) => {
    if (!can('fleet.manage') && !can('deliveries.assign')) {
      const msg = 'Access Denied: Your role lacks permission to reassign delivery fleet.';
      pushToast({ title: 'Authorization Required', description: msg, tone: 'warning' });
      return { ok: false, message: msg };
    }
    const run = deliveries.find((d) => d.id === runId);
    if (!run) return { ok: false, message: 'Delivery run not found.' };

    let targetVehicleId = '';
    let targetDriverId = '';
    let newTransportCost: number | undefined;

    if (typeof vehicleIdOrDetails === 'object' && vehicleIdOrDetails !== null) {
      targetVehicleId =
        vehicleIdOrDetails.vehicleId ||
        vehicles.find((v) => v.registration === vehicleIdOrDetails.vehicleReg)?.id ||
        '';
      targetDriverId =
        vehicleIdOrDetails.driverId ||
        drivers.find((d) => d.fullName === vehicleIdOrDetails.driverName)?.id ||
        '';
      newTransportCost = vehicleIdOrDetails.transportCostKes;
    } else {
      targetVehicleId = typeof vehicleIdOrDetails === 'string' ? vehicleIdOrDetails : '';
      targetDriverId = driverIdArg || '';
    }

    const veh = vehicles.find((v) => v.id === targetVehicleId || v.registration === targetVehicleId);
    if (!veh) return { ok: false, message: 'Selected vehicle not found.' };
    if (veh.status === 'Maintenance' || veh.status === 'Out of Service') {
      return { ok: false, message: `Vehicle ${veh.registration} is in ${veh.status} and cannot be assigned.` };
    }

    const drv = drivers.find((d) => d.id === targetDriverId || d.fullName === targetDriverId);
    if (!drv) return { ok: false, message: 'Selected driver not found.' };
    if (drv.status === 'Leave' || drv.status === 'Off Duty') {
      return { ok: false, message: `Driver ${drv.fullName} is ${drv.status} and cannot be assigned.` };
    }

    const updatedRun: DeliveryRunRecord = {
      ...run,
      vehicleId: veh.id,
      assignedVehicleId: veh.id,
      vehiclePlate: veh.registration,
      vehicleReg: veh.registration,
      driverName: drv.fullName,
      assignedDriverId: drv.id,
      driverPhone: drv.phone || run.driverPhone,
      transportCostKes: newTransportCost !== undefined && !isNaN(newTransportCost) ? newTransportCost : run.transportCostKes,
    };

    setDeliveries((prev) => prev.map((r) => (r.id === runId ? updatedRun : r)));

    appendAudit(
      'Deliveries',
      run.runNumber,
      'Reassigned Fleet & Driver to Delivery Route',
      `${run.vehiclePlate || run.vehicleReg} / ${run.driverName}`,
      `${veh.registration} / ${drv.fullName}`
    );

    pushToast({
      title: 'Delivery Run Reassigned',
      description: `Run ${run.runNumber} assigned to ${veh.registration} (${drv.fullName}).`,
      tone: 'success',
    });

    return { ok: true, message: `Delivery run reassigned to ${veh.registration} and ${drv.fullName}.` };
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
        vehicles,
        drivers,
        supplierPayables,
        supplierPayments,
        deletedSkus,
        enabledWidgets,
        toggleDashboardWidget,
        moveDashboardWidget,
        resetDashboardWidgets,
        createOrder,
        advanceOrderStatus,
        recordDeliveryArrival,
        verifyPOD,
        rejectPOD,
        reconcilePODDiscrepancy,
        generateDraftInvoice,
        createProduct,
        updateProduct,
        updateProductPrice,
        recordStockMovement,
        createPurchaseOrder,
        advanceProcurementStage,
        closePurchaseBalance,
        updateDeliveryStatus,
        createDeliveryRun,
        loadReplacementRun,
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
        getNextSku,
        archiveProduct,
        restoreProduct,
        deleteProduct,
        archiveSupplier,
        restoreSupplier,
        deleteSupplier,
        addSupplierProduct,
        getSuppliersForProduct,
        confirmPurchaseAndCollection,
        recordSupplierPayment,
        createVehicle,
        updateVehicle,
        createDriver,
        updateDriver,
        reassignDeliveryRun,
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

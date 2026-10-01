import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Work email is required')
    .email('Enter a valid Agro-Deliveries work email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const InviteMemberSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z
    .string()
    .email('Valid work email required')
    .refine(
      (val) => val.endsWith('@agrodeliveries.co.ke') || val.includes('@'),
      'Must be a valid work email address'
    ),
  roleId: z.string().min(1, 'Assigned role is required'),
  department: z.string().min(2, 'Department is required'),
  branch: z.string().min(2, 'Branch is required'),
  phone: z.string().min(9, 'Phone number is required'),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer / Institution is required'),
  channel: z.enum([
    'Institutional Contract',
    'Recurring Weekly',
    'Tender Supply',
    'Walk-In / Manual',
  ]),
  deliveryDate: z.string().min(1, 'Requested delivery date is required'),
  warehouseName: z.string().min(1, 'Dispatch warehouse is required'),
  productId: z.string().min(1, 'Primary product is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  overridePriceKes: z.number().optional(),
  notes: z.string().optional(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(3, 'SKU code is required'),
  category: z.enum([
    'Fresh Vegetables',
    'Fruits & Orchard',
    'Dry Grains & Cereals',
    'Root & Tubers',
    'Dairy & Cold Chain',
    'Herbs & Greens',
  ]),
  unit: z.enum(['kilograms', 'pieces', 'bunches', 'dozens', 'packs', 'bags']),
  retailKes: z.number().positive(),
  wholesaleKes: z.number().positive(),
  institutionalKes: z.number().positive(),
  supplierCostKes: z.number().positive(),
  reorderPoint: z.number().nonnegative(),
  batchTracked: z.boolean(),
  expiryTracked: z.boolean(),
});

export const StockAdjustmentSchema = z.object({
  batchId: z.string().min(1, 'Stock batch is required'),
  type: z.enum(['Adjustment', 'Wastage', 'Transfer']),
  quantityDelta: z.number().refine((n) => n !== 0, 'Quantity change cannot be zero'),
  reason: z.string().min(4, 'Operational reason is required for audit log'),
  targetWarehouse: z.string().optional(),
});

export const RecordPaymentSchema = z.object({
  direction: z.enum(['Inbound (Customer AR)', 'Outbound (Supplier AP)']),
  counterpartyName: z.string().min(2, 'Counterparty is required'),
  method: z.enum(['M-Pesa Paybill', 'Bank EFT / RTGS', 'Corporate Cheque']),
  referenceCode: z.string().min(4, 'Transaction reference code is required'),
  amountKes: z.number().positive('Amount must be positive'),
  allocatedToDoc: z.string().min(2, 'Target invoice or PO is required'),
});

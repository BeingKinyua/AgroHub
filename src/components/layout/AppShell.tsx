'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Handshake,
  Landmark,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
  User,
  UserCheck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { PermissionKey } from '@/types/domain/bos';
import { ROUTE_REQUIRED_PERMISSION } from '@/lib/permissions/rbac';
import {
  Avatar,
  DROPDOWN_MOTION,
  PermissionGateBanner,
  StatusBadge,
  Tooltip,
} from '@/components/ui/primitives';
import { AnimatedPage } from '@/components/motion/AnimatedPage';

interface NavItem {
  label: string;
  href: string;
  permission: PermissionKey;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const STORAGE_KEY_SIDEBAR = 'agro_bos_sidebar_collapsed_v1';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    isInitialized,
    logout,
    switchTestPersona,
    users,
    can,
    theme,
    setTheme,
    demoModeEnabled,
    setDemoModeEnabled,
    toasts,
    dismissToast,
    orders,
    products,
    customers,
    suppliers,
    invoices,
    deliveries,
    procurementOrders,
    approvals,
    documents,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useBos();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread'>('all');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [demoSwitcherOpen, setDemoSwitcherOpen] = useState(false);

  const navScrollRef = useRef<HTMLElement | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);

  // Restore persisted sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      if (saved === 'true') setSidebarCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Redirect unauthenticated visitors to /login
  useEffect(() => {
    if (isInitialized && !currentUser) {
      router.replace('/login');
    }
  }, [isInitialized, currentUser, router]);

  // Smoothly ensure active navigation item is visible inside sidebar viewport on route change
  useEffect(() => {
    const container = navScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector(
      '[data-nav-active="true"]'
    ) as HTMLElement | null;
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    const isAbove = activeRect.top < containerRect.top + 16;
    const isBelow = activeRect.bottom > containerRect.bottom - 16;

    if (isAbove || isBelow) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname]);

  // Close header dropdowns on outside click or Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setQuickActionsOpen(false);
        setProfileMenuOpen(false);
        setDemoSwitcherOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (
        headerActionsRef.current &&
        !headerActionsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
        setQuickActionsOpen(false);
        setProfileMenuOpen(false);
        setDemoSwitcherOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const pendingApprovalsCount = approvals.filter(
    (a) => a.status === 'Pending'
  ).length;

  const unverifiedDocsCount = documents.filter((d) => !d.verified).length;

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        group: 'OVERVIEW',
        items: [
          {
            label: 'Dashboard',
            href: '/dashboard',
            permission: 'dashboard.view',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        group: 'OPERATIONS',
        items: [
          {
            label: 'Orders',
            href: '/orders',
            permission: 'orders.view',
            icon: ShoppingBag,
            badgeCount: orders.filter(
              (o) => o.status !== 'Delivered' && o.status !== 'Closed'
            ).length,
          },
          {
            label: 'Fulfillment',
            href: '/fulfillment',
            permission: 'fulfillment.view',
            icon: Boxes,
          },
          {
            label: 'Deliveries',
            href: '/deliveries',
            permission: 'deliveries.view',
            icon: Truck,
          },
        ],
      },
      {
        group: 'CATALOG & STOCK',
        items: [
          {
            label: 'Products',
            href: '/products',
            permission: 'products.view',
            icon: Package,
          },
          {
            label: 'Inventory',
            href: '/inventory',
            permission: 'inventory.view',
            icon: Warehouse,
          },
        ],
      },
      {
        group: 'PROCUREMENT',
        items: [
          {
            label: 'Procurement',
            href: '/procurement',
            permission: 'procurement.view',
            icon: FolderKanban,
          },
          {
            label: 'Suppliers',
            href: '/suppliers',
            permission: 'suppliers.view',
            icon: Handshake,
          },
        ],
      },
      {
        group: 'CUSTOMERS & CRM',
        items: [
          {
            label: 'Customers',
            href: '/customers',
            permission: 'customers.view',
            icon: Users,
          },
          {
            label: 'Institutions',
            href: '/institutions',
            permission: 'customers.view',
            icon: Building2,
          },
          {
            label: 'CRM',
            href: '/crm',
            permission: 'crm.view',
            icon: Activity,
          },
        ],
      },
      {
        group: 'FINANCE',
        items: [
          {
            label: 'Invoices',
            href: '/invoices',
            permission: 'finance.view',
            icon: Receipt,
          },
          {
            label: 'Payments',
            href: '/payments',
            permission: 'finance.view',
            icon: CreditCard,
          },
          {
            label: 'Finance',
            href: '/finance',
            permission: 'finance.view',
            icon: Landmark,
          },
        ],
      },
      {
        group: 'INSIGHTS',
        items: [
          {
            label: 'Reports',
            href: '/reports',
            permission: 'reports.view',
            icon: BarChart3,
          },
        ],
      },
      {
        group: 'CONTROL & VAULT',
        items: [
          {
            label: 'Approvals',
            href: '/approvals',
            permission: 'approvals.view',
            icon: CheckSquare,
            badgeCount: pendingApprovalsCount,
          },
          {
            label: 'Documents',
            href: '/documents',
            permission: 'documents.view',
            icon: FileText,
            badgeCount: unverifiedDocsCount,
          },
        ],
      },
      {
        group: 'ADMINISTRATION',
        items: [
          {
            label: 'Users',
            href: '/administration/users',
            permission: 'administration.users.view',
            icon: UserCheck,
          },
          {
            label: 'Roles',
            href: '/administration/roles',
            permission: 'administration.roles.view',
            icon: Shield,
          },
          {
            label: 'Audit Logs',
            href: '/administration/audit-logs',
            permission: 'audit.view',
            icon: FileSpreadsheet,
          },
          {
            label: 'My Profile',
            href: '/profile',
            permission: 'dashboard.view',
            icon: User,
          },
          {
            label: 'Settings',
            href: '/settings',
            permission: 'dashboard.view',
            icon: Settings,
          },
        ],
      },
    ],
    [orders, pendingApprovalsCount, unverifiedDocsCount]
  );

  // Filter nav groups by RBAC permissions
  const permittedNavGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => can(item.permission)),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, can]);

  // Filter notifications by RBAC permissions
  const permittedNotifications = useMemo(() => {
    return notifications.filter((n) => can(n.permissionRequired));
  }, [notifications, can]);

  const unreadCount = permittedNotifications.filter((n) => !n.read).length;

  const displayedNotifications = useMemo(() => {
    if (notificationTab === 'unread') {
      return permittedNotifications.filter((n) => !n.read);
    }
    return permittedNotifications;
  }, [permittedNotifications, notificationTab]);

  // RBAC-aware Global Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: {
      category: string;
      title: string;
      subtitle: string;
      href: string;
    }[] = [];

    if (can('products.view')) {
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
        .forEach((p) =>
          results.push({
            category: 'Product',
            title: `${p.name} (${p.sku})`,
            subtitle: `${p.availableQty} ${p.unit} available · Inst. KES ${p.pricing.institutionalKes}`,
            href: '/products',
          })
        );
    }

    if (can('orders.view')) {
      orders
        .filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q)
        )
        .forEach((o) =>
          results.push({
            category: 'Order',
            title: `${o.orderNumber} · ${o.customerName}`,
            subtitle: `${o.status} · KES ${o.totalKes.toLocaleString()}`,
            href: '/orders',
          })
        );
    }

    if (can('customers.view')) {
      customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.procurementContact.toLowerCase().includes(q)
        )
        .forEach((c) =>
          results.push({
            category: c.isInstitutional ? 'Institution' : 'Customer',
            title: c.name,
            subtitle: `${c.segment} · ${c.paymentTerms} · Balance KES ${c.outstandingBalanceKes.toLocaleString()}`,
            href: c.isInstitutional ? '/institutions' : '/customers',
          })
        );
    }

    if (can('suppliers.view')) {
      suppliers
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.region.toLowerCase().includes(q)
        )
        .forEach((s) =>
          results.push({
            category: 'Supplier',
            title: s.name,
            subtitle: `${s.category} · ${s.region}`,
            href: '/suppliers',
          })
        );
    }

    if (can('finance.view')) {
      invoices
        .filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q)
        )
        .forEach((i) =>
          results.push({
            category: 'Invoice',
            title: `${i.invoiceNumber} · ${i.customerName}`,
            subtitle: `${i.status} · Balance KES ${i.balanceKes.toLocaleString()}`,
            href: '/invoices',
          })
        );
    }

    if (can('deliveries.view')) {
      deliveries
        .filter(
          (d) =>
            d.runNumber.toLowerCase().includes(q) ||
            d.routeZone.toLowerCase().includes(q) ||
            d.driverName.toLowerCase().includes(q)
        )
        .forEach((d) =>
          results.push({
            category: 'Delivery Run',
            title: `${d.runNumber} · ${d.routeZone}`,
            subtitle: `${d.status} · Driver: ${d.driverName}`,
            href: '/deliveries',
          })
        );
    }

    if (can('procurement.view')) {
      procurementOrders
        .filter(
          (po) =>
            po.poNumber.toLowerCase().includes(q) ||
            po.supplierName.toLowerCase().includes(q)
        )
        .forEach((po) =>
          results.push({
            category: 'Purchase Order',
            title: `${po.poNumber} · ${po.supplierName}`,
            subtitle: `${po.stage} · KES ${po.totalKes.toLocaleString()}`,
            href: '/procurement',
          })
        );
    }

    if (can('documents.view')) {
      documents
        .filter(
          (doc) =>
            doc.docNumber.toLowerCase().includes(q) ||
            doc.title.toLowerCase().includes(q) ||
            doc.linkedEntity.toLowerCase().includes(q)
        )
        .forEach((doc) =>
          results.push({
            category: 'Document',
            title: `${doc.docNumber} · ${doc.title}`,
            subtitle: `${doc.category} · Linked: ${doc.linkedEntity}`,
            href: '/documents',
          })
        );
    }

    return results.slice(0, 10);
  }, [
    searchQuery,
    can,
    products,
    orders,
    customers,
    suppliers,
    invoices,
    deliveries,
    procurementOrders,
    documents,
  ]);

  // Context-aware Quick Actions filtered by RBAC
  const quickActions = useMemo(() => {
    const actions: {
      label: string;
      href: string;
      permission: PermissionKey;
      description: string;
    }[] = [
      {
        label: 'New Institutional Order',
        href: '/orders?action=new',
        permission: 'orders.create',
        description: 'Create contract or walk-in order',
      },
      {
        label: 'New Customer / Institution',
        href: '/customers?action=new',
        permission: 'customers.create',
        description: 'Onboard school, hospital, or hotel',
      },
      {
        label: 'New Catalog Product',
        href: '/products?action=new',
        permission: 'products.create',
        description: 'Register SKU & multi-tier pricing',
      },
      {
        label: 'Raise Purchase Order',
        href: '/procurement?action=new',
        permission: 'procurement.create',
        description: 'Source produce or grains from supplier',
      },
      {
        label: 'Record Stock / Wastage',
        href: '/inventory?action=adjust',
        permission: 'inventory.adjust',
        description: 'FEFO batch adjustment or spoilage log',
      },
      {
        label: 'Record M-Pesa / Bank Payment',
        href: '/payments?action=new',
        permission: 'finance.record_payment',
        description: 'Log AR receipt or supplier AP payout',
      },
      {
        label: 'Upload Operational Document',
        href: '/documents?action=upload',
        permission: 'documents.manage',
        description: 'File GRN, POD, KEBS certificate, or invoice',
      },
      {
        label: 'Invite Internal Member',
        href: '/administration/users?action=invite',
        permission: 'administration.users.create',
        description: 'Administrator-controlled onboarding',
      },
    ];
    return actions.filter((a) => can(a.permission));
  }, [can]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <div className="w-6 h-6 rounded-md bg-[#1F6A37] animate-pulse" />
          <span>Initializing Agro-Deliveries Business Operating System...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Enforce Account State Security (Suspended or Disabled cannot enter BOS)
  if (currentUser.status === 'Suspended' || currentUser.status === 'Disabled') {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-[22px] bg-[var(--bg-card)] border border-red-500/30 p-8 text-center shadow-[var(--shadow-lg)]">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <StatusBadge status={currentUser.status} />
          <h1 className="font-heading text-2xl font-semibold mt-3">
            Workspace Access Restricted
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
            Operator account <strong>{currentUser.fullName}</strong> (
            {currentUser.email}) is currently marked as{' '}
            <strong>{currentUser.status}</strong>. Suspended or disabled
            accounts are prohibited from accessing Agro-Deliveries operational
            data.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => switchTestPersona('USR-001')}
              className="px-4 py-2.5 rounded-xl bg-[#1F6A37] text-white text-xs font-medium hover:bg-[#12512C] cursor-pointer"
            >
              Switch to Active Executive Account
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-medium hover:bg-[#E5EFE6] dark:hover:bg-[#122719] cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check route-level permission
  const requiredRoutePerm = ROUTE_REQUIRED_PERMISSION[pathname];
  const isRouteAuthorized = requiredRoutePerm
    ? can(requiredRoutePerm)
    : true;

  const currentPageLabel =
    navGroups
      .flatMap((g) => g.items)
      .find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
      ?.label ||
    (pathname === '/profile'
      ? 'My Profile'
      : pathname.includes('audit-logs')
      ? 'Audit Logs'
      : 'Workspace');

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] flex">
      {/* DESKTOP INDEPENDENT SCROLLING SIDEBAR */}
      <aside
        aria-label="Workspace Sidebar"
        style={{
          width: sidebarCollapsed
            ? 'var(--sidebar-mini-width)'
            : 'var(--sidebar-width)',
        }}
        className="hidden lg:flex flex-col shrink-0 h-dvh sticky top-0 z-[var(--z-sidebar)] bg-[#08190C] text-[#F4F6F3] border-r border-white/10 transition-[width] duration-200 ease-out select-none"
      >
        {/* Fixed Top Brand Header */}
        <div
          className={`h-16 shrink-0 flex items-center border-b border-white/10 ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {!sidebarCollapsed ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 overflow-hidden min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1F6A37] text-[#4EB462] flex items-center justify-center shrink-0 border border-[#4EB462]/25">
                <Leaf className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="font-heading text-xs font-semibold tracking-wider text-white">
                  AGRO-DELIVERIES KE.
                </div>
                <div className="text-[10px] text-[#A9BEAE] truncate">
                  BUSINESS OPERATING SYSTEM
                </div>
              </div>
            </Link>
          ) : (
            <Tooltip label="Agro-Deliveries BOS — Expand Sidebar" side="right">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label="Expand sidebar"
                className="w-10 h-10 rounded-xl bg-[#142B1B] text-[#4EB462] border border-[#4EB462]/25 flex items-center justify-center hover:bg-[#1F6A37]/40 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-lg text-[#A9BEAE] hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Independent Scrolling Navigation Surface */}
        <nav
          ref={navScrollRef}
          className={`flex-1 overflow-y-auto sidebar-scroll py-4 ${
            sidebarCollapsed ? 'px-3 space-y-4' : 'px-3.5 space-y-5'
          }`}
          aria-label="Primary Operating System Navigation"
        >
          {permittedNavGroups.map((group) => (
            <div key={group.group}>
              {!sidebarCollapsed ? (
                <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-[#A9BEAE]/65 uppercase">
                  {group.group}
                </div>
              ) : (
                <div
                  className="h-px bg-white/8 mx-2 my-2"
                  aria-hidden="true"
                />
              )}

              <div className={sidebarCollapsed ? 'space-y-1.5' : 'space-y-1'}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + '/');

                  const linkNode = (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-nav-active={active ? 'true' : undefined}
                      aria-label={sidebarCollapsed ? item.label : undefined}
                      className={`relative flex items-center rounded-xl text-xs font-medium transition-all duration-150 ${
                        sidebarCollapsed
                          ? 'w-full h-11 justify-center px-0'
                          : 'justify-between gap-2.5 px-3 py-2.5'
                      } ${
                        active
                          ? 'bg-[#142B1B] text-[#4EB462] border border-[#4EB462]/30 shadow-xs'
                          : 'text-[#A9BEAE] hover:text-white hover:bg-white/6 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex items-center min-w-0 ${
                          sidebarCollapsed ? 'justify-center' : 'gap-2.5'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            active ? 'text-[#4EB462]' : 'text-[#A9BEAE]'
                          }`}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {!sidebarCollapsed &&
                        item.badgeCount !== undefined &&
                        item.badgeCount > 0 && (
                          <span className="font-mono-tabular text-[11px] px-1.5 py-0.5 rounded-md bg-[#1F6A37]/45 text-[#E5EFE6] border border-[#4EB462]/20">
                            {item.badgeCount}
                          </span>
                        )}

                      {sidebarCollapsed &&
                        item.badgeCount !== undefined &&
                        item.badgeCount > 0 && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4EB462]"
                          />
                        )}
                    </Link>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <div key={item.href} className="flex justify-center">
                        <Tooltip
                          label={
                            item.badgeCount
                              ? `${item.label} (${item.badgeCount})`
                              : item.label
                          }
                          side="right"
                        >
                          <div className="w-11">{linkNode}</div>
                        </Tooltip>
                      </div>
                    );
                  }

                  return linkNode;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sticky Bottom Operator Profile & Sign-Out Surface */}
        <div className="p-3 shrink-0 border-t border-white/10 bg-[#08190C]">
          {!sidebarCollapsed ? (
            <div className="p-2.5 rounded-xl bg-[#0C1B11] border border-white/10 flex items-center justify-between gap-2.5">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 min-w-0 flex-1 group"
              >
                <Avatar
                  fullName={currentUser.fullName}
                  avatarUrl={currentUser.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-[#4EB462] transition-colors">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-[#4EB462] truncate">
                    {currentUser.roleName}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                title="Sign out of workspace"
                aria-label="Sign out of workspace"
                className="p-1.5 rounded-lg text-[#A9BEAE] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip
                label={`${currentUser.fullName} (${currentUser.roleName})`}
                side="right"
              >
                <Link href="/profile" className="block">
                  <Avatar
                    fullName={currentUser.fullName}
                    avatarUrl={currentUser.avatarUrl}
                    size="sm"
                  />
                </Link>
              </Tooltip>
              <Tooltip label="Sign out" side="right">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  aria-label="Sign out"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-[#A9BEAE] hover:text-red-400 hover:bg-white/5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-[var(--z-drawer)] lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#08190C]/75 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-[288px] max-w-[86vw] bg-[#08190C] text-[#F4F6F3] h-dvh flex flex-col z-10 border-r border-white/10"
            >
              <div className="h-16 px-4 shrink-0 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1F6A37] text-[#4EB462] flex items-center justify-center">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-heading text-xs font-semibold text-white">
                      AGRO-DELIVERIES KE.
                    </div>
                    <div className="text-[10px] text-[#A9BEAE]">
                      {currentUser.roleName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 rounded-lg text-[#A9BEAE] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto sidebar-scroll p-3.5 space-y-5">
                {permittedNavGroups.map((group) => (
                  <div key={group.group}>
                    <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-[#A9BEAE]/65">
                      {group.group}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active =
                          pathname === item.href ||
                          pathname.startsWith(item.href + '/');
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileDrawerOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                              active
                                ? 'bg-[#142B1B] text-[#4EB462] border border-[#4EB462]/25'
                                : 'text-[#A9BEAE] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                            {item.badgeCount !== undefined &&
                              item.badgeCount > 0 && (
                                <span className="font-mono-tabular text-[11px] px-1.5 py-0.5 rounded bg-[#1F6A37]/40 text-white">
                                  {item.badgeCount}
                                </span>
                              )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-4 shrink-0 border-t border-white/10 space-y-2.5">
                <Link
                  href="/profile"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0C1B11] border border-white/10"
                >
                  <Avatar
                    fullName={currentUser.fullName}
                    avatarUrl={currentUser.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[11px] text-[#4EB462] truncate">
                      @{currentUser.nickname} · View Profile
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-500/15 text-red-300 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN INDEPENDENT SCROLL WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* STICKY TOP UTILITY HEADER */}
        <header className="sticky top-0 z-[var(--z-header)] h-16 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left: Mobile Menu + Current Page Context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            // BreadCrumb Component
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <Link
                href="/dashboard"
                className="hidden sm:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                AgroHub BOS
              </Link>
              <span
                className="hidden sm:inline text-[var(--text-secondary)]/60"
                aria-hidden="true"
              >
                /
              </span>
              <span className="font-heading font-semibold text-[var(--text-primary)] truncate">
                {currentPageLabel}
              </span>
            </div>
          </div>

          {/* Center: Command Global Search Trigger */}
          <div className="flex-1 max-w-md mx-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full h-10 px-3.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2 hover:border-[#4EB462]/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0 text-[#1F6A37] dark:text-[#4EB462]" />
                <span className="truncate">
                  Search orders, FEFO batches, institutions, SKUs...
                </span>
              </span>
              <kbd className="hidden sm:inline-block font-mono-tabular text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Quick Actions + Demo Role Switcher + Theme + Notifications + Account Profile */}
          <div
            ref={headerActionsRef}
            className="flex items-center gap-2 shrink-0"
          >
            {/* Context-Aware Quick Actions */}
            {quickActions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen((v) => !v);
                    setNotificationsOpen(false);
                    setProfileMenuOpen(false);
                    setDemoSwitcherOpen(false);
                  }}
                  aria-expanded={quickActionsOpen}
                  className="h-10 px-3.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Quick Action</span>
                </button>

                <AnimatePresence>
                  {quickActionsOpen && (
                    <motion.div
                      {...DROPDOWN_MOTION}
                      className="absolute right-0 mt-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-2 z-[var(--z-dropdown)]"
                    >
                      <div className="px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] border-b border-[var(--border-subtle)] mb-1">
                        Authorized Actions ({currentUser.roleName})
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-0.5">
                        {quickActions.map((act) => (
                          <Link
                            key={act.label}
                            href={act.href}
                            onClick={() => setQuickActionsOpen(false)}
                            className="block px-3 py-2 rounded-xl hover:bg-[#E5EFE6] dark:hover:bg-[#122719] transition-colors"
                          >
                            <div className="text-xs font-medium text-[var(--text-primary)]">
                              {act.label}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {act.description}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Separated Demo Role Switcher Pill (Visible when Prototype Demo Mode is enabled) */}
            {demoModeEnabled && (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    setDemoSwitcherOpen((v) => !v);
                    setQuickActionsOpen(false);
                    setNotificationsOpen(false);
                    setProfileMenuOpen(false);
                  }}
                  aria-expanded={demoSwitcherOpen}
                  title="Switch RBAC Evaluation Role"
                  className="h-10 px-3 rounded-xl bg-[#E5EFE6] dark:bg-[#142B1B] border border-[#4EB462]/35 text-[#12512C] dark:text-[#4EB462] text-xs font-medium inline-flex items-center gap-1.5 hover:border-[#4EB462] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[130px] truncate">
                    Role: {currentUser.roleName}
                  </span>
                </button>

                <AnimatePresence>
                  {demoSwitcherOpen && (
                    <motion.div
                      {...DROPDOWN_MOTION}
                      className="absolute right-0 mt-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-3 z-[var(--z-dropdown)]"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            RBAC Role Simulator
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            Instant prototype persona switch
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]">
                          9 Roles
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {users
                          .filter((u) => u.status === 'Active')
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                switchTestPersona(u.id);
                                setDemoSwitcherOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                u.id === currentUser.id
                                  ? 'bg-[#E5EFE6] text-[#12512C] dark:bg-[#142B1B] dark:text-[#4EB462] font-semibold'
                                  : 'hover:bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate">{u.roleName}</div>
                                <div className="text-[10px] opacity-75 truncate">
                                  {u.fullName} (@{u.nickname})
                                </div>
                              </div>
                              {u.id === currentUser.id && (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-2" />
                              )}
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Theme Mode Selector (Light / Dark / System) */}
            <div
              role="group"
              aria-label="Theme Mode"
              className="hidden sm:flex items-center p-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)]"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Light mode"
                aria-label="Light mode"
                className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[var(--bg-card)] text-[#1F6A37] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" color='yellow'/>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Dark mode"
                aria-label="Dark mode"
                className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-card)] text-[#4EB462] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" color='gray' />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                title="System theme"
                aria-label="System theme"
                className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-[var(--bg-card)] text-[#1F6A37] dark:text-[#4EB462] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" color='#1F6A37' />
              </button>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setQuickActionsOpen(false);
                  setProfileMenuOpen(false);
                  setDemoSwitcherOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative h-10 w-10 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:border-[#4EB462]/60 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" color='#1F6A37'/>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#CC310E] text-white font-mono-tabular text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    {...DROPDOWN_MOTION}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-3.5 z-[var(--z-dropdown)]"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Operational Notifications
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Filtered by your RBAC permissions
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-medium text-[#1F6A37] dark:text-[#4EB462] inline-flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => setNotificationTab('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          notificationTab === 'all'
                            ? 'bg-[#1F6A37] text-white'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                      >
                        All ({permittedNotifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationTab('unread')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          notificationTab === 'unread'
                            ? 'bg-[#1F6A37] text-white'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {displayedNotifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                          No {notificationTab === 'unread' ? 'unread ' : ''}
                          notifications for your role.
                        </div>
                      ) : (
                        displayedNotifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.href}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotificationsOpen(false);
                            }}
                            className={`block p-3 rounded-xl border transition-colors ${
                              n.read
                                ? 'bg-[var(--bg-canvas)]/50 border-transparent opacity-75'
                                : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] hover:border-[#4EB462]/45'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <StatusBadge status={n.severity} />
                              <span className="text-[11px] text-[var(--text-secondary)]">
                                {n.timestamp}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-[var(--text-primary)] mt-1">
                              {n.title}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                              {n.description}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Account & Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setNotificationsOpen(false);
                  setQuickActionsOpen(false);
                  setDemoSwitcherOpen(false);
                }}
                aria-expanded={profileMenuOpen}
                aria-label="Account and Profile Menu"
                className="h-10 pl-1.5 pr-2.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center gap-2 text-left hover:border-[#4EB462]/60 transition-colors cursor-pointer"
              >
                <Avatar
                  fullName={currentUser.fullName}
                  avatarUrl={currentUser.avatarUrl}
                  size="sm"
                />
                // <div className="hidden xl:block max-w-[140px]">
                //   <div className="text-xs font-medium text-[var(--text-primary)] truncate leading-none">
                //     {currentUser.nickname || currentUser.fullName.split(' ')[0]}
                //   </div>
                //   <div className="text-[10px] text-[#1F6A37] dark:text-[#4EB462] truncate mt-0.5">
                //     {currentUser.roleName}
                //   </div>
                // </div>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    {...DROPDOWN_MOTION}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-3.5 z-[var(--z-dropdown)]"
                  >
                    {/* Identity Header */}
                    <div className="flex flex-col items-center gap-3 pb-3 mb-2.5 border-b border-[var(--border-subtle)]">
                      <Avatar
                        fullName={currentUser.fullName}
                        avatarUrl={currentUser.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] truncate">
                          @{currentUser.nickname} · {currentUser.email}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <StatusBadge status={currentUser.roleName} />
                        </div>
                      </div>
                    </div>

                    {/* Primary Account Navigation */}
                    <div className="space-y-1 pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[#E5EFE6] dark:hover:bg-[#122719] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                        <div>
                          <div>My Profile & Account</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                            Identity, nickname, role & permissions
                          </div>
                        </div>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[#E5EFE6] dark:hover:bg-[#122719] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                        <div>
                          <div>Workspace Settings</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                            Theme, hubs & operational preferences
                          </div>
                        </div>
                      </Link>
                      {can('audit.view') && (
                        <Link
                          href="/administration/audit-logs"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[#E5EFE6] dark:hover:bg-[#122719] transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                          <div>
                            <div>Security & Audit Trail</div>
                            <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                              Immutable system governance log
                            </div>
                          </div>
                        </Link>
                      )}
                    </div>

                    {/* Clearly Separated Prototype / Demo Role Switcher */}
                    <div className="pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                          Prototype Role Switcher
                        </span>
                        <button
                          type="button"
                          onClick={() => setDemoModeEnabled(!demoModeEnabled)}
                          className="text-[11px] font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline cursor-pointer"
                        >
                          {demoModeEnabled ? 'Hide Header Pill' : 'Show Header Pill'}
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {users
                          .filter((u) => u.status === 'Active')
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                switchTestPersona(u.id);
                                setProfileMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                                u.id === currentUser.id
                                  ? 'bg-[#E5EFE6] text-[#12512C] dark:bg-[#142B1B] dark:text-[#4EB462] font-semibold'
                                  : 'hover:bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                              }`}
                            >
                              <span className="truncate">{u.roleName}</span>
                              <span className="text-[10px] opacity-75 shrink-0 ml-2">
                                @{u.nickname}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.push('/login');
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Sign out of AgroHub BOS</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT CANVAS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {isRouteAuthorized ? (
            <AnimatedPage key={pathname}>{children}</AnimatedPage>
          ) : (
            <PermissionGateBanner
              requiredPermission={requiredRoutePerm}
              moduleName={currentPageLabel}
            />
          )}
        </main>
      </div>

      {/* CONTEXTUAL MOBILE BOTTOM NAVIGATION (<= 15% viewport height) */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[var(--z-header)] h-14 bg-[#08190C] text-[#A9BEAE] border-t border-white/10 grid grid-cols-5 items-center px-2"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center py-1 text-[10px] ${
            pathname === '/dashboard' ? 'text-[#4EB462] font-medium' : ''
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>
        {can('orders.view') ? (
          <Link
            href="/orders"
            className={`flex flex-col items-center justify-center py-1 text-[10px] ${
              pathname === '/orders' ? 'text-[#4EB462] font-medium' : ''
            }`}
          >
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            <span>Orders</span>
          </Link>
        ) : (
          <Link
            href="/deliveries"
            className={`flex flex-col items-center justify-center py-1 text-[10px] ${
              pathname === '/deliveries' ? 'text-[#4EB462] font-medium' : ''
            }`}
          >
            <Truck className="w-4 h-4 mb-0.5" />
            <span>Runs</span>
          </Link>
        )}
        {can('inventory.view') ? (
          <Link
            href="/inventory"
            className={`flex flex-col items-center justify-center py-1 text-[10px] ${
              pathname === '/inventory' ? 'text-[#4EB462] font-medium' : ''
            }`}
          >
            <Warehouse className="w-4 h-4 mb-0.5" />
            <span>Inventory</span>
          </Link>
        ) : (
          <Link
            href="/documents"
            className={`flex flex-col items-center justify-center py-1 text-[10px] ${
              pathname === '/documents' ? 'text-[#4EB462] font-medium' : ''
            }`}
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span>Docs</span>
          </Link>
        )}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center py-1 text-[10px] ${
            pathname === '/profile' ? 'text-[#4EB462] font-medium' : ''
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>Profile</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-[10px]"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Modules</span>
        </button>
      </nav>

      {/* COMMAND-STYLE GLOBAL SEARCH MODAL */}
      <AnimatePresence>
        {searchOpen && (
          <div
            className="fixed inset-0 z-[var(--z-modal)] bg-[#08190C]/70 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24"
            role="dialog"
            aria-modal="true"
            aria-label="Global Command Search"
          >
            <motion.div
              {...DROPDOWN_MOTION}
              className="w-full max-w-2xl rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                <Search className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Products, Orders, Institutions, Suppliers, Invoices, Documents..."
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs px-2 py-1 rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] cursor-pointer"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-3">
                {searchQuery.trim() === '' ? (
                  <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                    Type to search across all modules permitted for{' '}
                    <strong>{currentUser.roleName}</strong> (e.g.,{' '}
                    <button
                      type="button"
                      onClick={() => setSearchQuery('Tomatoes')}
                      className="underline text-[#1F6A37] dark:text-[#4EB462] cursor-pointer"
                    >
                      Tomatoes
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => setSearchQuery('Alliance')}
                      className="underline text-[#1F6A37] dark:text-[#4EB462] cursor-pointer"
                    >
                      Alliance
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => setSearchQuery('ORD-2026')}
                      className="underline text-[#1F6A37] dark:text-[#4EB462] cursor-pointer"
                    >
                      ORD-2026
                    </button>
                    ).
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                    No RBAC-authorized records matched &ldquo;{searchQuery}
                    &rdquo;.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map((item, idx) => (
                      <Link
                        key={idx}
                        href={item.href}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-[#E5EFE6] dark:hover:bg-[#122719] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[#1F6A37] dark:text-[#4EB462] shrink-0">
                          {item.category}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL TOAST FEEDBACK STACK */}
      <div
        aria-live="polite"
        className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-[var(--z-toast)] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto rounded-2xl bg-[#08190C] text-[#F4F6F3] border border-[#4EB462]/35 p-3.5 shadow-[var(--shadow-lg)] flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#4EB462] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="text-[11px] text-[#A9BEAE] mt-0.5 leading-relaxed">
                      {t.description}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded text-[#A9BEAE] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

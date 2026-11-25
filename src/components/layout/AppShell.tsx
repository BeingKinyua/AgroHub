"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Car,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Handshake,
  Info,
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
  type LucideIcon,
} from "lucide-react";
import { useBos } from "@/lib/services/bos-context";
import { canAccessDeliveryRun } from "@/lib/services/delivery-workflow";
import { PermissionKey } from "@/types/domain/bos";
import { ROUTE_REQUIRED_PERMISSION } from "@/lib/permissions/rbac";
import {
  Avatar,
  Breadcrumbs,
  DROPDOWN_MOTION,
  Modal,
  PermissionGateBanner,
  RoleLabel,
  StatusBadge,
  Tooltip,
} from "@/components/ui/primitives";
import { AnimatedPage } from "@/components/motion/AnimatedPage";

interface NavItem {
  label: string;
  href: string;
  permission: PermissionKey;
  icon: LucideIcon;
  badgeCount?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const STORAGE_KEY_SIDEBAR = "agro_bos_sidebar_collapsed_v1";
const navIconButton =
  "ui-button ui-button-ghost ui-button-icon text-[var(--nav-text-muted)] hover:bg-[var(--nav-surface)] hover:text-[var(--nav-text)]";
const accountLink =
  "ui-button ui-button-ghost flex w-full justify-start px-3 text-left text-[var(--text-primary)]";
const toastVariants = {
  success: {
    icon: CheckCircle2,
    style:
      "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
  },
  warning: {
    icon: AlertTriangle,
    style:
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
  },
  error: {
    icon: AlertCircle,
    style:
      "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
  },
  info: {
    icon: Info,
    style:
      "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
  },
};

const isNavActive = (pathname: string, href: string) =>
  pathname === href ||
  pathname.startsWith(href + "/") ||
  (href === "/finance" && ["/invoices", "/payments"].includes(pathname));

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
    drivers,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"all" | "unread">(
    "all",
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const navScrollRef = useRef<HTMLElement | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const drawer = mobileDrawerRef.current;
    if (!mobileDrawerOpen || !drawer) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileDrawerOpen(false);
    };
    drawer.showModal();
    document.body.style.overflow = "hidden";
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      drawer.close();
      document.body.style.overflow = overflow;
      desktop.removeEventListener("change", closeOnDesktop);
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, [mobileDrawerOpen]);

  // Restore persisted sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      if (saved === "true") {
        setSidebarCollapsed(true);
      } else if (saved === "false") {
        setSidebarCollapsed(false);
      } else if (
        typeof window !== "undefined" &&
        window.innerWidth < 1024 &&
        window.innerWidth >= 768
      ) {
        setSidebarCollapsed(true);
      }
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
      router.replace("/login");
    }
  }, [isInitialized, currentUser, router]);

  // Smoothly ensure active navigation item is visible inside sidebar viewport on route change
  useEffect(() => {
    const container = navScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector(
      '[data-nav-active="true"]',
    ) as HTMLElement | null;
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    const isAbove = activeRect.top < containerRect.top + 16;
    const isBelow = activeRect.bottom > containerRect.bottom - 16;

    if (isAbove || isBelow) {
      activeEl.scrollIntoView({
        block: "nearest",
        behavior: reduceMotion ? "instant" : "smooth",
      });
    }
  }, [pathname, reduceMotion]);

  // Close header dropdowns on outside click or Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (document.querySelector("dialog[open]")) return;
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (
        headerActionsRef.current &&
        !headerActionsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  const pendingApprovalsCount = approvals.filter(
    (a) => a.status === "Pending",
  ).length;

  const unverifiedDocsCount = documents.filter((d) => !d.verified).length;

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        group: "OVERVIEW",
        items: [
          {
            label: "Dashboard",
            href: "/dashboard",
            permission: "dashboard.view",
            icon: LayoutDashboard,
          },
        ],
      },
      {
        group: "SALES & CUSTOMERS",
        items: [
          {
            label: "Orders",
            href: "/orders",
            permission: "orders.view",
            icon: ShoppingBag,
            badgeCount: orders.filter(
              (o) =>
                !["Draft", "Delivered", "Closed", "Cancelled"].includes(
                  o.status,
                ),
            ).length,
          },
          {
            label: "Customers",
            href: "/customers",
            permission: "customers.view",
            icon: Users,
          },
          {
            label: "CRM",
            href: "/crm",
            permission: "crm.view",
            icon: Activity,
          },
        ],
      },
      {
        group: "SOURCING & STOCK",
        items: [
          {
            label: "Procurement",
            href: "/procurement",
            permission: "procurement.view",
            icon: FolderKanban,
          },
          {
            label: "Inventory",
            href: "/inventory",
            permission: "inventory.view",
            icon: Warehouse,
          },
          {
            label: "Suppliers",
            href: "/suppliers",
            permission: "suppliers.view",
            icon: Handshake,
          },
          {
            label: "Products",
            href: "/products",
            permission: "products.view",
            icon: Package,
          },
        ],
      },
      {
        group: "FULFILLMENT & DELIVERY",
        items: [
          {
            label: "Fulfillment",
            href: "/fulfillment",
            permission: "fulfillment.view",
            icon: Boxes,
          },
          {
            label: "Deliveries",
            href: "/deliveries",
            permission: "deliveries.view",
            icon: Truck,
          },
          {
            label: "Fleet & Drivers",
            href: "/fleet",
            permission: "fleet.view",
            icon: Car,
          },
        ],
      },
      {
        group: "ACCOUNTS & REPORTS",
        items: [
          {
            label: "Accounts",
            href: "/finance",
            permission: "finance.view",
            icon: Landmark,
          },
          {
            label: "Reports",
            href: "/reports",
            permission: "reports.view",
            icon: BarChart3,
          },
        ],
      },
      {
        group: "GOVERNANCE",
        items: [
          {
            label: "Approvals",
            href: "/approvals",
            permission: "approvals.view",
            icon: CheckSquare,
            badgeCount: pendingApprovalsCount,
          },
          {
            label: "Documents",
            href: "/documents",
            permission: "documents.view",
            icon: FileText,
            badgeCount: unverifiedDocsCount,
          },
        ],
      },
      {
        group: "ADMINISTRATION",
        items: [
          {
            label: "Users",
            href: "/administration/users",
            permission: "administration.users.view",
            icon: UserCheck,
          },
          {
            label: "Roles",
            href: "/administration/roles",
            permission: "administration.roles.view",
            icon: Shield,
          },
          {
            label: "Audit Logs",
            href: "/administration/audit-logs",
            permission: "audit.view",
            icon: FileSpreadsheet,
          },
        ],
      },
    ],
    [orders, pendingApprovalsCount, unverifiedDocsCount],
  );

  // Filter nav groups by RBAC permissions
  const permittedNavGroups = useMemo(() => {
    const driverRoutes = ["/dashboard", "/deliveries"];
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            can(item.permission) &&
            (currentUser?.roleId !== "delivery_driver" ||
              driverRoutes.includes(item.href)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, can, currentUser?.roleId]);

  // Filter notifications by RBAC permissions
  const permittedNotifications = useMemo(() => {
    return notifications.filter((n) => can(n.permissionRequired));
  }, [notifications, can]);

  const unreadCount = permittedNotifications.filter((n) => !n.read).length;

  const displayedNotifications = useMemo(() => {
    if (notificationTab === "unread") {
      return permittedNotifications.filter((n) => !n.read);
    }
    return permittedNotifications;
  }, [permittedNotifications, notificationTab]);

  // RBAC-aware Global Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const isDriver = currentUser?.roleId === "delivery_driver";
    const results: {
      category: string;
      title: string;
      subtitle: string;
      href: string;
    }[] = [];

    if (can("products.view")) {
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        )
        .forEach((p) =>
          results.push({
            category: "Product",
            title: `${p.name} (${p.sku})`,
            subtitle: `${p.availableQty} ${p.unit} available · Inst. KES ${p.pricing.institutionalKes}`,
            href: "/products",
          }),
        );
    }

    if (can("orders.view") && !isDriver) {
      orders
        .filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q),
        )
        .forEach((o) =>
          results.push({
            category: "Order",
            title: `${o.orderNumber} · ${o.customerName}`,
            subtitle: `${o.status} · KES ${o.totalKes.toLocaleString()}`,
            href: "/orders?orderNumber=" + encodeURIComponent(o.orderNumber),
          }),
        );
    }

    if (can("customers.view")) {
      customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.procurementContact.toLowerCase().includes(q),
        )
        .forEach((c) =>
          results.push({
            category: c.isInstitutional ? "Institution" : "Customer",
            title: c.name,
            subtitle: `${c.segment} · ${c.paymentTerms} · Balance KES ${c.outstandingBalanceKes.toLocaleString()}`,
            href:
              "/customers?" +
              new URLSearchParams({
                type: c.isInstitutional ? "institutional" : "retail",
                q: c.code,
              }),
          }),
        );
    }

    if (can("suppliers.view")) {
      suppliers
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.region.toLowerCase().includes(q),
        )
        .forEach((s) =>
          results.push({
            category: "Supplier",
            title: s.name,
            subtitle: `${s.category} · ${s.region}`,
            href: "/suppliers?supplier=" + encodeURIComponent(s.id),
          }),
        );
    }

    if (can("finance.view")) {
      invoices
        .filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q),
        )
        .forEach((i) =>
          results.push({
            category: "Invoice",
            title: `${i.invoiceNumber} · ${i.customerName}`,
            subtitle: `${i.status} · Balance KES ${i.balanceKes.toLocaleString()}`,
            href: "/invoices",
          }),
        );
    }

    if (can("deliveries.view")) {
      deliveries
        .filter((run) => canAccessDeliveryRun(run, currentUser, drivers))
        .filter(
          (d) =>
            d.runNumber.toLowerCase().includes(q) ||
            d.routeZone.toLowerCase().includes(q) ||
            d.driverName.toLowerCase().includes(q),
        )
        .forEach((d) =>
          results.push({
            category: "Delivery Run",
            title: `${d.runNumber} · ${d.routeZone}`,
            subtitle: `${d.status} · Driver: ${d.driverName}`,
            href: "/deliveries#run-" + d.id,
          }),
        );
    }

    if (can("procurement.view")) {
      procurementOrders
        .filter(
          (po) =>
            po.poNumber.toLowerCase().includes(q) ||
            po.supplierName.toLowerCase().includes(q),
        )
        .forEach((po) =>
          results.push({
            category: "Purchase Order",
            title: `${po.poNumber} · ${po.supplierName}`,
            subtitle: `${po.stage} · KES ${po.totalKes.toLocaleString()}`,
            href: "/procurement",
          }),
        );
    }

    if (can("documents.view") && !isDriver) {
      documents
        .filter(
          (doc) =>
            doc.docNumber.toLowerCase().includes(q) ||
            doc.title.toLowerCase().includes(q) ||
            doc.linkedEntity.toLowerCase().includes(q),
        )
        .forEach((doc) =>
          results.push({
            category: "Document",
            title: `${doc.docNumber} · ${doc.title}`,
            subtitle: `${doc.category} · Linked: ${doc.linkedEntity}`,
            href: "/documents",
          }),
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
    drivers,
    currentUser,
    procurementOrders,
    documents,
  ]);

  // Route-level permission & active breadcrumbs
  const requiredRoutePerm = ROUTE_REQUIRED_PERMISSION[pathname];
  const isRouteAuthorized = requiredRoutePerm ? can(requiredRoutePerm) : true;

  const currentPageLabel =
    navGroups
      .flatMap((g) => g.items)
      .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      ?.label ||
    ({
      "/profile": "My Profile",
      "/settings": "Settings",
      "/invoices": "Invoices",
      "/payments": "Payments",
      "/audit-logs": "Audit Logs",
    }[pathname] ??
      "Workspace");

  const mainBreadcrumbs = useMemo(() => {
    if (pathname === "/dashboard") {
      return [
        { label: "AgroHub BOS", href: "/dashboard" },
        { label: "Dashboard" },
      ];
    }
    if (pathname.startsWith("/administration/")) {
      const sub =
        pathname === "/administration/users"
          ? "Users"
          : pathname === "/administration/roles"
            ? "Roles"
            : "Audit logs";
      return [
        { label: "AgroHub BOS", href: "/dashboard" },
        { label: "Administration" },
        { label: sub },
      ];
    }
    if (pathname === "/invoices" || pathname === "/payments") {
      return [
        { label: "AgroHub BOS", href: "/dashboard" },
        { label: "Accounts", href: "/finance" },
        { label: currentPageLabel },
      ];
    }
    return [
      { label: "AgroHub BOS", href: "/dashboard" },
      { label: currentPageLabel },
    ];
  }, [pathname, currentPageLabel]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
        <div
          role="status"
          className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
        >
          <div
            aria-hidden="true"
            className="size-6 rounded-md bg-[var(--brand-accent)] motion-safe:animate-pulse"
          />
          <span>Initializing Agro-Deliveries Business Operating System...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Enforce Account State Security (Suspended or Disabled cannot enter BOS)
  if (currentUser.status === "Suspended" || currentUser.status === "Disabled") {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="ui-surface w-full max-w-lg p-6 text-center shadow-[var(--shadow-lg)] sm:p-8">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
            <ShieldAlert aria-hidden="true" className="size-6" />
          </div>
          <StatusBadge status={currentUser.status} />
          <h1 className="font-heading text-2xl font-semibold mt-3">
            Workspace Access Restricted
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Operator account <strong>{currentUser.fullName}</strong> (
            {currentUser.email}) is currently marked as{" "}
            <strong>{currentUser.status}</strong>. Suspended or disabled
            accounts are prohibited from accessing Agro-Deliveries operational
            data.
          </p>
          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="ui-button ui-button-primary"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--bg-card)] focus:px-4 focus:py-3"
      >
        Skip to main content
      </a>
      {/* DESKTOP & TABLET INDEPENDENT SCROLLING SIDEBAR */}
      <aside
        aria-label="Workspace Sidebar"
        className={`ui-nav hidden md:flex flex-col shrink-0 h-dvh sticky top-0 z-40 bg-[var(--nav-bg)] text-[var(--nav-text)] border-r border-[var(--nav-border)] transition-[width] duration-200 ease-out select-none ${
          sidebarCollapsed
            ? "w-[var(--sidebar-mini-width)]"
            : "w-[var(--sidebar-width)]"
        }`}
      >
        {/* Fixed Top Brand Header */}
        <div
          className={`h-16 shrink-0 flex items-center border-b border-[var(--nav-border)] ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {!sidebarCollapsed ? (
            <Link
              href="/dashboard"
              className="flex min-h-11 min-w-0 items-center gap-2.5 overflow-hidden rounded-[var(--radius-control)]"
            >
              {/* <div className="w-8 h-8 rounded-lg bg-[var(--nav-surface)] text-[var(--nav-active)] flex items-center justify-center shrink-0 border border-[var(--nav-border)]"> */}
              {/* <Leaf aria-hidden="true" className="size-4" /> */}
              {/* </div> */}
              <div className="truncate">
                <div className="font-heading text-sm font-semibold tracking-wider text-[var(--nav-text)]">
                  AGRO-DELIVERIES KE.
                </div>
              </div>
            </Link>
          ) : (
            <Tooltip label="Agro-Deliveries BOS — Expand Sidebar" side="right">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label="Expand sidebar"
                className={`${navIconButton} border-[var(--nav-border)] bg-[var(--nav-surface)] text-[var(--nav-active)]`}
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className={navIconButton}
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
          className={`flex-1 overflow-x-hidden overflow-y-auto sidebar-scroll py-4 ${
            sidebarCollapsed
              ? "sidebar-scroll--compact px-0 space-y-4"
              : "px-3.5 space-y-5"
          }`}
          aria-label="Primary Operating System Navigation"
        >
          {permittedNavGroups.map((group) => (
            <div key={group.group}>
              {!sidebarCollapsed ? (
                <div className="px-2.5 mb-1.5 text-xs font-semibold tracking-wider text-[var(--nav-text-muted)] uppercase">
                  {group.group}
                </div>
              ) : (
                <div
                  className="h-px bg-[var(--nav-border)] mx-2 my-2"
                  aria-hidden="true"
                />
              )}

              <div className={sidebarCollapsed ? "space-y-1.5" : "space-y-1"}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);

                  const linkNode = (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-nav-active={active ? "true" : undefined}
                      aria-current={active ? "page" : undefined}
                      aria-label={sidebarCollapsed ? item.label : undefined}
                      className={`relative flex min-h-11 items-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)] ${
                        sidebarCollapsed
                          ? "w-full h-11 justify-center px-0"
                          : "justify-between gap-2.5 px-3 py-2.5"
                      } ${
                        active
                          ? "bg-[var(--brand-emerald)] text-[var(--nav-active-contrast)] border border-[var(--brand-emerald)] shadow-xs"
                          : "text-[var(--nav-text-muted)] hover:text-[var(--nav-text)] hover:bg-[var(--nav-surface)] border border-transparent"
                      }`}
                    >
                      <div
                        className={`flex items-center min-w-0 ${
                          sidebarCollapsed ? "justify-center" : "gap-2.5"
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            active
                              ? "text-[var(--nav-active-contrast)]"
                              : "text-[var(--nav-text-muted)]"
                          }`}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {!sidebarCollapsed &&
                        item.badgeCount !== undefined &&
                        item.badgeCount > 0 && (
                          <span className="font-mono-tabular text-xs px-1.5 py-0.5 rounded-md bg-[var(--nav-surface)] text-[var(--nav-text)] border border-[var(--nav-border)]">
                            {item.badgeCount}
                          </span>
                        )}

                      {sidebarCollapsed &&
                        item.badgeCount !== undefined &&
                        item.badgeCount > 0 && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--nav-active)]"
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
                          portal
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

        {/* Sticky Bottom Operator Profile Surface */}
        <div className="p-3 shrink-0 border-t border-[var(--nav-border)] bg-[var(--nav-bg)]">
          {!sidebarCollapsed ? (
            <div
              className={`p-2.5 rounded-full border flex items-center justify-between  ${
                isNavActive(pathname, "/profile")
                  ? "bg-[#ec6745] border-[#ec6745]"
                  : "bg-[var(--nav-surface)] border-[var(--nav-border)]"
              }`}
            >
              <Link
                href="/profile"
                aria-current={
                  isNavActive(pathname, "/profile") ? "page" : undefined
                }
                className={`group flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full ${
                  isNavActive(pathname, "/profile") ? "text-[#102523]" : ""
                }`}
              >
                <Avatar
                  fullName={currentUser.fullName}
                  avatarUrl={currentUser.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold truncate transition-colors ${
                      isNavActive(pathname, "/profile")
                        ? "text-[#102523] group-hover:text-[#102523]"
                        : "text-[var(--nav-text)] group-hover:text-[var(--nav-active)]"
                    }`}
                  >
                    {currentUser.fullName}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      isNavActive(pathname, "/profile")
                        ? "text-[#102523]"
                        : "text-[var(--nav-active)]"
                    }`}
                  >
                    {currentUser.roleName}
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip
                label={`${currentUser.fullName} (${currentUser.roleName})`}
                side="right"
              >
                <Link
                  href="/profile"
                  aria-label="My profile"
                  aria-current={
                    isNavActive(pathname, "/profile") ? "page" : undefined
                  }
                  className={`${navIconButton} ${
                    isNavActive(pathname, "/profile")
                      ? "bg-[#ec6745] text-[#102523] hover:bg-[#ec6745] hover:text-[#102523]"
                      : ""
                  }`}
                >
                  <Avatar
                    fullName={currentUser.fullName}
                    avatarUrl={currentUser.avatarUrl}
                    size="md"
                  />
                </Link>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      {mobileDrawerOpen && (
        <dialog
          id="mobile-navigation"
          ref={mobileDrawerRef}
          className="ui-nav fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-[var(--nav-bg)]/75 backdrop:backdrop-blur-xs"
          aria-label="Workspace navigation"
          onCancel={(event) => {
            event.preventDefault();
            setMobileDrawerOpen(false);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              setMobileDrawerOpen(false);
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[288px] max-w-[86vw] bg-[var(--nav-bg)] text-[var(--nav-text)] h-dvh flex flex-col z-10 border-r border-[var(--nav-border)]"
          >
            <div className="h-16 px-4 shrink-0 flex items-center justify-between border-b border-[var(--nav-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--nav-surface)] text-[var(--nav-active)] flex items-center justify-center">
                  <Leaf aria-hidden="true" className="size-4" />
                </div>
                <div>
                  <div className="font-heading text-sm font-semibold text-[var(--nav-text)]">
                    AGRO-DELIVERIES KE.
                  </div>
                  <div className="text-xs text-[var(--nav-text-muted)]">
                    {currentUser.roleName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className={navIconButton}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav
              aria-label="Primary navigation"
              className="flex-1 overflow-y-auto sidebar-scroll p-3.5 space-y-5"
            >
              {permittedNavGroups.map((group) => (
                <div key={group.group}>
                  <div className="px-2.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nav-text-muted)]">
                    {group.group}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex min-h-11 items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                            active
                              ? "bg-[var(--nav-surface)] text-[var(--nav-active)] border border-[var(--nav-border)]"
                              : "text-[var(--nav-text-muted)] hover:text-[var(--nav-text)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                            <span>{item.label}</span>
                          </div>
                          {item.badgeCount !== undefined &&
                            item.badgeCount > 0 && (
                              <span className="font-mono-tabular text-xs px-1.5 py-0.5 rounded bg-[var(--nav-surface)] text-[var(--nav-text)]">
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

            <div className="p-4 shrink-0 border-t border-[var(--nav-border)] space-y-2.5">
              <Link
                href="/profile"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--nav-surface)] border border-[var(--nav-border)]"
              >
                <Avatar
                  fullName={currentUser.fullName}
                  avatarUrl={currentUser.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--nav-text)] truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-xs text-[var(--nav-active)] truncate">
                    @{currentUser.nickname} · View Profile
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="ui-button ui-button-danger w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </dialog>
      )}

      {/* MAIN INDEPENDENT SCROLL WORKSPACE COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* STICKY TOP UTILITY HEADER */}
        <header className="sticky top-0 z-[var(--z-header)] flex h-[var(--header-height)] items-center justify-between gap-2 shadow-xl/20 bg-[var(--bg-card)] px-3 sm:gap-3 sm:px-6 lg:px-8">
          {/* Mobile Menu Trigger (hidden on desktop) */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="ui-button ui-button-secondary ui-button-icon md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls={mobileDrawerOpen ? "mobile-navigation" : undefined}
          >
            <Menu aria-hidden="true" className="size-4" />
          </button>

          {/* 1. Global Search Trigger */}
          <div className="min-w-0 max-w-xl flex-1 sm:mx-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ui-button w-full justify-between bg-[var(--bg-canvas)] px-2.5 font-normal text-[var(--text-secondary)] sm:px-3.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Search
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[var(--brand-accent)]"
                />
                <span className="truncate">Search AgroHub</span>
              </span>
              <kbd className="ui-meta hidden shrink-0 rounded-full bg-[var(--bg-card)] px-1.5 py-1.5 font-mono-tabular sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Notifications + Profile Menu */}
          <div
            ref={headerActionsRef}
            className="flex shrink-0 items-center gap-2"
          >
            {/* 2. Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setProfileMenuOpen(false);
                }}
                aria-label={
                  unreadCount
                    ? `Notifications (${unreadCount} unread)`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
                aria-controls={
                  notificationsOpen ? "workspace-notifications" : undefined
                }
                className="ui-button ui-button-secondary ui-button-icon relative bg-[var(--bg-canvas)]"
              >
                <Bell
                  aria-hidden="true"
                  className="size-4 text-[var(--text-primary)]"
                />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--status-danger-fg)] px-1 font-mono-tabular text-xs font-semibold text-[var(--status-danger-bg)]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    {...DROPDOWN_MOTION}
                    id="workspace-notifications"
                    className="ui-surface fixed inset-x-3 top-[calc(var(--header-height)+0.5rem)] z-[var(--z-dropdown)] max-h-[calc(100dvh-var(--header-height)-1rem)] overflow-y-auto p-3.5 shadow-[var(--shadow-lg)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
                  >
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                      <div>
                        <div className="ui-section-title font-semibold text-[var(--text-primary)]">
                          Notifications
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="ui-button ui-button-ghost ui-button-compact text-[var(--brand-accent)]"
                      >
                        <CheckCheck aria-hidden="true" className="size-4" />
                        <span>Mark all read</span>
                      </button>
                    </div>

                    <div className="mb-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNotificationTab("all")}
                        className="ui-tab ui-button-compact"
                        aria-pressed={notificationTab === "all"}
                      >
                        All ({permittedNotifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationTab("unread")}
                        className="ui-tab ui-button-compact"
                        aria-pressed={notificationTab === "unread"}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {displayedNotifications.length === 0 ? (
                        <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
                          No {notificationTab === "unread" ? "unread " : ""}
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
                            className={`block rounded-[var(--radius-control)] border p-3 transition-colors hover:bg-[var(--bg-subtle)] ${
                              n.read
                                ? "border-transparent"
                                : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <StatusBadge status={n.severity} />
                              <span className="ui-meta font-mono-tabular">
                                {n.timestamp}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                              {n.title}
                            </div>
                            <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
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

            {/* 3. User Account & Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileMenuOpen}
                aria-label="Account and Profile Menu"
                aria-controls={
                  profileMenuOpen ? "workspace-account" : undefined
                }
                className="ui-button ui-button-icon rounded-full"
              >
                <Avatar
                  fullName={currentUser.fullName}
                  avatarUrl={currentUser.avatarUrl}
                  size="lg"
                />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    {...DROPDOWN_MOTION}
                    id="workspace-account"
                    className="ui-surface fixed inset-x-3 top-[calc(var(--header-height)+0.5rem)] z-[var(--z-dropdown)] max-h-[calc(100dvh-var(--header-height)-1rem)] overflow-y-auto p-4 shadow-[var(--shadow-lg)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
                  >
                    {/* Identity Header */}
                    <div className="flex items-start gap-3 pb-3.5 mb-3 border-b border-[var(--border-subtle)]">
                      <Avatar
                        fullName={currentUser.fullName}
                        avatarUrl={currentUser.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-md font-semibold text-[var(--text-primary)] truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="ui-meta truncate">
                          {currentUser.roleName}
                        </div>
                      </div>
                    </div>

                    {/* Primary Account Navigation */}
                    <div className="space-y-1 pb-3 mb-3 border-b border-[var(--border-subtle)]">
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className={accountLink}
                      >
                        <User
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--brand-accent)]"
                        />
                        <div>
                          <div>My Profile</div>
                        </div>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className={accountLink}
                      >
                        <Settings
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--brand-accent)]"
                        />
                        <div>
                          <div>Settings</div>
                        </div>
                      </Link>
                      {can("audit.view") && (
                        <Link
                          href="/administration/audit-logs"
                          onClick={() => setProfileMenuOpen(false)}
                          className={accountLink}
                        >
                          <FileSpreadsheet
                            aria-hidden="true"
                            className="size-4 shrink-0 text-[var(--brand-accent)]"
                          />
                          <div>
                            <div>Security</div>
                          </div>
                        </Link>
                      )}
                    </div>

                    {/* Appearance Section in Profile Menu */}
                    <div className="pb-3 mb-3">
                      <div
                        role="group"
                        aria-label="Theme Mode"
                        className="grid grid-cols-3 gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1"
                      >
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className="ui-tab px-1.5"
                          aria-pressed={theme === "light"}
                        >
                          <Sun
                            aria-hidden="true"
                            className="hidden size-4 shrink-0 min-[360px]:block"
                          />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className="ui-tab px-1.5"
                          aria-pressed={theme === "dark"}
                        >
                          <Moon
                            aria-hidden="true"
                            className="hidden size-4 shrink-0 min-[360px]:block"
                          />
                          <span>Dark</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("system")}
                          className="ui-tab px-1.5"
                          aria-pressed={theme === "system"}
                        >
                          <Monitor
                            aria-hidden="true"
                            className="hidden size-4 shrink-0 min-[360px]:block"
                          />
                          <span>System</span>
                        </button>
                      </div>
                    </div>

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.push("/login");
                      }}
                      className="ui-button ui-button-danger w-full justify-start gap-2"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT CANVAS */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 scroll-mt-16 p-3 sm:p-5 lg:p-6 xl:p-8 max-w-[1600px] w-full mx-auto"
        >
          {/* Breadcrumb relocated from top nav bar into main content area */}
          <div className="mb-4">
            <Breadcrumbs items={mainBreadcrumbs} />
          </div>
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
        className="ui-nav fixed inset-x-0 bottom-0 z-[var(--z-header)] grid h-[calc(3.5rem+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-2 pb-[env(safe-area-inset-bottom)] text-[var(--nav-text-muted)] md:hidden"
      >
        <Link
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
            pathname === "/dashboard"
              ? "text-[var(--nav-active)] font-medium"
              : ""
          }`}
        >
          <LayoutDashboard aria-hidden="true" className="mb-0.5 size-4" />
          <span>Home</span>
        </Link>
        {can("orders.view") ? (
          <Link
            href="/orders"
            aria-current={pathname === "/orders" ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
              pathname === "/orders"
                ? "text-[var(--nav-active)] font-medium"
                : ""
            }`}
          >
            <ShoppingBag aria-hidden="true" className="mb-0.5 size-4" />
            <span>Orders</span>
          </Link>
        ) : (
          <Link
            href="/deliveries"
            aria-current={pathname === "/deliveries" ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
              pathname === "/deliveries"
                ? "text-[var(--nav-active)] font-medium"
                : ""
            }`}
          >
            <Truck aria-hidden="true" className="mb-0.5 size-4" />
            <span>Runs</span>
          </Link>
        )}
        {can("inventory.view") ? (
          <Link
            href="/inventory"
            aria-current={pathname === "/inventory" ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
              pathname === "/inventory"
                ? "text-[var(--nav-active)] font-medium"
                : ""
            }`}
          >
            <Warehouse aria-hidden="true" className="mb-0.5 size-4" />
            <span>Inventory</span>
          </Link>
        ) : (
          <Link
            href="/documents"
            aria-current={pathname === "/documents" ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
              pathname === "/documents"
                ? "text-[var(--nav-active)] font-medium"
                : ""
            }`}
          >
            <FileText aria-hidden="true" className="mb-0.5 size-4" />
            <span>Docs</span>
          </Link>
        )}
        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs ${
            pathname === "/profile"
              ? "text-[var(--nav-active)] font-medium"
              : ""
          }`}
        >
          <User aria-hidden="true" className="mb-0.5 size-4" />
          <span>Profile</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-expanded={mobileDrawerOpen}
          aria-controls={mobileDrawerOpen ? "mobile-navigation" : undefined}
          className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-control)] px-1 py-1 text-xs hover:bg-[var(--nav-surface)] hover:text-[var(--nav-text)]"
        >
          <Menu aria-hidden="true" className="mb-0.5 size-4" />
          <span>Modules</span>
        </button>
      </nav>

      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search AgroHub"
        size="lg"
      >
        <label className="relative flex items-center">
          <span className="sr-only">Search records</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 size-4 text-[var(--brand-accent)]"
          />
          <input
            data-modal-autofocus
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              currentUser.roleId === "delivery_driver"
                ? "Search your delivery runs"
                : "Search by name or reference"
            }
            className="ui-field w-full pl-9"
          />
        </label>
        {searchQuery.trim() &&
          (searchResults.length ? (
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
              {searchResults.map((item) => (
                <li key={item.category + item.title + item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[var(--radius-control)] p-3 hover:bg-[var(--bg-subtle)]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="ui-meta">{item.subtitle}</p>
                    </div>
                    <span className="ui-meta text-[var(--brand-accent)]">
                      {item.category}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="p-3 text-sm text-[var(--text-secondary)]"
              role="status"
            >
              No matching records.
            </p>
          ))}
      </Modal>

      {/* GLOBAL TOAST FEEDBACK STACK */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex max-w-sm flex-col gap-2.5 sm:left-auto sm:right-6 sm:w-full md:bottom-6"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const { icon: Icon, style } = toastVariants[toast.tone];
            return (
              <motion.div
                key={toast.id}
                initial={
                  reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                className={`pointer-events-auto flex items-start justify-between gap-2 rounded-[var(--radius-card)] border p-3 shadow-[var(--shadow-lg)] ${style}`}
              >
                <div className="flex min-w-0 items-start gap-2.5 py-1">
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 wrap-break-word text-sm">
                    <div className="font-semibold">{toast.title}</div>
                    {toast.description && (
                      <p className="mt-0.5 leading-relaxed">
                        {toast.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="ui-button ui-button-ghost ui-button-icon ui-button-compact [color:inherit]"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

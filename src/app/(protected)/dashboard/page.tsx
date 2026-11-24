"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  CircleDollarSign,
  TrendingUp,
  Wallet,
  ReceiptText,
  PackageCheck,
  Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, PageHeader } from "@/components/ui/primitives";
import { useBos } from "@/lib/services/bos-context";
import {
  canAccessDeliveryRun,
  hasDeliveryRunException,
  isOpenPODDiscrepancy,
  isPendingPOD,
} from "@/lib/services/delivery-workflow";
import { getOrderSourcingLines } from "@/lib/services/procurement-rules";
import {
  getNairobiDate,
  getOpenPayables,
  offsetBusinessDate,
} from "@/lib/services/workspace-metrics";

type Queue = {
  id: string;
  title: string;
  action: string;
  href: string;
  icon: LucideIcon;
  visible: boolean;
  rows: { id: string; title: string; detail: string; href?: string }[];
};

type DashboardAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  category: string;
  urgency: "critical" | "important" | "routine";
};

const rolePriorities: Record<string, string[]> = {
  delivery_driver: ["dispatch", "on-route", "exceptions"],
  procurement_officer: ["sourcing", "collections", "stock", "approvals"],
  storekeeper: ["stock", "collections", "packing"],
  sales_rep: ["orders", "exceptions"],
  accounts_clerk: ["receivables", "payables", "approvals"],
  finance_manager: ["approvals", "payables", "receivables"],
};

const formatKes = (amount: number) => "KES " + amount.toLocaleString("en-KE");
const byDate = <T,>(records: T[], date: (record: T) => string) =>
  [...records].sort((a, b) => date(a).localeCompare(date(b)));

export default function DashboardPage() {
  const {
    currentUser,
    can,
    orders,
    procurementOrders,
    deliveries,
    drivers,
    podRecords,
    approvals,
    supplierPayables,
    invoices,
    stockBatches,
  } = useBos();
  const [brief, setBrief] = useState<{
    headline: string;
    priorities: string[];
    riskAlert: string;
  }>();
  const [briefStatus, setBriefStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const today = getNairobiDate();
  const comingWeek = offsetBusinessDate(today, 7);
  const stockCutoff = offsetBusinessDate(today, 3);
  const isDriver = currentUser?.roleId === "delivery_driver";
  const activeOrders = byDate(
    orders.filter(
      (order) =>
        !["Draft", "Delivered", "Closed", "Cancelled"].includes(order.status),
    ),
    (order) => order.deliveryDate,
  );
  const sourcingOrders = can("procurement.view")
    ? activeOrders.filter(
        (order) =>
          ["Confirmed", "Picking", "Partially Fulfilled"].includes(
            order.status,
          ) &&
          getOrderSourcingLines(order, procurementOrders).some(
            (line) => line.outstanding > 0,
          ),
      )
    : [];
  const runs = deliveries.filter((run) =>
    canAccessDeliveryRun(run, currentUser, drivers),
  );
  const ordersByIdentifier = new Map(
    orders.flatMap(
      (order) =>
        [
          [order.orderNumber, order],
          [order.id, order],
        ] as const,
    ),
  );
  const dispatchRuns = runs.filter(
    (run) => run.status === "Planned" || run.status === "Loaded",
  );
  const pendingPods = podRecords.filter(
    (pod) => isPendingPOD(pod) || isOpenPODDiscrepancy(pod),
  );
  const pendingApprovals = approvals.filter(
    (approval) => approval.status === "Pending",
  );
  const duePayables = getOpenPayables(supplierPayables, comingWeek);
  const overdueInvoices = byDate(
    invoices.filter(
      (invoice) =>
        invoice.balanceKes > 0 && invoice.dueDate && invoice.dueDate < today,
    ),
    (invoice) => invoice.dueDate,
  );
  const expiringBatches = byDate(
    stockBatches.filter(
      (batch) =>
        batch.availableQty > 0 &&
        batch.status !== "Quarantined" &&
        batch.expiryDate &&
        batch.expiryDate <= stockCutoff,
    ),
    (batch) => batch.expiryDate,
  );
  const openCollections = byDate(
    procurementOrders.filter(
      (po) =>
        [
          "PO Issued",
          "Receiving (GRN)",
          "Quality Check",
          "Partially Received",
        ].includes(po.stage) && !po.goodsCollected,
    ),
    (po) => po.expectedDate,
  );
  const monthKey = today.slice(0, 7);
  const monthOrders = can("orders.view")
    ? orders.filter((order) => order.orderDate.startsWith(monthKey))
    : [];
  const monthInvoices = can("finance.view")
    ? invoices.filter((invoice) => invoice.issueDate.startsWith(monthKey))
    : [];
  const invoicedThisMonth = monthInvoices.reduce(
    (sum, invoice) => sum + invoice.amountKes,
    0,
  );
  const openReceivables = can("finance.view")
    ? invoices.filter((invoice) => invoice.balanceKes > 0)
    : [];
  const overdueReceivableKes = openReceivables
    .filter((invoice) => invoice.dueDate < today)
    .reduce((sum, invoice) => sum + invoice.balanceKes, 0);
  const totalReceivableKes = openReceivables.reduce(
    (sum, invoice) => sum + invoice.balanceKes,
    0,
  );
  const totalPayablesKes = can("finance.view")
    ? supplierPayables
        .filter((payable) => payable.balanceKes > 0)
        .reduce((sum, payable) => sum + payable.balanceKes, 0)
    : 0;
  const recentMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${monthKey}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      month: new Intl.DateTimeFormat("en-KE", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      invoiced: can("finance.view")
        ? invoices
            .filter((invoice) => invoice.issueDate.startsWith(key))
            .reduce((sum, invoice) => sum + invoice.amountKes, 0)
        : 0,
      profit: (() => {
        if (!can("finance.view")) return null;
        const monthRows = invoices.filter((invoice) =>
          invoice.issueDate.startsWith(key),
        );
        const hasCompleteCosting =
          monthRows.length > 0 &&
          monthRows.every(
            (invoice) =>
              invoice.lineItems?.length &&
              invoice.lineItems.every((line) =>
                Number.isFinite(line.purchaseCostKes),
              ),
          );
        return hasCompleteCosting
          ? monthRows.reduce(
              (sum, invoice) =>
                sum +
                (invoice.lineItems ?? []).reduce(
                  (invoiceSum, line) =>
                    invoiceSum +
                    line.lineTotalKes -
                    line.quantity * (line.purchaseCostKes ?? 0),
                  0,
                ),
              0,
            )
          : null;
      })(),
    };
  });
  const orderPipeline = [
    "Draft",
    "Confirmed",
    "Picking",
    "Packed",
    "Dispatched",
    "Delivered",
    "Partially Fulfilled",
  ]
    .map((status) => ({
      status,
      orders: can("orders.view")
        ? orders.filter((order) => order.status === status).length
        : 0,
    }))
    .filter((item) => item.orders > 0);
  const grossProfitAvailable =
    monthInvoices.length > 0 &&
    monthInvoices.every(
      (invoice) =>
        invoice.lineItems?.length &&
        invoice.lineItems.every((line) =>
          Number.isFinite(line.purchaseCostKes),
        ),
    );
  const grossProfitKes = grossProfitAvailable
    ? monthInvoices.reduce(
        (sum, invoice) =>
          sum +
          (invoice.lineItems ?? []).reduce(
            (invoiceSum, line) =>
              invoiceSum +
              line.lineTotalKes -
              line.quantity * (line.purchaseCostKes ?? 0),
            0,
          ),
        0,
      )
    : null;
  const grossMarginPct =
    grossProfitKes !== null && invoicedThisMonth > 0
      ? (grossProfitKes / invoicedThisMonth) * 100
      : null;
  const receivableAging = [
    { bucket: "Current", amount: 0 },
    { bucket: "1–15 days", amount: 0 },
    { bucket: "16–30 days", amount: 0 },
    { bucket: "31–60 days", amount: 0 },
    { bucket: "61+ days", amount: 0 },
  ];
  openReceivables.forEach((invoice) => {
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.parse(`${today}T00:00:00Z`) -
          Date.parse(`${invoice.dueDate}T00:00:00Z`)) /
          86400000,
      ),
    );
    const index =
      daysOverdue === 0
        ? 0
        : daysOverdue <= 15
          ? 1
          : daysOverdue <= 30
            ? 2
            : daysOverdue <= 60
              ? 3
              : 4;
    receivableAging[index].amount += invoice.balanceKes;
  });
  const recentMonthKeys = new Set(recentMonths.map((month) => month.key));
  const orderByNumber = new Map(
    orders.map((order) => [order.orderNumber, order]),
  );
  const customerSegmentRevenue = new Map<string, number>();
  invoices
    .filter(
      (invoice) =>
        can("finance.view") &&
        recentMonthKeys.has(invoice.issueDate.slice(0, 7)),
    )
    .forEach((invoice) => {
      const segment =
        orderByNumber.get(invoice.orderNumber)?.customerSegment ??
        "Unclassified";
      customerSegmentRevenue.set(
        segment,
        (customerSegmentRevenue.get(segment) ?? 0) + invoice.amountKes,
      );
    });
  const segmentRevenue = [...customerSegmentRevenue.entries()]
    .map(([segment, revenue]) => ({ segment, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const runStatusGroups = [
    { status: "Ready to dispatch", count: 0 },
    { status: "In delivery", count: 0 },
    { status: "Delivered", count: 0 },
    { status: "Partially delivered", count: 0 },
    { status: "Rescheduled", count: 0 },
  ];
  runs.forEach((run) => {
    const group =
      run.status === "Planned" || run.status === "Loaded"
        ? 0
        : run.status === "Dispatched"
          ? 1
          : run.status === "Delivered"
            ? 2
            : run.status === "Partially Delivered"
              ? 3
              : 4;
    runStatusGroups[group].count += 1;
  });
  const procurementCommitments = new Map<string, number>();
  procurementOrders
    .filter(
      (po) =>
        can("procurement.view") &&
        [
          "PO Issued",
          "Receiving (GRN)",
          "Quality Check",
          "Partially Received",
        ].includes(po.stage),
    )
    .forEach((po) => {
      const source =
        po.purpose === "Direct Customer Fulfillment"
          ? "Direct procurement"
          : po.purpose === "Bulk Stock Procurement"
            ? "Stock procurement"
            : "Unclassified";
      procurementCommitments.set(
        source,
        (procurementCommitments.get(source) ?? 0) + po.totalKes,
      );
    });
  const procurementBySource = [...procurementCommitments.entries()].map(
    ([source, commitment]) => ({ source, commitment }),
  );
  const deliveryRows = (entries: typeof deliveries) =>
    entries.map((run) => {
      const dates = (run.orderNumbers ?? run.ordersIncluded)
        .map((identifier) => ordersByIdentifier.get(identifier)?.deliveryDate)
        .filter(Boolean)
        .sort();
      return {
        id: run.id,
        title: run.runNumber + " · " + run.routeZone,
        detail: [run.scheduledDate ?? dates[0], run.departureTime, run.status]
          .filter(Boolean)
          .join(" · "),
      };
    });
  const orderRows = (entries: typeof orders) =>
    entries.map((order) => ({
      id: order.id,
      title: order.orderNumber + " · " + order.customerName,
      detail: order.deliveryDate + " · " + order.status,
      href: "/orders?orderNumber=" + encodeURIComponent(order.orderNumber),
    }));

  const queues: Queue[] = [
    {
      id: "sourcing",
      title: "Orders awaiting sourcing",
      action: "Open procurement",
      href: "/procurement",
      icon: Package,
      visible: can("procurement.view"),
      rows: sourcingOrders.map((order) => ({
        id: order.id,
        title: order.orderNumber + " · " + order.customerName,
        detail: "Requested delivery " + order.deliveryDate,
        href: "/procurement?order=" + encodeURIComponent(order.id),
      })),
    },
    {
      id: "collections",
      title: "Supplier collections and receipts",
      action: "View purchase orders",
      href: "/procurement",
      icon: Boxes,
      visible: can("procurement.view"),
      rows: openCollections.map((po) => ({
        id: po.id,
        title: po.poNumber + " · " + po.supplierName,
        detail:
          "Expected " + po.expectedDate + " · " + (po.purpose ?? po.stage),
      })),
    },
    {
      id: "dispatch",
      title: isDriver ? "Your scheduled dispatches" : "Scheduled dispatches",
      action: "Open deliveries",
      href: "/deliveries?filter=dispatch",
      icon: Truck,
      visible: can("deliveries.view"),
      rows: deliveryRows(dispatchRuns),
    },
    {
      id: "pod",
      title: "Proofs of delivery to review",
      action: "Review proofs of delivery",
      href: "/fulfillment#pod-queue",
      icon: ClipboardCheck,
      visible: can("fulfillment.view") && can("orders.approve"),
      rows: pendingPods.map((pod) => ({
        id: pod.id,
        title: pod.orderNumber + " · " + pod.customerName,
        detail: isPendingPOD(pod)
          ? "Awaiting quantity verification"
          : "Discrepancy needs resolution",
        href:
          "/fulfillment?receipt=" + encodeURIComponent(pod.id) + "#pod-queue",
      })),
    },
    {
      id: "on-route",
      title: "Your active delivery runs",
      action: "View active routes",
      href: "/deliveries?status=Dispatched",
      icon: Truck,
      visible: isDriver && can("deliveries.view"),
      rows: deliveryRows(
        runs.filter(
          (run) =>
            run.status === "Dispatched" || run.status === "Partially Delivered",
        ),
      ),
    },
    {
      id: "approvals",
      title: "Approval requests",
      action: "Open approvals",
      href: "/approvals?status=pending",
      icon: ShieldCheck,
      visible: can("approvals.view"),
      rows: pendingApprovals.map((approval) => ({
        id: approval.id,
        title: approval.reference + " · " + approval.category,
        detail: approval.entityTitle + " · " + formatKes(approval.valueKes),
      })),
    },
    {
      id: "payables",
      title: "Supplier payments due",
      action: "View supplier payables",
      href: "/finance?tab=payables",
      icon: CreditCard,
      visible: can("finance.view"),
      rows: duePayables.map((payable) => ({
        id: payable.id,
        title: payable.supplierName + " · " + payable.poNumber,
        detail:
          formatKes(payable.balanceKes) +
          (payable.dueDate < today ? " · Overdue since " : " · Due ") +
          payable.dueDate,
      })),
    },
    {
      id: "exceptions",
      title: "Delivery exceptions",
      action: "Review exceptions",
      href: "/deliveries?filter=exceptions",
      icon: AlertTriangle,
      visible: can("deliveries.view"),
      rows: deliveryRows(
        runs.filter((run) => hasDeliveryRunException(run, orders, podRecords)),
      ),
    },
    {
      id: "stock",
      title: "Stock nearing expiry or expired",
      action: "Review inventory",
      href: "/inventory?filter=expiring",
      icon: AlertTriangle,
      visible: can("inventory.view"),
      rows: expiringBatches.map((batch) => ({
        id: batch.id,
        title: batch.productName + " · " + batch.batchNumber,
        detail:
          batch.availableQty +
          " " +
          batch.unit +
          " · " +
          (batch.expiryDate < today ? "Expired " : "Expires ") +
          batch.expiryDate,
      })),
    },
    {
      id: "receivables",
      title: "Overdue customer invoices",
      action: "Open receivables",
      href: "/finance?status=overdue",
      icon: CreditCard,
      visible: can("finance.view"),
      rows: overdueInvoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.invoiceNumber + " · " + invoice.customerName,
        detail: formatKes(invoice.balanceKes) + " · Due " + invoice.dueDate,
      })),
    },
    {
      id: "orders",
      title: "Active customer orders",
      action: "Open orders",
      href: "/orders",
      icon: Package,
      visible: can("orders.view") && !isDriver,
      rows: orderRows(activeOrders),
    },
    {
      id: "packing",
      title: "Picking and packing",
      action: "Open fulfillment",
      href: "/fulfillment",
      icon: Boxes,
      visible: can("fulfillment.manage"),
      rows: orderRows(
        activeOrders.filter(
          (order) => order.status === "Picking" || order.status === "Packed",
        ),
      ).map((row) => ({
        ...row,
        href: can("orders.view") ? row.href : undefined,
      })),
    },
  ];
  const priorities = rolePriorities[currentUser?.roleId ?? ""];
  const relevantQueues = (
    priorities
      ? priorities.map((id) => queues.find((queue) => queue.id === id))
      : queues
  ).filter((queue): queue is Queue => queue?.visible === true);
  const activeQueues = relevantQueues.filter((queue) => queue.rows.length > 0);
  const actionableQueues = activeQueues.filter(
    (queue) => !["orders", "packing"].includes(queue.id),
  );
  const dashboardActions: DashboardAction[] = actionableQueues
    .flatMap((queue) =>
      queue.rows.map((row) => {
        const isCritical =
          queue.id === "exceptions" ||
          (queue.id === "receivables" &&
            Number(
              row.detail.match(/KES\s([\d,]+)/)?.[1]?.replaceAll(",", "") ?? 0,
            ) >= 100000) ||
          (queue.id === "payables" && row.detail.includes("Overdue since")) ||
          (queue.id === "stock" && row.detail.includes("Expired"));
        const urgency: DashboardAction["urgency"] = isCritical
          ? "critical"
          : [
                "sourcing",
                "collections",
                "dispatch",
                "on-route",
                "approvals",
                "payables",
                "receivables",
                "stock",
              ].includes(queue.id)
            ? "important"
            : "routine";
        return {
          id: `${queue.id}:${row.id}`,
          title: row.title,
          detail: row.detail,
          href: row.href ?? queue.href,
          action: queue.action,
          category: queue.title,
          urgency,
        };
      }),
    )
    .sort(
      (a, b) =>
        ({ critical: 0, important: 1, routine: 2 })[a.urgency] -
        { critical: 0, important: 1, routine: 2 }[b.urgency],
    );
  const openActionCount = dashboardActions.length;
  const actionUrgencyCounts = {
    critical: dashboardActions.filter((action) => action.urgency === "critical")
      .length,
    important: dashboardActions.filter(
      (action) => action.urgency === "important",
    ).length,
    routine: dashboardActions.filter((action) => action.urgency === "routine")
      .length,
  };

  const loadBrief = async () => {
    setBriefStatus("loading");
    try {
      const response = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          openOrdersCount: can("orders.view") ? activeOrders.length : 0,
          expiringBatchesCount: can("inventory.view")
            ? expiringBatches.length
            : 0,
          pendingApprovalsCount: can("approvals.view")
            ? pendingApprovals.length
            : 0,
          overdueReceivablesKes: can("finance.view")
            ? overdueInvoices.reduce(
                (sum, invoice) => sum + invoice.balanceKes,
                0,
              )
            : 0,
          upcomingPayablesKes: can("finance.view")
            ? duePayables.reduce((sum, payable) => sum + payable.balanceKes, 0)
            : 0,
        }),
      });
      if (!response.ok) throw new Error("Brief unavailable");
      setBrief(await response.json());
      setBriefStatus("idle");
    } catch {
      setBriefStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${currentUser?.fullName ? `, ${currentUser.fullName.split(" ")[0]}` : ""}`}
        description={`${new Intl.DateTimeFormat("en-KE", { dateStyle: "full", timeZone: "Africa/Nairobi" }).format(new Date())}`}
        actions={
          can("orders.create") && (
            <Link
              href="/orders?action=new"
              className="ui-button ui-button-primary"
            >
              <Plus className="size-4" aria-hidden="true" />
              New order
            </Link>
          )
        }
      />

      <section aria-labelledby="business-overview" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"></div>
        <div className="grid grid-cols-2 auto-rows-fr gap-3 sm:gap-4 xl:grid-cols-12">
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="relative col-span-2 flex min-h-44 flex-col justify-between overflow-hidden border-[var(--border-subtle)] bg-[var(--bg-elevated)] xl:col-span-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ui-meta font-semibold uppercase tracking-[0.12em]">
                    Invoiced revenue · MTD
                  </p>
                  <p className="ui-metric mt-2 text-3xl sm:text-4xl">
                    {formatKes(invoicedThisMonth)}
                  </p>
                  <p className="ui-meta mt-1">
                    Issued customer invoices, not cash collected
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--bg-subtle)] text-[var(--brand-accent)]">
                  <CircleDollarSign className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 pt-3">
                <div>
                  <p className="ui-meta">Orders this month</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {monthOrders.length}
                  </p>
                </div>
                <div>
                  <p className="ui-meta">Average order value</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {monthOrders.length
                      ? formatKes(
                          monthOrders.reduce(
                            (sum, order) => sum + order.totalKes,
                            0,
                          ) / monthOrders.length,
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            </Card>
          )}
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="col-span-1 flex min-h-36 flex-col justify-between xl:col-span-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="ui-meta font-semibold">Gross profit · MTD</p>
                <TrendingUp
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="ui-metric mt-2 text-2xl">
                  {grossProfitKes === null
                    ? "Unavailable"
                    : formatKes(grossProfitKes)}
                </p>
                <p className="ui-meta mt-1">
                  {grossProfitKes === null
                    ? "Invoice line costs are incomplete"
                    : `${grossMarginPct?.toFixed(1)}% gross margin`}
                </p>
              </div>
            </Card>
          )}
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="col-span-1 flex min-h-36 flex-col justify-between xl:col-span-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="ui-meta font-semibold">Customer receivables</p>
                <ReceiptText
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="ui-metric mt-2 text-2xl">
                  {formatKes(totalReceivableKes)}
                </p>
                <p className="ui-meta mt-1">
                  {formatKes(overdueReceivableKes)} overdue
                </p>
              </div>
            </Card>
          )}
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="col-span-1 flex min-h-36 flex-col justify-between xl:col-span-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="ui-meta font-semibold">Supplier payables</p>
                <Wallet
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="ui-metric mt-2 text-2xl">
                  {formatKes(totalPayablesKes)}
                </p>
                <p className="ui-meta mt-1">
                  {formatKes(
                    duePayables.reduce(
                      (sum, payable) => sum + payable.balanceKes,
                      0,
                    ),
                  )}{" "}
                  due within 7 days
                </p>
              </div>
            </Card>
          )}
          {can("orders.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="col-span-1 flex min-h-36 flex-col justify-between xl:col-span-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="ui-meta font-semibold">Orders this month</p>
                <PackageCheck
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="ui-metric mt-2 text-2xl">{monthOrders.length}</p>
                <p className="ui-meta mt-1">
                  {activeOrders.length} currently in progress
                </p>
              </div>
            </Card>
          )}
          {can("deliveries.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="col-span-2 flex min-h-36 flex-col justify-between xl:col-span-6"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="ui-meta font-semibold">On-time delivery</p>
                <Gauge
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="ui-metric mt-2 text-2xl">Unavailable</p>
                <p className="ui-meta mt-1">
                  Delivery timestamps do not include a target time
                </p>
              </div>
            </Card>
          )}
        </div>
      </section>

      <section
        aria-label="Business performance and action centre"
        className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12"
      >
        <Card
          variant="raised"
          padding="p-4 sm:p-5"
          className={`min-w-0 xl:order-2 ${can("finance.view") ? "xl:col-span-5" : "xl:col-span-12"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Action Centre</h2>
              <p className="ui-meta mt-1">
                Issues and decisions requiring attention
              </p>
            </div>
            <span className="ui-metric grid size-10 place-items-center rounded-full bg-[var(--bg-subtle)] text-xl">
              {openActionCount}
            </span>
          </div>
          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Action priority counts"
          >
            <span className="ui-badge ui-tone-danger">
              {actionUrgencyCounts.critical} Critical
            </span>
            <span className="ui-badge ui-tone-warning">
              {actionUrgencyCounts.important} Important
            </span>
            <span className="ui-badge ui-tone-neutral">
              {actionUrgencyCounts.routine} Routine
            </span>
          </div>
          {dashboardActions.length ? (
            <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
              {dashboardActions.slice(0, 5).map((action) => (
                <li
                  key={action.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`ui-badge ${action.urgency === "critical" ? "ui-tone-danger" : action.urgency === "important" ? "ui-tone-warning" : "ui-tone-neutral"}`}
                      >
                        {action.urgency}
                      </span>
                      <span className="ui-meta">{action.category}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">
                      {action.title}
                    </p>
                    <p className="ui-meta mt-0.5">{action.detail}</p>
                  </div>
                  <Link
                    href={action.href}
                    className="ui-button ui-button-secondary ui-button-compact shrink-0"
                  >
                    {action.action}{" "}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--bg-subtle)] p-4 text-sm text-[var(--text-secondary)]">
              <CheckCircle2
                className="size-5 shrink-0 text-[var(--brand-accent)]"
                aria-hidden="true"
              />
              Your work queues are clear.
            </div>
          )}
          {dashboardActions.length > 5 && (
            <p className="ui-meta mt-2">
              Showing 5 of {dashboardActions.length} open actions.
            </p>
          )}
          {can("reports.view") && (
            <Link
              href="/reports"
              className="ui-button ui-button-ghost mt-3 px-0 text-[var(--brand-accent)]"
            >
              View all reports{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </Card>
        {can("finance.view") && (
          <Card
            variant="raised"
            padding="p-4 sm:p-5"
            className="min-w-0 xl:order-1 xl:col-span-7"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="ui-section-title">Revenue and gross profit</h3>
                <p className="ui-meta mt-1">
                  Invoiced sales · last six months · KES
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-[var(--bg-subtle)] text-[var(--brand-accent)]">
                <TrendingUp className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div
              className="h-64 w-full"
              role="group"
              aria-label="Monthly invoiced revenue and gross profit for the last six months"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  accessibilityLayer
                  data={recentMonths}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value: number) =>
                      value >= 1000000
                        ? `${(value / 1000000).toFixed(1)}m`
                        : `${Math.round(value / 1000)}k`
                    }
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value == null
                        ? "Not enough cost data"
                        : formatKes(Number(value))
                    }
                    contentStyle={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: 14,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="invoiced"
                    name="Invoiced revenue"
                    stroke="var(--brand-accent)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Gross profit"
                    connectNulls={false}
                    stroke="var(--chart-secondary)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="ui-meta mt-2">
              Gross profit appears only for months where every invoice has
              item-level purchase costs.
            </p>
          </Card>
        )}
      </section>

      <section aria-labelledby="business-insights" className="space-y-3">
        <div>
          <h2 id="business-insights" className="ui-section-title">
            Business insights
          </h2>
          <p className="ui-meta mt-1">
            Operational flow, customer mix, and sourcing commitments
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {can("orders.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="min-w-0 xl:col-span-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="ui-section-title">Order pipeline</h3>
                  <p className="ui-meta mt-1">
                    Current orders by workflow stage
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-full bg-[var(--bg-subtle)] text-[var(--brand-accent)]">
                  <PackageCheck className="size-4" aria-hidden="true" />
                </span>
              </div>
              {orderPipeline.length ? (
                <div
                  className="h-60 w-full"
                  role="group"
                  aria-label="Current order counts by workflow status"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer
                      data={orderPipeline}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
                    >
                      <CartesianGrid
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="status"
                        width={98}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--bg-subtle)" }}
                        contentStyle={{
                          background: "var(--bg-card)",
                          borderColor: "var(--border-subtle)",
                          borderRadius: 14,
                          color: "var(--text-primary)",
                        }}
                      />
                      <Bar
                        dataKey="orders"
                        name="Orders"
                        fill="var(--brand-accent)"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="ui-meta py-12 text-center">
                  No order data is available.
                </p>
              )}
            </Card>
          )}
          {can("deliveries.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className={`min-w-0 ${can("orders.view") ? "xl:col-span-7" : "xl:col-span-12"}`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="ui-section-title">Delivery performance</h3>
                  <p className="ui-meta mt-1">
                    Current delivery runs by outcome
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-full bg-[var(--bg-subtle)] text-[var(--brand-accent)]">
                  <Truck className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div
                className="h-60 w-full"
                role="group"
                aria-label="Delivery run counts by current status"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    accessibilityLayer
                    data={runStatusGroups}
                    margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                  >
                    <CartesianGrid
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="status"
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={52}
                      tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--bg-subtle)" }}
                      contentStyle={{
                        background: "var(--bg-card)",
                        borderColor: "var(--border-subtle)",
                        borderRadius: 14,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Runs"
                      fill="var(--chart-secondary)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="ui-meta mt-2">
                On-time rate is unavailable because delivery records do not
                capture target times.
              </p>
            </Card>
          )}
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="min-w-0 xl:col-span-4"
            >
              <div className="mb-4">
                <h3 className="ui-section-title">Receivables aging</h3>
                <p className="ui-meta mt-1">
                  Outstanding invoices by days past due · KES
                </p>
              </div>
              <div
                className="h-52 w-full"
                role="group"
                aria-label="Outstanding accounts receivable grouped by how long invoices are past due"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    accessibilityLayer
                    data={receivableAging}
                    margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                  >
                    <CartesianGrid
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value: number) =>
                        value >= 1000000
                          ? `${(value / 1000000).toFixed(1)}m`
                          : `${Math.round(value / 1000)}k`
                      }
                      tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatKes(Number(value))}
                      contentStyle={{
                        background: "var(--bg-card)",
                        borderColor: "var(--border-subtle)",
                        borderRadius: 14,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Outstanding balance"
                      stroke="var(--brand-accent)"
                      fill="var(--brand-accent)"
                      fillOpacity={0.16}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {can("finance.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="min-w-0 xl:col-span-4"
            >
              <div className="mb-4">
                <h3 className="ui-section-title">
                  Revenue by customer segment
                </h3>
                <p className="ui-meta mt-1">
                  Invoiced revenue · last six months · KES
                </p>
              </div>
              {segmentRevenue.length ? (
                <div
                  className="h-52 w-full"
                  role="group"
                  aria-label="Invoiced revenue by customer segment for the last six months"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer
                      data={segmentRevenue}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(value: number) =>
                          `${Math.round(value / 1000)}k`
                        }
                        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="segment"
                        width={82}
                        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => formatKes(Number(value))}
                        contentStyle={{
                          background: "var(--bg-card)",
                          borderColor: "var(--border-subtle)",
                          borderRadius: 14,
                          color: "var(--text-primary)",
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="var(--brand-accent)"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="ui-meta py-12 text-center">
                  Not enough invoice data to compare segments.
                </p>
              )}
            </Card>
          )}
          {can("procurement.view") && (
            <Card
              variant="raised"
              padding="p-4 sm:p-5"
              className="min-w-0 xl:col-span-4"
            >
              <div className="mb-4">
                <h3 className="ui-section-title">Procurement commitments</h3>
                <p className="ui-meta mt-1">
                  Open issued purchase orders by sourcing model · KES
                </p>
              </div>
              {procurementBySource.length ? (
                <div
                  className="h-52 w-full"
                  role="group"
                  aria-label="Open purchase order commitments grouped by sourcing model"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer
                      data={procurementBySource}
                      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="source"
                        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value: number) =>
                          `${Math.round(value / 1000)}k`
                        }
                        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => formatKes(Number(value))}
                        contentStyle={{
                          background: "var(--bg-card)",
                          borderColor: "var(--border-subtle)",
                          borderRadius: 14,
                          color: "var(--text-primary)",
                        }}
                      />
                      <Bar
                        dataKey="commitment"
                        name="PO commitment"
                        fill="var(--chart-secondary)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="ui-meta py-12 text-center">
                  No open issued purchase orders to compare.
                </p>
              )}
            </Card>
          )}
        </div>
      </section>
      {!isDriver && relevantQueues.length > 0 && (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title flex items-center gap-2">
              <Sparkles
                className="size-4 text-[var(--brand-accent)]"
                aria-hidden="true"
              />{" "}
              Shift brief
            </h2>
            <button
              type="button"
              onClick={loadBrief}
              disabled={briefStatus === "loading"}
              className="ui-button ui-button-secondary"
            >
              {briefStatus === "loading"
                ? "Generating…"
                : brief
                  ? "Refresh brief"
                  : "Generate brief"}
            </button>
          </div>
          {briefStatus === "error" && (
            <p
              role="alert"
              className="mt-2 text-sm text-[var(--status-danger-fg)]"
            >
              The shift brief could not be loaded. Try again.
            </p>
          )}
          {brief && (
            <div
              className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm"
              aria-live="polite"
            >
              <p className="font-medium">{brief.headline}</p>
              <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
                {brief.priorities.map((priority, index) => (
                  <li key={index}>{priority}</li>
                ))}
              </ul>
              <p>{brief.riskAlert}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

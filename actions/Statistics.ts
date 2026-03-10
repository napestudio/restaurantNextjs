"use server";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";

// =============================================================================
// TYPES
// =============================================================================

export type KpiStats = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalSessions: number;
};

export type RevenueByDay = {
  day: string; // ISO date string "YYYY-MM-DD"
  revenue: number;
  orders: number;
};

export type HourStat = {
  hour: number;
  orders: number;
};

export type TopProduct = {
  productId: string | null;
  name: string;
  units: number;
  revenue: number;
};

export type OrderTypeStat = {
  type: string;
  count: number;
};

export type PaymentMethodStat = {
  method: string;
  amount: number;
  count: number;
};

export type ReservationStat = {
  status: string;
  count: number;
};

export type AllStats = {
  kpi: KpiStats;
  revenueByDay: RevenueByDay[];
  busiestHours: HourStat[];
  topProducts: TopProduct[];
  orderTypes: OrderTypeStat[];
  paymentMethods: PaymentMethodStat[];
  reservations: ReservationStat[];
};

// =============================================================================
// HELPERS
// =============================================================================

function makeCacheKey(
  prefix: string,
  branchId: string,
  from: Date,
  to: Date
): string[] {
  return [
    `stats-${prefix}`,
    branchId,
    from.toISOString().split("T")[0],
    to.toISOString().split("T")[0],
  ];
}

// =============================================================================
// KPI STATS
// =============================================================================

async function _getKpiStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<KpiStats> {
  const [revenueAgg, orderCount, sessionCount, avgRows] = await Promise.all([
    prisma.cashMovement.aggregate({
      where: {
        type: "SALE",
        session: { cashRegister: { branchId } },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),
    prisma.order.count({
      where: {
        branchId,
        status: "COMPLETED",
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.cashRegisterSession.count({
      where: {
        cashRegister: { branchId },
        openedAt: { gte: from, lte: to },
      },
    }),
    prisma.$queryRaw<{ avg_value: number | null }[]>`
      SELECT AVG(order_total) as avg_value
      FROM (
        SELECT o.id, SUM(oi.price * oi.quantity) as order_total
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE o."branchId" = ${branchId}
          AND o.status = 'COMPLETED'
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
        GROUP BY o.id
      ) order_totals
    `,
  ]);

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);
  const avgOrderValue = Number(avgRows[0]?.avg_value ?? 0);

  return {
    totalRevenue,
    totalOrders: orderCount,
    avgOrderValue,
    totalSessions: sessionCount,
  };
}

export async function getKpiStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<KpiStats> {
  return unstable_cache(
    () => _getKpiStats(branchId, from, to),
    makeCacheKey("kpi", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// REVENUE BY DAY
// =============================================================================

type RawRevenueRow = {
  day: Date;
  revenue: Prisma.Decimal;
  orders: bigint;
};

async function _getRevenueByDay(
  branchId: string,
  from: Date,
  to: Date
): Promise<RevenueByDay[]> {
  const rows = await prisma.$queryRaw<RawRevenueRow[]>`
    SELECT
      DATE(cm."createdAt" - INTERVAL '3 hours') as day,
      SUM(cm.amount) as revenue,
      COUNT(DISTINCT cm."orderId") as orders
    FROM "CashMovement" cm
    JOIN "CashRegisterSession" crs ON cm."sessionId" = crs.id
    JOIN "CashRegister" cr ON crs."cashRegisterId" = cr.id
    WHERE cr."branchId" = ${branchId}
      AND cm.type = 'SALE'
      AND cm."createdAt" >= ${from}
      AND cm."createdAt" <= ${to}
    GROUP BY DATE(cm."createdAt" - INTERVAL '3 hours')
    ORDER BY DATE(cm."createdAt" - INTERVAL '3 hours') ASC
  `;

  return rows.map((r) => ({
    day: r.day instanceof Date ? r.day.toISOString().split("T")[0] : String(r.day),
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

export async function getRevenueByDay(
  branchId: string,
  from: Date,
  to: Date
): Promise<RevenueByDay[]> {
  return unstable_cache(
    () => _getRevenueByDay(branchId, from, to),
    makeCacheKey("revenue-day", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// BUSIEST HOURS
// =============================================================================

type RawHourRow = { hour: bigint | number; orders: bigint };

async function _getBusiestHours(
  branchId: string,
  from: Date,
  to: Date
): Promise<HourStat[]> {
  const rows = await prisma.$queryRaw<RawHourRow[]>`
    SELECT
      EXTRACT(HOUR FROM ("createdAt" - INTERVAL '3 hours'))::integer as hour,
      COUNT(*)::integer as orders
    FROM "Order"
    WHERE "branchId" = ${branchId}
      AND status = 'COMPLETED'
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  // Fill in missing hours with 0 so chart is always 24-point
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(Number(r.hour), Number(r.orders));
  }

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orders: map.get(h) ?? 0,
  }));
}

export async function getBusiestHours(
  branchId: string,
  from: Date,
  to: Date
): Promise<HourStat[]> {
  return unstable_cache(
    () => _getBusiestHours(branchId, from, to),
    makeCacheKey("hours", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// TOP PRODUCTS
// =============================================================================

type RawProductRow = {
  productId: string | null;
  name: string;
  units: bigint | number;
  revenue: Prisma.Decimal;
};

async function _getTopProducts(
  branchId: string,
  from: Date,
  to: Date
): Promise<TopProduct[]> {
  const rows = await prisma.$queryRaw<RawProductRow[]>`
    SELECT
      oi."productId",
      oi."itemName" as name,
      SUM(oi.quantity)::integer as units,
      SUM(oi.price * oi.quantity) as revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o."branchId" = ${branchId}
      AND o.status = 'COMPLETED'
      AND o."createdAt" >= ${from}
      AND o."createdAt" <= ${to}
    GROUP BY oi."productId", oi."itemName"
    ORDER BY units DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    units: Number(r.units),
    revenue: Number(r.revenue),
  }));
}

export async function getTopProducts(
  branchId: string,
  from: Date,
  to: Date
): Promise<TopProduct[]> {
  return unstable_cache(
    () => _getTopProducts(branchId, from, to),
    makeCacheKey("products", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// ORDER TYPE DISTRIBUTION
// =============================================================================

async function _getOrderTypeDistribution(
  branchId: string,
  from: Date,
  to: Date
): Promise<OrderTypeStat[]> {
  const rows = await prisma.order.groupBy({
    by: ["type"],
    where: {
      branchId,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    _count: { id: true },
  });

  const labels: Record<string, string> = {
    DINE_IN: "En local",
    TAKE_AWAY: "Para llevar",
    DELIVERY: "Delivery",
  };

  return rows.map((r) => ({
    type: labels[r.type] ?? r.type,
    count: r._count.id,
  }));
}

export async function getOrderTypeDistribution(
  branchId: string,
  from: Date,
  to: Date
): Promise<OrderTypeStat[]> {
  return unstable_cache(
    () => _getOrderTypeDistribution(branchId, from, to),
    makeCacheKey("order-types", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// PAYMENT METHOD STATS
// =============================================================================

async function _getPaymentMethodStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<PaymentMethodStat[]> {
  const rows = await prisma.cashMovement.groupBy({
    by: ["paymentMethod"],
    where: {
      type: "SALE",
      session: { cashRegister: { branchId } },
      createdAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const labels: Record<string, string> = {
    CASH: "Efectivo",
    CARD_DEBIT: "Débito",
    CARD_CREDIT: "Crédito",
    ACCOUNT: "Cuenta",
    TRANSFER: "Transferencia",
    PAYMENT_LINK: "Link de pago",
    QR_CODE: "QR",
  };

  return rows.map((r) => ({
    method: labels[r.paymentMethod] ?? r.paymentMethod,
    amount: Number(r._sum.amount ?? 0),
    count: r._count.id,
  }));
}

export async function getPaymentMethodStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<PaymentMethodStat[]> {
  return unstable_cache(
    () => _getPaymentMethodStats(branchId, from, to),
    makeCacheKey("payment", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// RESERVATION STATS
// =============================================================================

async function _getReservationStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<ReservationStat[]> {
  const rows = await prisma.reservation.groupBy({
    by: ["status"],
    where: {
      branchId,
      date: { gte: from, lte: to },
    },
    _count: { id: true },
  });

  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    SEATED: "Sentada",
    COMPLETED: "Completada",
    CANCELED: "Cancelada",
    NO_SHOW: "No se presentó",
  };

  return rows.map((r) => ({
    status: labels[r.status] ?? r.status,
    count: r._count.id,
  }));
}

export async function getReservationStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<ReservationStat[]> {
  return unstable_cache(
    () => _getReservationStats(branchId, from, to),
    makeCacheKey("reservations", branchId, from, to),
    { revalidate: 60 }
  )();
}

// =============================================================================
// ALL STATS (parallel fetch)
// =============================================================================

export async function getAllStats(
  branchId: string,
  from: Date,
  to: Date
): Promise<AllStats> {
  const [kpi, revenueByDay, busiestHours, topProducts, orderTypes, paymentMethods, reservations] =
    await Promise.all([
      getKpiStats(branchId, from, to),
      getRevenueByDay(branchId, from, to),
      getBusiestHours(branchId, from, to),
      getTopProducts(branchId, from, to),
      getOrderTypeDistribution(branchId, from, to),
      getPaymentMethodStats(branchId, from, to),
      getReservationStats(branchId, from, to),
    ]);

  return {
    kpi,
    revenueByDay,
    busiestHours,
    topProducts,
    orderTypes,
    paymentMethods,
    reservations,
  };
}

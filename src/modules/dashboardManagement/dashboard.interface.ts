import type { OrderStatus, PaymentMethod, PaymentStatus, ProductStatus } from "@prisma/client";

import type { DashboardQueryInput } from "./dashboard.validation";

export type DashboardQuery = DashboardQueryInput;
export type DashboardRangeKey = NonNullable<DashboardQuery["range"]>;
export type DashboardSortOrder = NonNullable<DashboardQuery["sortOrder"]>;
export type DashboardSortField = NonNullable<DashboardQuery["sortBy"]>;

export interface DashboardRangeWindow {
  range: DashboardRangeKey;
  from: Date;
  to: Date;
  label: string;
}

export interface DashboardRevenueAnalytics {
  range: DashboardRangeWindow;

  // Overall Statistics
  totalCustomerSales: number;
  totalProductSellingAmount: number;
  totalProductCost: number;
  totalCourierCost: number;
  totalNetProfit: number;
  totalDeliveredOrders: number;
  totalQuantitySold: number;

  // Today Statistics
  todayCustomerSales: number;
  todayProductSellingAmount: number;
  todayProductCost: number;
  todayCourierCost: number;
  todayNetProfit: number;
  todayDeliveredOrders: number;
  todayQuantitySold: number;

  // Backward-compatible fields
  grossSales: number;
  netProfit: number;
  productCost: number;
  courierProfit: number;
  courierServiceCost: number;
  todaySales: number;
  todayProfit: number;
  todayCost: number;
  todayQuantity: number;
  totalRevenue: number;
  todayRevenue: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  selectedRevenue: number;
}

export interface DashboardOrderStatusStat {
  status: OrderStatus;
  totalOrders: number;
}

export interface DashboardOrderMonthStat {
  month: string;
  totalOrders: number;
}

export interface DashboardOrderPaymentMethodStat {
  method: PaymentMethod;
  totalOrders: number;
}

export interface DashboardOrderShippingMethodStat {
  shippingMethod: string;
  totalOrders: number;
}

export interface DashboardOrderAnalytics {
  range: DashboardRangeWindow;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  packedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  ordersByStatus: DashboardOrderStatusStat[];
  ordersByMonth: DashboardOrderMonthStat[];
  ordersByPaymentMethod: DashboardOrderPaymentMethodStat[];
  ordersByShippingMethod: DashboardOrderShippingMethodStat[];
}

export interface DashboardProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
}

export interface DashboardCustomerGrowthChartPoint {
  label: string;
  totalCustomers: number;
}

export interface DashboardCustomerAnalytics {
  range: DashboardRangeWindow;
  totalCustomers: number;
  todayCustomers: number;
  weeklyCustomers: number;
  monthlyCustomers: number;
  yearlyCustomers: number;
  growthChart: DashboardCustomerGrowthChartPoint[];
}

export interface DashboardPaymentStatusStat {
  status: PaymentStatus;
  totalPayments: number;
}

export interface DashboardPaymentMethodStat {
  method: PaymentMethod;
  totalPayments: number;
}

export interface DashboardPaymentAnalytics {
  range: DashboardRangeWindow;
  totalPayments: number;
  pendingPayments: number;
  paidPayments: number;
  failedPayments: number;
  cancelledPayments: number;
  refundedPayments: number;
  totalRefundAmount?: number;
  refundedAmount?: number;
  totalPaidAmount?: number;
  paymentsByStatus: DashboardPaymentStatusStat[];
  paymentsByMethod: DashboardPaymentMethodStat[];
}

export interface DashboardCouponSummary {
  totalCoupons: number;
}

export interface DashboardShippingSummary {
  totalShippingMethods: number;
  activeShippingMethods: number;
  inactiveShippingMethods: number;
}

export interface DashboardOverview {
  generatedAt: Date;
  revenue: DashboardRevenueAnalytics;
  orders: DashboardOrderAnalytics;
  products: DashboardProductSummary;
  customers: DashboardCustomerAnalytics;
  payments: DashboardPaymentAnalytics;
  coupons: DashboardCouponSummary;
  shipping: DashboardShippingSummary;
}

export interface DashboardRevenueChartPoint {
  label: string;
  revenue: number;
}

export interface DashboardOrdersChartPoint {
  label: string;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  packedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
}

export interface DashboardPaymentChartPoint {
  label: string;
  totalPayments: number;
  pendingPayments: number;
  paidPayments: number;
  failedPayments: number;
  cancelledPayments: number;
  refundedPayments: number;
}

export interface DashboardCharts {
  range: DashboardRangeWindow;
  revenueChart: DashboardRevenueChartPoint[];
  ordersChart: DashboardOrdersChartPoint[];
  paymentChart: DashboardPaymentChartPoint[];
  customerGrowthChart: DashboardCustomerGrowthChartPoint[];
}

export interface DashboardRecentOrderItem {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  orderStatus: OrderStatus;
  createdAt: Date;
}

export interface DashboardRecentCustomerItem {
  name: string;
  email: string;
  registrationDate: Date;
}

export interface DashboardTopSellingProductItem {
  productId: string;
  productName: string;
  slug: string;
  thumbnailImage: string;
  soldQuantity: number;
  revenue: number;
}

export interface DashboardRecentPaymentItem {
  customer: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  date: Date;
}

export interface DashboardRecent {
  recentOrders: DashboardRecentOrderItem[];
  recentCustomers: DashboardRecentCustomerItem[];
  topSellingProducts: DashboardTopSellingProductItem[];
  recentPayments: DashboardRecentPaymentItem[];
}
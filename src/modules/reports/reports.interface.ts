export type ReportDateRange =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export type SortByField = "revenue" | "date" | "orders" | "products" | "customers" | "createdAt";

export type SortOrder = "asc" | "desc";

export interface ReportQueryOptions {
  range?: ReportDateRange;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: SortByField;
  sortOrder?: SortOrder;
  format?: ExportFormat;
  status?: string;
  paymentMethod?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SalesReportSummaryProduct {
  productId: string;
  title: string;
  productCode: string;
  soldQuantity: number;
  totalRevenue: number;
}

export interface SalesReportItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  payableAmount: number;
  status: string;
  deliveredAt: string | null;
  createdAt: string;
}

export interface SalesReportResponseData {
  summary: {
    totalSales: number;
    deliveredOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    topSellingProducts: SalesReportSummaryProduct[];
    lowestSellingProducts: SalesReportSummaryProduct[];
  };
  items: SalesReportItem[];
}

export interface RevenueBreakdownPoint {
  period: string;
  revenue: number;
  deliveredOrdersCount: number;
}

export interface RevenueReportItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  payableAmount: number;
  deliveredAt: string | null;
  createdAt: string;
}

export interface RevenueReportResponseData {
  summary: {
    todayRevenue: number;
    yesterdayRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    customDateRangeRevenue: number;
  };
  breakdown: RevenueBreakdownPoint[];
  items: RevenueReportItem[];
}

export interface OrderReportItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  payableAmount: number;
  paymentMethod: string | null;
  createdAt: string;
}

export interface OrderReportResponseData {
  summary: {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    processingOrders: number;
    packedOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
  };
  items: OrderReportItem[];
}

export interface ProductReportItem {
  productId: string;
  title: string;
  productCode: string;
  category: string;
  status: string;
  isFeatured: boolean;
  customerSellPrice: number;
  costPrice: number;
  totalOrdersCount: number;
  soldQuantity: number;
  totalRevenue: number;
  createdAt: string;
}

export interface ProductReportResponseData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    featuredProducts: number;
    bestSellingProducts: SalesReportSummaryProduct[];
    lowestSellingProducts: SalesReportSummaryProduct[];
  };
  items: ProductReportItem[];
}

export interface CustomerReportItem {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  totalOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  registeredAt: string;
}

export interface CustomerReportResponseData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    topCustomers: Array<{
      userId: string;
      name: string;
      email: string;
      totalOrders: number;
      totalSpent: number;
    }>;
  };
  items: CustomerReportItem[];
}

export interface PaymentReportItem {
  paymentId: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  method: string;
  status: string;
  paidAmount: number | null;
  transactionId: string | null;
  createdAt: string;
}

export interface PaymentReportResponseData {
  summary: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
  };
  items: PaymentReportItem[];
}

export interface ShippingReportItem {
  shippingMethodId: string;
  name: string;
  charge: number;
  status: string;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  totalRevenue: number;
}

export interface ShippingReportResponseData {
  summary: {
    shippingMethods: number;
    ordersByShippingMethod: Array<{
      shippingMethodId: string | null;
      name: string;
      totalOrders: number;
      totalDeliveryCharge: number;
    }>;
    deliveredShipments: number;
    returnedShipments: number;
  };
  items: ShippingReportItem[];
}

export interface CouponReportItem {
  couponId: string;
  code: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  usageCount: number;
  totalDiscountGiven: number;
  createdAt: string;
}

export interface CouponReportResponseData {
  summary: {
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    couponUsageCount: number;
    totalDiscountGiven: number;
  };
  items: CouponReportItem[];
}

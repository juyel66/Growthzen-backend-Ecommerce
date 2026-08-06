import type { DeliveryArea, OrderStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";

export interface OrderProductInput {
  productId: string;
  quantity: number;
  size?: string | null;
}

export interface CreateOrderInput {
  products: OrderProductInput[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  userEmail?: string | null;
  paymentMethod?: PaymentMethod | string | null;
  paymentCollected?: boolean;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestAddress?: string | null;
  guestDivision?: string | null;
  guestDistrict?: string | null;
  guestUpazila?: string | null;
  shippingType?: string | null;
  orderNotes?: string | null;
  deliveryArea: DeliveryArea;
  address?: string;
  couponCode?: string | null;
  shippingMethodId?: string | null;
}

export interface CreateOrderRequestUser {
  id: string;
  role: Role;
  email?: string;
}

export interface UpdateOrderStatusInput {
  orderStatus?: OrderStatus;
  status?: OrderStatus;
  paymentStatus?: "PAID" | "UNPAID" | PaymentStatus;
  paymentCollected?: boolean;
  adminNote?: string | null;
  courierServiceCost?: number | null;
  productCost?: number | null;
}

export interface OrderItemView {
  id: string;
  productId: string;
  productCode: string;
  quantity: number;
  size: string | null;
  unitPrice: number;
  purchaseCost?: number;
  totalPrice: number;
  canReview: boolean;
  reviewed: boolean;
  reviewId: string | null;
}

export interface OrderView {
  id: string;
  orderCode: string;
  userId: string | null;
  userEmail: string | null;
  customerEmail: string | null;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus;
  paymentCollected: boolean;
  email: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestAddress: string | null;
  guestDivision: string | null;
  guestDistrict: string | null;
  guestUpazila: string | null;
  shippingType: string | null;
  orderNotes: string | null;
  orderedByRole: Role;
  orderRole: Role;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryArea: DeliveryArea;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  payableAmount: number;
  originalSubtotal: number;
  productDiscount: number;
  categoryDiscount: number;
  specialDiscount: number;
  couponDiscount: number;
  shippingCharge: number;
  taxAmount: number;
  grandTotal: number;
  totalSavings: number;
  finalPayable: number;
  couponCode: string | null;
  couponId: string | null;
  customerPaid?: number | null;
  grossSales?: number | null;
  productSellingTotal?: number | null;
  productCost?: number | null;
  courierServiceCost?: number | null;
  netProfit?: number | null;
  deliveryProfit?: number | null;
  status: OrderStatus;
  items: OrderItemView[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  deliveredAt: Date | null;
  adminNote: string | null;
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId: string | null;
    paidAmount: number | null;
  } | null;
}

export interface OrderListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderListResponse {
  items: OrderView[];
  meta: OrderListMeta;
}

export interface OrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
}

export interface OrderSummaryQueryInput {
  from?: string;
  to?: string;
  status?: string;
}

export interface OrderSummaryResponse {
  totalOrders: number;
  totalSales: number;
  totalProductCost: number;
  totalCourierCost: number;
  totalNetProfit: number;
  todaySales: number;
  todayProfit: number;
}

export interface OrderInvoiceProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  sku: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  title: string;
}

export interface OrderInvoiceView {
  invoiceNo: string;
  invoiceDate: string;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  shipping: {
    address: string;
    district: string;
    division: string;
    shippingType: string;
    shippingArea: string;
  };
  products: OrderInvoiceProduct[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  productCost: number;
  courierCost: number;
  courierProfit: number;
  netProfit: number;
}

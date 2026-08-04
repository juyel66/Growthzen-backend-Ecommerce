import type { PaymentMethod, PaymentStatus, Role } from "@prisma/client";

export interface PaymentUser { id: string; role: Role }
export interface ManualPaymentInput {
  orderId: string;
  paymentMethod: Exclude<PaymentMethod, "COD">;
  senderNumber: string;
  transactionId: string;
  paidAmount: number;
  paymentScreenshot?: string | null;
}
export interface RejectPaymentInput { reason: string }
export interface PaymentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
}
export interface PaymentView {
  id: string;
  orderId: string;
  orderNumber: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentCollected: boolean;
  senderNumber: string | null;
  transactionId: string | null;
  paidAmount: number | null;
  paymentScreenshot: string | null;
  rejectionReason: string | null;
  refundReason: string | null;
  totalAmount: number;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface PaymentListView {
  items: PaymentView[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface UnpaidDeliveredOrderView {
  id: string;
  orderId: string;
  orderNumber: string;
  orderCode: string;
  customer: string;
  customerName: string;
  phone: string;
  customerPhone: string;
  email: string | null;
  customerEmail: string | null;
  shippingArea: string;
  deliveryArea: string;
  fullAddress: string;
  address: string;
  amount: number;
  grandTotal: number;
  payableAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus;
  paymentCollected: boolean;
  deliveryDate: Date | null;
  deliveredAt: Date | null;
  createdDate: Date;
  createdAt: Date;
}


import type { DeliveryArea, PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import type { CommerceProductView } from "../commerce/product-reference";

export interface CheckoutUser { id: string; name: string; email: string; role: Role }
export interface CheckoutInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: string;
  deliveryArea: DeliveryArea;
  paymentMethod: PaymentMethod;
  shippingMethodId?: string;
  couponCode?: string;
}

export interface CheckoutSummaryItem {
  product: CommerceProductView;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
  subtotal: number;
  discount: number;
  total: number;
}

export interface CheckoutSummary {
  products: CheckoutSummaryItem[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  grandTotal: number;
  originalTotal: number;
  finalTotal: number;
  appliedCoupon: { id: string; code: string; discountAmount: number } | null;
  shippingMethod: { id: string | null; name: string; estimatedDeliveryDays: number | null };
}

export interface CheckoutOrderView extends CheckoutSummary {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  deliveryArea: DeliveryArea;
  payment: { id: string; method: PaymentMethod; status: PaymentStatus };
  createdAt: Date;
}

import type { Role } from "@prisma/client";
import type { CommerceProductView } from "../commerce/product-reference";

export interface AddCartItemInput { productId: string; quantity: number }
export interface UpdateCartItemInput { quantity: number }
export interface CartUser { id: string; role: Role }

export interface CartItemView {
  id: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  product: CommerceProductView;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
    discount: number;
    grandTotal: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

import type { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import {
  calculateProductPrice,
  commerceProductSelect,
  getActiveCommerceProduct,
  mapCommerceProduct,
} from "../commerce/product-reference";
import type { AddCartItemInput, CartItemView, CartUser, CartView, UpdateCartItemInput } from "./cart.interface";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: { product: { select: commerceProductSelect } },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
const money = (value: number): number => Number(value.toFixed(2));

const mapCart = (cart: CartRecord, user: CartUser): CartView => {
  const items: CartItemView[] = cart.items.map((item) => {
    const price = calculateProductPrice(item.product, user.role);
    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice: price.sellingPrice,
      unitDiscount: price.discount,
      lineSubtotal: money(price.basePrice * item.quantity),
      lineDiscount: money(price.discount * item.quantity),
      lineTotal: money(price.sellingPrice * item.quantity),
      product: mapCommerceProduct(item.product, user.role),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  const subtotal = money(items.reduce((sum, item) => sum + item.lineSubtotal, 0));
  const discount = money(items.reduce((sum, item) => sum + item.lineDiscount, 0));
  return {
    id: cart.id,
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      grandTotal: money(subtotal - discount),
    },
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const getCartRecord = async (userId: string): Promise<CartRecord> => prismaClient.cart.upsert({
  where: { userId },
  create: { userId },
  update: {},
  include: cartInclude,
});

export const addCartItem = async (user: CartUser, payload: AddCartItemInput): Promise<CartView> => {
  await getActiveCommerceProduct(payload.productId);
  await prismaClient.$transaction(async (transaction) => {
    const cart = await transaction.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    await transaction.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: payload.productId } },
      create: { cartId: cart.id, productId: payload.productId, quantity: payload.quantity },
      update: { quantity: { increment: payload.quantity } },
    });
  });
  return mapCart(await getCartRecord(user.id), user);
};

export const getMyCart = async (user: CartUser): Promise<CartView> => mapCart(await getCartRecord(user.id), user);

export const updateCartItem = async (user: CartUser, itemId: string, payload: UpdateCartItemInput): Promise<CartView> => {
  const result = await prismaClient.cartItem.updateMany({
    where: { id: itemId, cart: { userId: user.id } },
    data: { quantity: payload.quantity },
  });
  if (result.count === 0) throw new AppError(404, "Cart item not found");
  return mapCart(await getCartRecord(user.id), user);
};

export const removeCartItem = async (user: CartUser, itemId: string): Promise<CartView> => {
  const result = await prismaClient.cartItem.deleteMany({ where: { id: itemId, cart: { userId: user.id } } });
  if (result.count === 0) throw new AppError(404, "Cart item not found");
  return mapCart(await getCartRecord(user.id), user);
};

export const clearCart = async (user: CartUser): Promise<CartView> => {
  await prismaClient.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  return mapCart(await getCartRecord(user.id), user);
};

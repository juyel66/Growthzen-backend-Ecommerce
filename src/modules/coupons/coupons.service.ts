import type { CouponScope, DiscountType, Prisma, Role } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import { calculateProductPrice, commerceProductSelect } from "../commerce/product-reference";

export interface CouponInput {
  code: string; description?: string | null; discountType: DiscountType; discountValue: number; scope: CouponScope;
  productIds?: string[]; categories?: string[]; startsAt: Date; expiresAt: Date; maximumUsage?: number | null;
  perUserUsageLimit?: number | null; minimumOrderAmount?: number | null; maximumDiscount?: number | null; isActive?: boolean;
}
export type CouponUpdate = Partial<CouponInput>;
const couponInclude = { products: { select: { productId: true } }, _count: { select: { usages: true } } } satisfies Prisma.CouponInclude;
export type CouponRecord = Prisma.CouponGetPayload<{ include: typeof couponInclude }>;
const normalizeCode = (code: string) => code.trim().toUpperCase();

const assertCode = async (code: string, excludeId?: string) => {
  const found = await prismaClient.coupon.findFirst({ where: { code: normalizeCode(code), ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
  if (found) throw new AppError(409, "Coupon code already exists");
};
const assertProducts = async (ids: string[]) => {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const count = await prismaClient.product.count({ where: { id: { in: unique } } });
  if (count !== unique.length) throw new AppError(400, "One or more coupon products do not exist");
};
const mapCoupon = (coupon: CouponRecord) => ({ ...coupon, productIds: coupon.products.map((item) => item.productId), usageCount: coupon._count.usages, products: undefined, _count: undefined });

export const createCoupon = async (input: CouponInput) => {
  await assertCode(input.code); await assertProducts(input.productIds ?? []);
  const { productIds = [], ...data } = input;
  return mapCoupon(await prismaClient.coupon.create({ data: { ...data, code: normalizeCode(input.code), categories: input.scope === "SPECIFIC_CATEGORY" ? input.categories ?? [] : [], products: { create: input.scope === "SPECIFIC_PRODUCT" ? productIds.map((productId) => ({ productId })) : [] } }, include: couponInclude }));
};
export const listCoupons = async () => (await prismaClient.coupon.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: couponInclude })).map(mapCoupon);
export const getCoupon = async (id: string) => { const item = await prismaClient.coupon.findFirst({ where: { id, deletedAt: null }, include: couponInclude }); if (!item) throw new AppError(404, "Coupon not found"); return item; };
export const getCouponView = async (id: string) => mapCoupon(await getCoupon(id));
export const updateCoupon = async (id: string, input: CouponUpdate) => {
  const existing = await getCoupon(id); if (input.code) await assertCode(input.code, id); if (input.productIds) await assertProducts(input.productIds);
  const { productIds, ...fields } = input; const scope = input.scope ?? existing.scope;
  const ids = productIds ?? existing.products.map((item) => item.productId);
  if (scope === "SPECIFIC_PRODUCT" && !ids.length) throw new AppError(400, "At least one product is required for product scope");
  const categories = input.categories ?? existing.categories;
  if (scope === "SPECIFIC_CATEGORY" && !categories.length) throw new AppError(400, "At least one category is required for category scope");
  return mapCoupon(await prismaClient.coupon.update({ where: { id }, data: { ...fields, ...(input.code ? { code: normalizeCode(input.code) } : {}), categories: scope === "SPECIFIC_CATEGORY" ? categories : [], products: { deleteMany: {}, create: scope === "SPECIFIC_PRODUCT" ? ids.map((productId) => ({ productId })) : [] } }, include: couponInclude }));
};
export const deleteCoupon = async (id: string) => { await getCoupon(id); return prismaClient.coupon.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); };

const couponCartSelect = { id: true, items: { select: { quantity: true, product: { select: { ...commerceProductSelect, category: true } } } } } satisfies Prisma.CartSelect;
export type CouponCart = Prisma.CartGetPayload<{ select: typeof couponCartSelect }>;
export const evaluateCoupon = async (coupon: CouponRecord, userId: string, cart: CouponCart, role: Role, database: Prisma.TransactionClient | typeof prismaClient = prismaClient) => {
  const now = new Date();
  if (coupon.deletedAt || !coupon.isActive) throw new AppError(400, "Coupon is inactive");
  if (now < coupon.startsAt) throw new AppError(400, "Coupon is not active yet");
  if (now > coupon.expiresAt) throw new AppError(400, "Coupon has expired");
  if (coupon.maximumUsage !== null && coupon._count.usages >= coupon.maximumUsage) throw new AppError(400, "Coupon usage limit has been exceeded");
  if (coupon.perUserUsageLimit !== null) { const count = await database.couponUsage.count({ where: { couponId: coupon.id, userId } }); if (count >= coupon.perUserUsageLimit) throw new AppError(400, "Your coupon usage limit has been exceeded"); }
  const lines = cart.items.map((item) => ({ item, total: calculateProductPrice(item.product, role).sellingPrice * item.quantity }));
  const originalTotal = Number(lines.reduce((sum, line) => sum + line.total, 0).toFixed(2));
  if (coupon.minimumOrderAmount !== null && originalTotal < coupon.minimumOrderAmount) throw new AppError(400, `Minimum order amount is ${coupon.minimumOrderAmount}`);
  const productIds = new Set(coupon.products.map((item) => item.productId)); const categories = new Set(coupon.categories.map((item) => item.toLowerCase()));
  const eligible = lines.filter(({ item }) => coupon.scope === "ENTIRE_ORDER" || (coupon.scope === "SPECIFIC_PRODUCT" && productIds.has(item.product.id)) || (coupon.scope === "SPECIFIC_CATEGORY" && categories.has((item.product.category ?? "").toLowerCase())));
  if (!eligible.length) throw new AppError(400, "Coupon is not applicable to selected products");
  const eligibleTotal = eligible.reduce((sum, line) => sum + line.total, 0);
  let discount = coupon.discountType === "PERCENTAGE" ? eligibleTotal * coupon.discountValue / 100 : coupon.discountValue;
  if (coupon.maximumDiscount !== null) discount = Math.min(discount, coupon.maximumDiscount);
  discount = Number(Math.min(discount, originalTotal, eligibleTotal).toFixed(2));
  return { couponId: coupon.id, couponCode: coupon.code, originalTotal, discountAmount: discount, finalTotal: Number((originalTotal - discount).toFixed(2)) };
};
export const applyCoupon = async (userId: string, role: Role, code: string) => {
  const [coupon, cart] = await Promise.all([prismaClient.coupon.findFirst({ where: { code: normalizeCode(code), deletedAt: null }, include: couponInclude }), prismaClient.cart.findUnique({ where: { userId }, select: couponCartSelect })]);
  if (!coupon) throw new AppError(404, "Coupon not found"); if (!cart || !cart.items.length) throw new AppError(400, "Your cart is empty");
  const result = await evaluateCoupon(coupon, userId, cart, role); await prismaClient.cart.update({ where: { id: cart.id }, data: { appliedCouponId: coupon.id } }); return result;
};
export const removeCoupon = async (userId: string) => { const cart = await prismaClient.cart.findUnique({ where: { userId }, select: { id: true } }); if (!cart) throw new AppError(404, "Cart not found"); await prismaClient.cart.update({ where: { id: cart.id }, data: { appliedCouponId: null } }); return { removed: true }; };
export { couponInclude, couponCartSelect };

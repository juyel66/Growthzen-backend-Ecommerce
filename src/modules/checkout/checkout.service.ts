import type { DeliveryArea, Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import { calculateProductPrice, commerceProductSelect, mapCommerceProduct } from "../commerce/product-reference";
import { couponInclude, evaluateCoupon, type CouponRecord } from "../coupons/coupons.service";
import type { CheckoutInput, CheckoutOrderView, CheckoutSummary, CheckoutUser } from "./checkout.interface";
import { notifyNewCheckoutOrder } from "./checkout.notification";

const cartSelect = {
  id: true,
  items: { orderBy: { createdAt: "asc" as const }, select: { quantity: true, product: { select: { ...commerceProductSelect, category: true } } } },
  appliedCoupon: { include: couponInclude },
} satisfies Prisma.CartSelect;
type CartSnapshot = Prisma.CartGetPayload<{ select: typeof cartSelect }>;
type Database = Prisma.TransactionClient | typeof prismaClient;
const money = (value: number) => Number(value.toFixed(2));

const validatePaymentMethodSetting = async (method: string, db: Database = prismaClient) => {
  const settings = await db.appSetting.findFirst({
    select: { codEnabled: true, bkashEnabled: true, nagadEnabled: true },
  });

  if (method === "COD" && settings?.codEnabled === false) {
    throw new AppError(400, "Cash On Delivery payment method is currently disabled");
  }
  if (method === "BKASH" && settings?.bkashEnabled === false) {
    throw new AppError(400, "bKash payment method is currently disabled");
  }
  if (method === "NAGAD" && settings?.nagadEnabled === false) {
    throw new AppError(400, "Nagad payment method is currently disabled");
  }
};

const resolveShipping = async (area: DeliveryArea, shippingMethodId?: string, db: Database = prismaClient) => {
  if (shippingMethodId) {
    const method = await db.shippingMethod.findFirst({ where: { id: shippingMethodId, status: "ACTIVE", deletedAt: null } });
    if (!method) throw new AppError(400, "Shipping method is not active or does not exist");
    return {
      id: method.id,
      name: method.name,
      charge: method.charge,
      estimatedDeliveryDays: method.estimatedDeliveryDays,
      freeShippingMinOrderAmount: 0,
    };
  }
  const settings = await db.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      insideDhakaDeliveryCharge: true,
      outsideDhakaDeliveryCharge: true,
      freeShippingMinOrderAmount: true,
      estimatedDeliveryDays: true,
    },
  });

  const baseCharge = area === "INSIDE_DHAKA"
    ? (settings?.insideDhakaDeliveryCharge ?? 60)
    : (settings?.outsideDhakaDeliveryCharge ?? 120);

  return {
    id: null,
    name: area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka",
    charge: baseCharge,
    estimatedDeliveryDays: settings?.estimatedDeliveryDays ?? 3,
    freeShippingMinOrderAmount: settings?.freeShippingMinOrderAmount ?? 2000,
  };
};

const validCart = (cart: CartSnapshot | null) => {
  if (!cart?.items.length) throw new AppError(400, "Your cart is empty");
  const unavailable = cart.items.find((item) => item.product.status !== "ACTIVE");
  if (unavailable) throw new AppError(400, `Product ${unavailable.product.productCode} is not active or available`);
  return cart;
};

const summary = (
  cart: CartSnapshot,
  user: CheckoutUser,
  shipping: Awaited<ReturnType<typeof resolveShipping>>,
  couponDiscount: number
): CheckoutSummary => {
  const products = cart.items.map((item) => {
    const price = calculateProductPrice(item.product, user.role);
    return {
      product: mapCommerceProduct(item.product, user.role),
      quantity: item.quantity,
      unitPrice: price.sellingPrice,
      unitDiscount: price.discount,
      subtotal: money(price.basePrice * item.quantity),
      discount: money(price.discount * item.quantity),
      total: money(price.sellingPrice * item.quantity),
    };
  });
  const subtotal = money(products.reduce((sum, item) => sum + item.subtotal, 0));
  const productDiscount = money(products.reduce((sum, item) => sum + item.discount, 0));
  const discount = money(productDiscount + couponDiscount);

  // Apply Free Shipping Threshold if applicable
  let finalShippingCharge = shipping.charge;
  if (shipping.freeShippingMinOrderAmount > 0 && subtotal >= shipping.freeShippingMinOrderAmount) {
    finalShippingCharge = 0;
  }

  const final = money(subtotal - discount + finalShippingCharge);

  return {
    products,
    totalItems: products.length,
    totalQuantity: products.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discount,
    shippingCharge: money(finalShippingCharge),
    grandTotal: final,
    originalTotal: subtotal,
    finalTotal: final,
    appliedCoupon: cart.appliedCoupon
      ? { id: cart.appliedCoupon.id, code: cart.appliedCoupon.code, discountAmount: couponDiscount }
      : null,
    shippingMethod: {
      id: shipping.id,
      name: shipping.name,
      estimatedDeliveryDays: shipping.estimatedDeliveryDays,
    },
  };
};

const orderNumber = async (db: Prisma.TransactionClient) => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `ORD-${date}-`;
  const last = await db.order.findFirst({
    where: { orderCode: { startsWith: prefix } },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });
  return `${prefix}${String(last ? Number(last.orderCode.slice(prefix.length)) + 1 : 1).padStart(6, "0")}`;
};

export const getCheckoutSummary = async (user: CheckoutUser, area: DeliveryArea, shippingMethodId?: string) => {
  const [cart, shipping] = await Promise.all([
    prismaClient.cart.findUnique({ where: { userId: user.id }, select: cartSelect }),
    resolveShipping(area, shippingMethodId),
  ]);
  const current = validCart(cart);
  const evaluated = current.appliedCoupon ? await evaluateCoupon(current.appliedCoupon, user.id, current, user.role) : null;
  return summary(current, user, shipping, evaluated?.discountAmount ?? 0);
};

const orderInclude = {
  items: { include: { product: { select: commerceProductSelect } } },
  payment: true,
  shippingMethod: true,
  coupon: true,
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const mapOrder = (order: OrderRecord, user: CheckoutUser): CheckoutOrderView => {
  if (!order.payment) throw new AppError(500, "Order payment record is missing");
  const products = order.items.map((item) => ({
    product: mapCommerceProduct(item.product, user.role),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitDiscount: money(item.discountAmount / item.quantity),
    subtotal: money((item.baseUnitPrice ?? item.unitPrice) * item.quantity),
    discount: item.discountAmount,
    total: item.totalPrice,
  }));
  return {
    id: order.id,
    orderNumber: order.orderCode,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.userEmail ?? "",
    customerPhone: order.customerPhone,
    address: order.address,
    deliveryArea: order.deliveryArea,
    payment: { id: order.payment.id, method: order.payment.method, status: order.payment.status },
    products,
    totalItems: products.length,
    totalQuantity: products.reduce((s, i) => s + i.quantity, 0),
    subtotal: order.subtotal,
    discount: order.discountAmount,
    shippingCharge: order.deliveryCharge,
    grandTotal: order.payableAmount,
    originalTotal: order.subtotal,
    finalTotal: order.payableAmount,
    appliedCoupon: order.coupon
      ? { id: order.coupon.id, code: order.coupon.code, discountAmount: order.discountAmount - products.reduce((s, i) => s + i.discount, 0) }
      : null,
    shippingMethod: {
      id: order.shippingMethodId,
      name: order.shippingMethodName ?? "Legacy shipping",
      estimatedDeliveryDays: order.shippingMethod?.estimatedDeliveryDays ?? null,
    },
    createdAt: order.createdAt,
  };
};

export const checkout = async (user: CheckoutUser, payload: CheckoutInput, key: string): Promise<CheckoutOrderView> => {
  await validatePaymentMethodSetting(payload.paymentMethod);

  const scoped = `${user.id}:${key}`;
  const prior = await prismaClient.order.findFirst({
    where: { userId: user.id, idempotencyKey: scoped },
    include: orderInclude,
  });
  if (prior) return mapOrder(prior, user);

  // Pre-fetch shipping options and explicit coupon outside transaction in parallel
  const [shipping, explicitCoupon] = await Promise.all([
    resolveShipping(payload.deliveryArea, payload.shippingMethodId),
    payload.couponCode
      ? prismaClient.coupon.findFirst({
          where: { code: payload.couponCode.trim().toUpperCase(), deletedAt: null },
          include: couponInclude,
        })
      : Promise.resolve(null),
  ]);

  if (payload.couponCode && !explicitCoupon) {
    throw new AppError(404, "Coupon not found");
  }

  let order: OrderRecord | null = null;
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    try {
      order = await prismaClient.$transaction(
        async (db) => {
          const cart = validCart(await db.cart.findUnique({ where: { userId: user.id }, select: cartSelect }));
          const coupon: CouponRecord | null = explicitCoupon || cart.appliedCoupon;
          const evaluated = coupon ? await evaluateCoupon(coupon, user.id, cart, user.role, db) : null;
          if (coupon && !cart.appliedCoupon) Object.assign(cart, { appliedCoupon: coupon });
          const totals = summary(cart, user, shipping, evaluated?.discountAmount ?? 0);
          const estimated = shipping.estimatedDeliveryDays === null ? null : new Date(Date.now() + shipping.estimatedDeliveryDays * 86400000);
          const code = await orderNumber(db);
          const created = await db.order.create({
            data: {
              orderCode: code,
              idempotencyKey: scoped,
              userId: user.id,
              userEmail: user.email,
              customerEmail: payload.customerEmail || user.email || null,
              paymentMethod: payload.paymentMethod || "COD",
              orderedByRole: user.role,
              customerName: payload.customerName,
              customerPhone: payload.customerPhone,
              address: payload.address,
              deliveryArea: payload.deliveryArea,
              subtotal: totals.subtotal,
              discountAmount: totals.discount,
              deliveryCharge: totals.shippingCharge,
              payableAmount: totals.grandTotal,
              originalSubtotal: totals.subtotal,
              productDiscount: money(totals.products.reduce((s, i) => s + i.discount, 0)),
              categoryDiscount: 0,
              specialDiscount: 0,
              couponDiscount: evaluated?.discountAmount ?? 0,
              shippingCharge: totals.shippingCharge,
              taxAmount: 0,
              grandTotal: totals.grandTotal,
              totalSavings: totals.discount,
              finalPayable: totals.grandTotal,
              couponCode: evaluated?.couponCode ?? null,
              couponId: evaluated?.couponId ?? null,
              shippingMethodId: shipping.id,
              shippingMethodName: shipping.name,
              estimatedDeliveryDate: estimated,
              status: "PENDING",
              items: {
                create: cart.items.map((item, index) => ({
                  productId: item.product.id,
                  productCode: item.product.productCode,
                  quantity: item.quantity,
                  baseUnitPrice: totals.products[index].unitPrice + totals.products[index].unitDiscount,
                  unitPrice: totals.products[index].unitPrice,
                  discountAmount: totals.products[index].discount,
                  totalPrice: totals.products[index].total,
                })),
              },
              payment: { create: { method: payload.paymentMethod, status: "PENDING" } },
            },
            include: orderInclude,
          });
          if (evaluated) {
            await db.couponUsage.create({
              data: { couponId: evaluated.couponId, userId: user.id, orderId: created.id, discountAmount: evaluated.discountAmount },
            });
          }
          await db.cart.update({ where: { id: cart.id }, data: { appliedCouponId: null, items: { deleteMany: {} } } });
          return created;
        },
        { timeout: 10000 }
      );
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      const duplicate = await prismaClient.order.findFirst({ where: { userId: user.id, idempotencyKey: scoped }, include: orderInclude });
      if (duplicate) order = duplicate;
      else if (code !== "P2002" && code !== "P2034") throw error;
    }
  }

  if (!order) throw new AppError(409, "Checkout conflicted. Retry with the same Idempotency-Key");
  const view = mapOrder(order, user);
  void notifyNewCheckoutOrder(view).catch((error: unknown) => console.error("Order notification failed", error));
  return view;
};

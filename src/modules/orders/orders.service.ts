import { OrderStatus, type DeliveryArea, type PaymentMethod, type PaymentStatus, type Prisma, type Role } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import { calculateFinalPrice } from "../pricing/pricing.service";
import { evaluateCouponForItems, findCouponByCode, type EvaluationItem } from "../coupons/coupons.service";
import sendEmail from "../../helpers/email";
import {
  getAdminOrderCreatedEmail,
  getCustomerOrderReceivedEmail,
  getOrderStatusUpdateEmail,
} from "../../helpers/emailTemplates";
import { createOrGetInvoice } from "../invoices/invoices.service";
import type {
  CreateOrderInput,
  CreateOrderRequestUser,
  OrderInvoiceView,
  OrderListQuery,
  OrderListResponse,
  OrderSummaryQueryInput,
  OrderSummaryResponse,
  OrderView,
  UpdateOrderStatusInput,
} from "./orders.interface";

const orderInclude = {
  items: {
    select: {
      id: true,
      productId: true,
      productCode: true,
      quantity: true,
      size: true,
      unitPrice: true,
      purchaseCost: true,
      totalPrice: true,
      review: { select: { id: true } },
    },
  },
  payment: { select: { id: true, method: true, status: true, transactionId: true, paidAmount: true } },
} satisfies Prisma.OrderInclude;

const orderCreateInclude = {
  items: {
    select: {
      id: true,
      productId: true,
      productCode: true,
      quantity: true,
      size: true,
      unitPrice: true,
      purchaseCost: true,
      totalPrice: true,
    },
  },
  payment: { select: { id: true, method: true, status: true, transactionId: true, paidAmount: true } },
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

type OrderCreateRecord = Prisma.OrderGetPayload<{
  include: typeof orderCreateInclude;
}>;

type OrderItemRecord = {
  id: string;
  productId: string;
  productCode: string;
  quantity: number;
  size: string | null;
  unitPrice: number;
  purchaseCost?: number;
  totalPrice: number;
  review?: { id: string } | null;
};

type OrderRecordWithItems = {
  id: string;
  orderCode: string;
  userId: string | null;
  userEmail: string | null;
  customerEmail?: string | null;
  paymentMethod?: PaymentMethod;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestAddress?: string | null;
  guestDivision?: string | null;
  guestDistrict?: string | null;
  guestUpazila?: string | null;
  shippingType?: string | null;
  orderNotes?: string | null;
  orderedByRole: Role;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryArea: DeliveryArea;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  payableAmount: number;
  originalSubtotal?: number;
  productDiscount?: number;
  categoryDiscount?: number;
  specialDiscount?: number;
  couponDiscount?: number;
  shippingCharge?: number;
  taxAmount?: number;
  grandTotal?: number;
  totalSavings?: number;
  finalPayable?: number;
  couponCode: string | null;
  couponId?: string | null;
  courierServiceCost?: number | null;
  productCost?: number | null;
  customerPaid?: number | null;
  grossSales?: number | null;
  productSellingTotal?: number | null;
  netProfit?: number | null;
  deliveryProfit?: number | null;
  status: OrderStatus;
  paymentCollected?: boolean;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  deliveredAt: Date | null;
  adminNote: string | null;
  items: OrderItemRecord[];
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId: string | null;
    paidAmount: number | null;
  } | null;
};

const roundToTwo = (value: number): number => Number(value.toFixed(2));

const normalizeText = (value?: string | null): string => value?.trim().toUpperCase() ?? "";

const mapOrderItem = (item: OrderItemRecord, orderStatus: OrderStatus): OrderView["items"][number] => ({
  id: item.id,
  productId: item.productId,
  productCode: item.productCode,
  quantity: item.quantity,
  size: item.size,
  unitPrice: item.unitPrice,
  purchaseCost: item.purchaseCost ?? 0,
  totalPrice: item.totalPrice,
  canReview: orderStatus === "DELIVERED",
  reviewed: Boolean(item.review),
  reviewId: item.review?.id ?? null,
});

const mapOrder = (order: OrderRecordWithItems): OrderView => {
  const currentPaymentStatus: PaymentStatus = order.payment?.status ?? "PENDING";
  const isPaid = currentPaymentStatus === "PAID";

  const originalSubtotal = order.originalSubtotal ?? order.subtotal;
  const productDiscount = order.productDiscount ?? 0;
  const categoryDiscount = order.categoryDiscount ?? 0;
  const specialDiscount = order.specialDiscount ?? 0;
  const couponDiscount = order.couponDiscount ?? 0;
  const shippingCharge = order.shippingCharge ?? order.deliveryCharge;
  const taxAmount = order.taxAmount ?? 0;
  const grandTotal = order.grandTotal ?? order.payableAmount;
  const totalSavings = order.totalSavings ?? order.discountAmount;
  const finalPayable = order.finalPayable ?? order.payableAmount;

  const isDelivered = order.status === "DELIVERED";
  const customerPaid = order.customerPaid ?? (isDelivered ? order.payableAmount : null);
  const grossSales = order.grossSales ?? (isDelivered ? (order.customerPaid ?? order.payableAmount) : null);
  const productSellingTotal = order.productSellingTotal ?? (isDelivered ? order.subtotal : null);
  const productCost = order.productCost ?? null;
  const courierServiceCost = order.courierServiceCost ?? null;
  const netProfit = order.netProfit ?? (isDelivered && customerPaid != null ? roundToTwo(customerPaid - (productCost ?? 0) - (courierServiceCost ?? 0)) : null);

  return {
    id: order.id,
    orderCode: order.orderCode,
    userId: order.userId,
    userEmail: order.userEmail,
    customerEmail: order.customerEmail ?? order.guestEmail ?? order.userEmail ?? null,
    paymentMethod: order.paymentMethod ?? order.payment?.method ?? "COD",
    paymentStatus: currentPaymentStatus,
    paymentCollected: isPaid,
    email: order.customerEmail ?? order.guestEmail ?? order.userEmail ?? null,
    guestName: order.guestName ?? null,
    guestPhone: order.guestPhone ?? null,
    guestEmail: order.guestEmail ?? null,
    guestAddress: order.guestAddress ?? null,
    guestDivision: order.guestDivision ?? null,
    guestDistrict: order.guestDistrict ?? null,
    guestUpazila: order.guestUpazila ?? null,
    shippingType: order.shippingType ?? null,
    orderNotes: order.orderNotes ?? null,
    orderedByRole: order.orderedByRole,
    orderRole: order.orderedByRole,
    customerName: order.customerName || order.guestName || "Customer",
    customerPhone: order.customerPhone || order.guestPhone || "",
    address: order.address || order.guestAddress || "",
    deliveryArea: order.deliveryArea,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    deliveryCharge: order.deliveryCharge,
    payableAmount: order.payableAmount,
    originalSubtotal,
    productDiscount,
    categoryDiscount,
    specialDiscount,
    couponDiscount,
    shippingCharge,
    taxAmount,
    grandTotal,
    totalSavings,
    finalPayable,
    couponCode: order.couponCode,
    couponId: order.couponId ?? null,
    customerPaid,
    grossSales,
    productSellingTotal,
    productCost,
    courierServiceCost,
    netProfit,
    deliveryProfit: order.deliveryProfit ?? null,
    status: order.status,
    items: order.items.map((item) => mapOrderItem(item, order.status)),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt,
    cancelledAt: order.cancelledAt,
    deliveredAt: order.deliveredAt,
    adminNote: order.adminNote,
    payment: order.payment,
  };
};

const getAppliedDeliveryCharge = async (deliveryArea: DeliveryArea): Promise<number> => {
  const settings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      insideDhakaDeliveryCharge: true,
      outsideDhakaDeliveryCharge: true,
    },
  });

  if (!settings) {
    return 0;
  }

  return deliveryArea === "INSIDE_DHAKA" ? settings.insideDhakaDeliveryCharge : settings.outsideDhakaDeliveryCharge;
};

const getCouponSettings = async (): Promise<{ couponCode: string | null; couponActive: boolean; customerDiscountPercentage: number }> => {
  const settings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      couponCode: true,
      couponActive: true,
      customerDiscountPercentage: true,
    },
  });

  return {
    couponCode: settings?.couponCode ?? null,
    couponActive: settings?.couponActive ?? false,
    customerDiscountPercentage: settings?.customerDiscountPercentage ?? 0,
  };
};

const getSellingPrice = (role: Role, customerSellPrice: number, resellerPrice: number): number => {
  if (role === "RESELLER") {
    return resellerPrice;
  }

  return customerSellPrice;
};

const buildOrderSearchFilter = (search?: string): Prisma.OrderWhereInput => {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return {};
  }

  return {
    OR: [
      { orderCode: { contains: normalizedSearch, mode: "insensitive" } },
      { customerName: { contains: normalizedSearch, mode: "insensitive" } },
      { customerPhone: { contains: normalizedSearch, mode: "insensitive" } },
      { customerEmail: { contains: normalizedSearch, mode: "insensitive" } },
      { userEmail: { contains: normalizedSearch, mode: "insensitive" } },
      { guestName: { contains: normalizedSearch, mode: "insensitive" } },
      { guestPhone: { contains: normalizedSearch, mode: "insensitive" } },
      { guestEmail: { contains: normalizedSearch, mode: "insensitive" } },
      { address: { contains: normalizedSearch, mode: "insensitive" } },
      { couponCode: { contains: normalizedSearch, mode: "insensitive" } },
    ],
  };
};

const buildOrderWhere = (query: OrderListQuery): Prisma.OrderWhereInput => ({
  ...buildOrderSearchFilter(query.search),
  ...(query.status ? { status: query.status } : {}),
});

const parseOrderListPagination = (query: OrderListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const assertOrderOwnership = (order: { userId: string | null }, currentUser: CreateOrderRequestUser): void => {
  if (currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN") {
    return;
  }

  if (order.userId !== currentUser.id) {
    throw new AppError(403, "You do not have permission to access this order");
  }
};

const generateOrderCode = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const prefix = `ORD-${dateStr}`;

  const lastOrder = await prismaClient.order.findFirst({
    where: {
      orderCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderCode: "desc",
    },
    select: {
      orderCode: true,
    },
  });

  let nextSeq = 1;
  if (lastOrder && lastOrder.orderCode) {
    const parts = lastOrder.orderCode.split("-");
    const lastSeqStr = parts[parts.length - 1];
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}-${String(nextSeq).padStart(6, "0")}`;
};

export const createOrder = async (payload: CreateOrderInput, currentUser?: CreateOrderRequestUser): Promise<OrderView> => {
  const productIds = [...new Set(payload.products.map((item) => item.productId))];

  const products = await prismaClient.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      costPrice: true,
      attributes: true,
      customerSellPrice: true,
      salePrice: true,
      specialSaleEnabled: true,
      discountEnabled: true,
      resellerPrice: true,
      discountType: true,
      discountValue: true,
      productCode: true,
      category: true,
      categoryRel: { select: { name: true, discountPercentage: true, discountEnabled: true } },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product] as const));
  const orderRole = currentUser?.role ?? "CUSTOMER";

  // Calculate product-level pricing details for each line item
  const lineDetails = payload.products.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError(404, `Product not found for id ${item.productId}`);
    }

    const sizeAttribute = Array.isArray(product.attributes)
      ? product.attributes.find((attribute) => {
        return Boolean(attribute && typeof attribute === "object" && !Array.isArray(attribute)
          && typeof attribute.name === "string" && attribute.name.toLowerCase() === "size");
      })
      : undefined;
    const sizes = sizeAttribute && typeof sizeAttribute === "object" && !Array.isArray(sizeAttribute)
      && Array.isArray(sizeAttribute.values)
      ? sizeAttribute.values.filter((value): value is string => typeof value === "string")
      : [];

    if (sizes.length > 0 && !item.size) {
      throw new AppError(400, `Size is required for product ${item.productId}`);
    }

    if (item.size && sizes.length > 0 && !sizes.includes(item.size)) {
      throw new AppError(400, `Invalid size selected for product ${item.productId}`);
    }

    const calculated = calculateFinalPrice(product, orderRole);
    const baseUnitPrice = calculated.basePrice;
    const unitPrice = calculated.sellingPrice;
    const lineDiscountUnit = calculated.discountAmount;
    const totalPrice = roundToTwo(unitPrice * item.quantity);
    const originalLineTotal = roundToTwo(baseUnitPrice * item.quantity);

    let lineProductDiscount = 0;
    let lineCategoryDiscount = 0;
    let lineSpecialDiscount = 0;

    if (calculated.ruleApplied === "PRODUCT_DISCOUNT") {
      lineProductDiscount = roundToTwo(lineDiscountUnit * item.quantity);
    } else if (calculated.ruleApplied === "CATEGORY_DISCOUNT") {
      lineCategoryDiscount = roundToTwo(lineDiscountUnit * item.quantity);
    } else if (calculated.ruleApplied === "SALE_PRICE") {
      lineSpecialDiscount = roundToTwo(lineDiscountUnit * item.quantity);
    }

    return {
      product,
      quantity: item.quantity,
      size: item.size ?? null,
      baseUnitPrice,
      unitPrice,
      totalPrice,
      originalLineTotal,
      lineProductDiscount,
      lineCategoryDiscount,
      lineSpecialDiscount,
      lineDiscountUnit,
    };
  });

  const originalSubtotal = roundToTwo(lineDetails.reduce((sum, item) => sum + item.originalLineTotal, 0));
  const productDiscount = roundToTwo(lineDetails.reduce((sum, item) => sum + item.lineProductDiscount, 0));
  const categoryDiscount = roundToTwo(lineDetails.reduce((sum, item) => sum + item.lineCategoryDiscount, 0));
  const specialDiscount = roundToTwo(lineDetails.reduce((sum, item) => sum + item.lineSpecialDiscount, 0));
  const subtotalAfterProductDiscounts = roundToTwo(lineDetails.reduce((sum, item) => sum + item.totalPrice, 0));

  const isGuest = !currentUser;
  const guestName = payload.guestName || payload.customerName || null;
  const guestPhone = payload.guestPhone || payload.customerPhone || null;
  const guestEmail = payload.guestEmail || payload.customerEmail || payload.userEmail || null;
  const guestAddress = payload.guestAddress || payload.address || null;
  const guestDivision = payload.guestDivision || null;
  const guestDistrict = payload.guestDistrict || null;
  const guestUpazila = payload.guestUpazila || null;
  const shippingType = payload.shippingType || null;
  const orderNotes = payload.orderNotes || null;

  const customerName = payload.customerName || guestName || "Customer";
  const customerPhone = payload.customerPhone || guestPhone || "";
  const customerEmail = payload.customerEmail || payload.userEmail || payload.guestEmail || (currentUser?.email ?? null);
  const finalAddress = payload.address || [guestAddress, guestUpazila, guestDistrict, guestDivision].filter(Boolean).join(", ");
  const userEmail = isGuest ? customerEmail : (currentUser.email || customerEmail || null);

  const rawPaymentMethod = (payload.paymentMethod || "COD").toUpperCase();
  const validPaymentMethods = ["COD", "BKASH", "NAGAD", "SSLCOMMERZ", "STRIPE", "PAYPAL"] as const;
  const selectedPaymentMethod = (validPaymentMethods.includes(rawPaymentMethod as any) ? rawPaymentMethod : "COD") as PaymentMethod;

  let retries = 5;
  let createdOrder: OrderCreateRecord | null = null;

  while (retries > 0) {
    const orderCode = await generateOrderCode();
    try {
      createdOrder = await prismaClient.$transaction(async (tx) => {
        // 1. Coupon validation from DB inside transaction (Requirements 3 & 4)
        let couponDiscount = 0;
        let couponId: string | null = null;
        let couponCode: string | null = null;

        const normalizedCode = normalizeText(payload.couponCode);
        if (normalizedCode) {
          const coupon = await findCouponByCode(normalizedCode, tx);
          if (!coupon) {
            throw new AppError(404, "Coupon not found");
          }

          const evaluationItems: EvaluationItem[] = lineDetails.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }));

          const evaluated = await evaluateCouponForItems(
            coupon,
            isGuest ? null : currentUser?.id,
            evaluationItems,
            subtotalAfterProductDiscounts,
            tx
          );

          couponDiscount = evaluated.discountAmount;
          couponId = evaluated.couponId;
          couponCode = evaluated.couponCode;
        }

        // 2. Shipping charge resolution inside transaction
        let shippingCharge = 0;
        if (payload.shippingMethodId) {
          const method = await tx.shippingMethod.findFirst({
            where: { id: payload.shippingMethodId, status: "ACTIVE", deletedAt: null },
          });
          if (!method) throw new AppError(400, "Shipping method is not active or does not exist");
          shippingCharge = method.charge;
        } else {
          const settings = await tx.appSetting.findFirst({
            orderBy: { createdAt: "asc" },
            select: {
              insideDhakaDeliveryCharge: true,
              outsideDhakaDeliveryCharge: true,
              freeShippingMinOrderAmount: true,
            },
          });

          const baseCharge = payload.deliveryArea === "INSIDE_DHAKA"
            ? (settings?.insideDhakaDeliveryCharge ?? 60)
            : (settings?.outsideDhakaDeliveryCharge ?? 120);

          const freeShippingMin = settings?.freeShippingMinOrderAmount ?? 0;
          if (freeShippingMin > 0 && subtotalAfterProductDiscounts >= freeShippingMin) {
            shippingCharge = 0;
          } else {
            shippingCharge = baseCharge;
          }
        }
        shippingCharge = roundToTwo(shippingCharge);

        const taxAmount = 0;
        const totalSavings = roundToTwo(productDiscount + categoryDiscount + specialDiscount + couponDiscount);
        const grandTotal = roundToTwo(Math.max(0, originalSubtotal - totalSavings + shippingCharge + taxAmount));
        const finalPayable = grandTotal;

        const subtotal = originalSubtotal;
        const discountAmount = totalSavings;
        const deliveryCharge = shippingCharge;
        const payableAmount = grandTotal;

        // 3. Create order with all financial fields (Requirement 5)
        const newOrder = await tx.order.create({
          data: {
            orderCode,
            userId: isGuest ? null : currentUser.id,
            userEmail,
            customerEmail,
            paymentMethod: selectedPaymentMethod,
            guestName: isGuest ? guestName : (payload.guestName || null),
            guestPhone: isGuest ? guestPhone : (payload.guestPhone || null),
            guestEmail: isGuest ? guestEmail : (payload.guestEmail || null),
            guestAddress: isGuest ? guestAddress : (payload.guestAddress || null),
            guestDivision,
            guestDistrict,
            guestUpazila,
            shippingType,
            orderNotes,
            orderedByRole: orderRole,
            customerName,
            customerPhone,
            address: finalAddress,
            deliveryArea: payload.deliveryArea,
            subtotal,
            discountAmount,
            deliveryCharge,
            payableAmount,
            originalSubtotal,
            productDiscount,
            categoryDiscount,
            specialDiscount,
            couponDiscount,
            shippingCharge,
            taxAmount,
            grandTotal,
            totalSavings,
            finalPayable,
            couponCode,
            couponId,
            shippingMethodId: payload.shippingMethodId ?? null,
            status: "PENDING",
            paymentCollected: payload.paymentCollected ?? true,
            items: {
              create: lineDetails.map((item) => ({
                productId: item.product.id,
                productCode: item.product.productCode,
                quantity: item.quantity,
                size: item.size,
                baseUnitPrice: item.baseUnitPrice,
                unitPrice: item.unitPrice,
                purchaseCost: item.product.costPrice ?? 0,
                discountAmount: item.lineDiscountUnit * item.quantity,
                totalPrice: item.totalPrice,
              })),
            },
            payment: { create: { method: selectedPaymentMethod, status: "PENDING" } },
          },
          include: orderCreateInclude,
        });

        // 4. Create coupon usage record (Requirement 6)
        if (couponId) {
          await tx.couponUsage.create({
            data: {
              couponId,
              userId: isGuest ? null : currentUser?.id ?? null,
              orderId: newOrder.id,
              discountAmount: couponDiscount,
            },
          });
        }

        // 5. Clear customer cart atomically upon successful order creation
        if (!isGuest && currentUser?.id) {
          await tx.cartItem.deleteMany({
            where: {
              cart: {
                userId: currentUser.id,
              },
            },
          });
          await tx.cart.updateMany({
            where: { userId: currentUser.id },
            data: { appliedCouponId: null },
          });
        }

        return newOrder;
      });
      break;
    } catch (error: unknown) {
      const prismaError = error as { code?: string; meta?: { target?: unknown } };
      const target = Array.isArray(prismaError.meta?.target) ? prismaError.meta.target : [];
      if (prismaError.code === "P2002" && target.includes("orderCode")) {
        retries--;
        if (retries === 0) {
          throw new AppError(500, "Failed to generate a unique order code after multiple retries");
        }
        continue;
      }
      throw error;
    }
  }

  if (!createdOrder) {
    throw new AppError(500, "Failed to create order");
  }

  // Trigger emails asynchronously (background) so we do not block order confirmation response
  Promise.resolve().then(async () => {
    try {
      const customerEmailToUse = createdOrder!.userEmail || createdOrder!.guestEmail;

      // 1. Admin Email Notification (Requirement 7)
      const adminHtml = getAdminOrderCreatedEmail({
        orderCode: createdOrder!.orderCode,
        orderDate: createdOrder!.createdAt,
        customerName: createdOrder!.customerName,
        customerPhone: createdOrder!.customerPhone,
        customerEmail: customerEmailToUse,
        customerRole: createdOrder!.userId ? createdOrder!.orderedByRole : "GUEST",
        deliveryArea: createdOrder!.deliveryArea,
        address: createdOrder!.address,
        division: createdOrder!.guestDivision,
        district: createdOrder!.guestDistrict,
        upazila: createdOrder!.guestUpazila,
        shippingType: createdOrder!.shippingType,
        orderNotes: createdOrder!.orderNotes,
        paymentMethod: "COD (Cash On Delivery)",
        items: createdOrder!.items,
        subtotal: createdOrder!.originalSubtotal || createdOrder!.subtotal,
        discountAmount: createdOrder!.totalSavings || createdOrder!.discountAmount,
        deliveryCharge: createdOrder!.shippingCharge || createdOrder!.deliveryCharge,
        payableAmount: createdOrder!.grandTotal || createdOrder!.payableAmount,
        couponCode: createdOrder!.couponCode,
        status: createdOrder!.status,
      });

      const admins = await prismaClient.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { email: true },
      });
      await Promise.allSettled(admins.map((admin) => sendEmail({
        to: admin.email,
        subject: `New Order Received - ${createdOrder!.orderCode}`,
        text: `New order ${createdOrder!.orderCode} received from ${createdOrder!.customerName}.`,
        html: adminHtml,
      })));

      // 2. Customer Order Confirmation Email (Requirement 7 - sent if email provided)
      if (customerEmailToUse) {
        const customerHtml = getCustomerOrderReceivedEmail({
          orderCode: createdOrder!.orderCode,
          orderDate: createdOrder!.createdAt,
          customerName: createdOrder!.customerName,
          customerPhone: createdOrder!.customerPhone,
          customerEmail: customerEmailToUse,
          deliveryArea: createdOrder!.deliveryArea,
          address: createdOrder!.address,
          division: createdOrder!.guestDivision,
          district: createdOrder!.guestDistrict,
          upazila: createdOrder!.guestUpazila,
          shippingType: createdOrder!.shippingType,
          orderNotes: createdOrder!.orderNotes,
          paymentMethod: "COD (Cash On Delivery)",
          items: createdOrder!.items,
          subtotal: createdOrder!.originalSubtotal || createdOrder!.subtotal,
          discountAmount: createdOrder!.totalSavings || createdOrder!.discountAmount,
          deliveryCharge: createdOrder!.shippingCharge || createdOrder!.deliveryCharge,
          couponCode: createdOrder!.couponCode,
          payableAmount: createdOrder!.grandTotal || createdOrder!.payableAmount,
        });

        await sendEmail({
          to: customerEmailToUse,
          subject: `Order Confirmation - ${createdOrder!.orderCode} | GrowthZen Trends`,
          text: `Thank you for your order ${createdOrder!.orderCode}.`,
          html: customerHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send order placement emails:", emailError);
    }
  });

  return mapOrder(createdOrder as any);
};

export const getMyOrders = async (currentUser: CreateOrderRequestUser): Promise<OrderView[]> => {
  const orders = await prismaClient.order.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  return orders.map(mapOrder);
};

export const getOrderById = async (orderId: string, currentUser: CreateOrderRequestUser): Promise<OrderView> => {
  const order = await prismaClient.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderCode: orderId },
      ],
    },
    include: orderInclude,
  });

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  assertOrderOwnership(order, currentUser);

  return mapOrder(order);
};

export const getOrders = async (query: OrderListQuery): Promise<OrderListResponse> => {
  const { page, limit, skip } = parseOrderListPagination(query);
  const where = buildOrderWhere(query);

  const [total, orders] = await Promise.all([
    prismaClient.order.count({ where }),
    prismaClient.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: orderInclude,
    }),
  ]);

  return {
    items: orders.map(mapOrder),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const updateOrderStatus = async (
  orderId: string,
  payload: UpdateOrderStatusInput,
  currentUser?: CreateOrderRequestUser
): Promise<OrderView> => {
  const existingOrder = await prismaClient.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderCode: orderId },
      ],
    },
    include: orderInclude,
  });

  if (!existingOrder) {
    throw new AppError(404, "Order not found");
  }

  const requestedOrderStatus = payload.orderStatus ?? payload.status;
  const rawPaymentStatus = payload.paymentStatus;

  let mappedPaymentStatus: PaymentStatus | undefined = undefined;
  if (rawPaymentStatus) {
    if (rawPaymentStatus === "PAID") {
      mappedPaymentStatus = "PAID";
    } else if (rawPaymentStatus === "UNPAID") {
      mappedPaymentStatus = "PENDING";
    } else {
      mappedPaymentStatus = rawPaymentStatus as PaymentStatus;
    }
  }

  const targetOrderStatus = requestedOrderStatus ?? existingOrder.status;
  const statusChanged = requestedOrderStatus !== undefined && existingOrder.status !== requestedOrderStatus;

  const updatedOrder = await prismaClient.$transaction(async (tx) => {
    const previousOrderStatus = existingOrder.status;
    const previousPaymentStatus = existingOrder.payment?.status ?? "PENDING";
    const newOrderStatus = targetOrderStatus;

    let newPaymentStatus: PaymentStatus = previousPaymentStatus;

    if (mappedPaymentStatus) {
      newPaymentStatus = mappedPaymentStatus;
      const existingPayment = existingOrder.payment ?? await tx.payment.findUnique({ where: { orderId: existingOrder.id } });
      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: mappedPaymentStatus,
            ...(mappedPaymentStatus === "PAID" ? { verifiedAt: new Date(), verifiedById: currentUser?.id ?? null } : {}),
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: existingOrder.id,
            method: existingOrder.paymentMethod,
            status: mappedPaymentStatus,
            ...(mappedPaymentStatus === "PAID" ? { verifiedAt: new Date(), verifiedById: currentUser?.id ?? null } : {}),
          },
        });
      }
    } else if (newOrderStatus === "CANCELLED") {
      const existingPayment = existingOrder.payment ?? await tx.payment.findUnique({ where: { orderId: existingOrder.id } });
      if (existingPayment && existingPayment.status === "PENDING") {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: { status: "CANCELLED" },
        });
        newPaymentStatus = "CANCELLED";
      }
    }

    const orderStatusChanged = previousOrderStatus !== newOrderStatus;
    const paymentStatusChanged = previousPaymentStatus !== newPaymentStatus;

    if (orderStatusChanged || paymentStatusChanged || payload.adminNote !== undefined) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          previousStatus: previousOrderStatus,
          newStatus: newOrderStatus,
          previousPaymentStatus,
          newPaymentStatus,
          changedById: currentUser?.id ?? null,
          adminNote: payload.adminNote ?? null,
        },
      });
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (requestedOrderStatus !== undefined) {
      updateData.status = requestedOrderStatus;
      if (requestedOrderStatus === "CONFIRMED" && previousOrderStatus !== "CONFIRMED") {
        updateData.confirmedAt = new Date();
      } else if (requestedOrderStatus === "CANCELLED" && previousOrderStatus !== "CANCELLED") {
        updateData.cancelledAt = new Date();
      } else if (requestedOrderStatus === "DELIVERED" && previousOrderStatus !== "DELIVERED") {
        updateData.deliveredAt = new Date();
      }
    }

    if (payload.courierServiceCost !== undefined) {
      updateData.courierServiceCost = payload.courierServiceCost;
    }

    if (newOrderStatus === "DELIVERED") {
      const courierServiceCost = payload.courierServiceCost ?? existingOrder.courierServiceCost ?? 0;

      const orderItemsWithProducts = await tx.orderItem.findMany({
        where: { orderId: existingOrder.id },
        include: { product: { select: { costPrice: true } } },
      });

      let productCost = 0;
      for (const item of orderItemsWithProducts) {
        const itemPurchaseCost = (item.purchaseCost && item.purchaseCost > 0)
          ? item.purchaseCost
          : (item.product?.costPrice ?? 0);

        if (!item.purchaseCost || item.purchaseCost === 0) {
          if (itemPurchaseCost > 0) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: { purchaseCost: itemPurchaseCost },
            });
          }
        }

        productCost += itemPurchaseCost * item.quantity;
      }
      productCost = roundToTwo(productCost);

      const customerPaid = roundToTwo(existingOrder.payableAmount);
      const productSellingTotal = roundToTwo(existingOrder.subtotal);
      const grossSales = customerPaid;
      const netProfit = roundToTwo(customerPaid - productCost - courierServiceCost);
      const courierProfit = roundToTwo((existingOrder.deliveryCharge ?? 0) - courierServiceCost);

      updateData.courierServiceCost = courierServiceCost;
      updateData.customerPaid = customerPaid;
      updateData.productSellingTotal = productSellingTotal;
      updateData.productCost = productCost;
      updateData.grossSales = grossSales;
      updateData.deliveryProfit = courierProfit;
      updateData.netProfit = netProfit;
    }

    if (mappedPaymentStatus) {
      updateData.paymentCollected = mappedPaymentStatus === "PAID";
    } else if (payload.paymentCollected !== undefined) {
      updateData.paymentCollected = payload.paymentCollected;
    }

    if (payload.adminNote !== undefined) {
      updateData.adminNote = payload.adminNote;
    }

    const finalUpdatedOrder = await tx.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: orderInclude,
    });

    // Sync any existing Invoice record in DB
    try {
      await tx.invoice.updateMany({
        where: { orderId: existingOrder.id },
        data: {
          paymentStatus: newPaymentStatus,
          orderStatus: newOrderStatus,
          grandTotal: finalUpdatedOrder.payableAmount,
          deliveryCharge: finalUpdatedOrder.deliveryCharge,
          discount: finalUpdatedOrder.discountAmount,
          subtotal: finalUpdatedOrder.subtotal,
        },
      });
    } catch {
      // Ignore if invoice table update fails
    }

    return finalUpdatedOrder;
  });

  if (updatedOrder.status === "DELIVERED") {
    try {
      await createOrGetInvoice(updatedOrder.id);
    } catch {
      // Non-blocking fallback if already generated
    }
  }

  // Trigger status update email asynchronously
  if (statusChanged && updatedOrder.userEmail) {
    Promise.resolve().then(async () => {
      try {
        const emailHtml = getOrderStatusUpdateEmail({
          orderCode: updatedOrder.orderCode,
          items: updatedOrder.items,
          payableAmount: updatedOrder.payableAmount,
          status: updatedOrder.status,
          adminNote: payload.adminNote,
        });

        let subject = "";
        if (updatedOrder.status === "CONFIRMED") {
          subject = `Order Confirmed - ${updatedOrder.orderCode}`;
        } else if (updatedOrder.status === "CANCELLED") {
          subject = `Order Cancelled - ${updatedOrder.orderCode}`;
        } else if (updatedOrder.status === "DELIVERED") {
          subject = `Order Delivered - ${updatedOrder.orderCode}`;
        } else {
          subject = `Order Status Updated - ${updatedOrder.orderCode}`;
        }

        await sendEmail({
          to: updatedOrder.userEmail!,
          subject,
          text: `Your order ${updatedOrder.orderCode} status is now ${updatedOrder.status}.`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Failed to send order status update email:", emailError);
      }
    });
  }

  return mapOrder(updatedOrder);
};

export interface OrderTrackingView {
  orderCode: string;
  status: OrderStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
}

export const trackOrder = async (orderCode: string, phone?: string): Promise<OrderView | OrderTrackingView> => {
  const order = await prismaClient.order.findFirst({
    where: {
      OR: [
        { orderCode },
        { id: orderCode },
      ],
    },
    include: orderInclude,
  });

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  if (phone && phone.trim()) {
    const normalizedPhone = phone.trim();
    const matchesPhone = (order.customerPhone && order.customerPhone.trim() === normalizedPhone) ||
      (order.guestPhone && order.guestPhone.trim() === normalizedPhone);
    if (!matchesPhone) {
      throw new AppError(404, "Order not found or phone number does not match");
    }
    return mapOrder(order);
  }

  return {
    orderCode: order.orderCode,
    status: order.status,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
  };
};

export const cancelOrder = async (orderId: string, currentUser: CreateOrderRequestUser): Promise<OrderView> => {
  const existingOrder = await prismaClient.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderCode: orderId },
      ],
    },
    include: orderInclude,
  });

  if (!existingOrder) {
    throw new AppError(404, "Order not found");
  }

  assertOrderOwnership(existingOrder, currentUser);

  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN" && existingOrder.status !== "PENDING") {
    throw new AppError(400, "Only pending orders can be cancelled");
  }

  return updateOrderStatus(existingOrder.id, { status: "CANCELLED" }, currentUser);
};

const startOfDayDate = (d: Date): Date => {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
};

const endOfDayDate = (d: Date): Date => {
  const res = new Date(d);
  res.setHours(23, 59, 59, 999);
  return res;
};

export const getOrderSummary = async (query: OrderSummaryQueryInput): Promise<OrderSummaryResponse> => {
  const where: Prisma.OrderWhereInput = {};

  if (query.status) {
    const rawStatus = query.status.trim().toUpperCase();
    if (Object.values(OrderStatus).includes(rawStatus as OrderStatus)) {
      where.status = rawStatus as OrderStatus;
    }
  } else {
    where.status = "DELIVERED";
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      if (!isNaN(fromDate.getTime())) {
        where.createdAt.gte = startOfDayDate(fromDate);
      }
    }
    if (query.to) {
      const toDate = new Date(query.to);
      if (!isNaN(toDate.getTime())) {
        where.createdAt.lte = endOfDayDate(toDate);
      }
    }
  }

  const now = new Date();
  const todayWhere: Prisma.OrderWhereInput = {
    ...where,
    createdAt: {
      ...(where.createdAt as Prisma.DateTimeFilter | undefined),
      gte: startOfDayDate(now),
      lte: endOfDayDate(now),
    },
  };

  const [totalOrders, overallAgg, todayAgg] = await Promise.all([
    prismaClient.order.count({ where }),
    prismaClient.order.aggregate({
      where,
      _sum: {
        customerPaid: true,
        payableAmount: true,
        productCost: true,
        courierServiceCost: true,
        netProfit: true,
      },
    }),
    prismaClient.order.aggregate({
      where: todayWhere,
      _sum: {
        customerPaid: true,
        payableAmount: true,
        productCost: true,
        courierServiceCost: true,
        netProfit: true,
      },
    }),
  ]);

  const totalSales = roundToTwo(overallAgg._sum.customerPaid ?? overallAgg._sum.payableAmount ?? 0);
  const totalProductCost = roundToTwo(overallAgg._sum.productCost ?? 0);
  const totalCourierCost = roundToTwo(overallAgg._sum.courierServiceCost ?? 0);
  const totalNetProfit = roundToTwo(totalSales - totalProductCost - totalCourierCost);

  const todaySales = roundToTwo(todayAgg._sum.customerPaid ?? todayAgg._sum.payableAmount ?? 0);
  const todayProductCost = roundToTwo(todayAgg._sum.productCost ?? 0);
  const todayCourierCost = roundToTwo(todayAgg._sum.courierServiceCost ?? 0);
  const todayProfit = roundToTwo(todaySales - todayProductCost - todayCourierCost);

  return {
    totalOrders,
    totalSales,
    totalProductCost,
    totalCourierCost,
    totalNetProfit,
    todaySales,
    todayProfit,
  };
};

export const getOrderInvoice = async (
  orderId: string,
  currentUser?: CreateOrderRequestUser
): Promise<OrderInvoiceView> => {
  const existingOrder = await prismaClient.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderCode: orderId },
      ],
    },
    select: { id: true, userId: true, userEmail: true, customerEmail: true, guestEmail: true, status: true },
  });

  if (!existingOrder) {
    throw new AppError(404, "Order not found");
  }

  if (currentUser) {
    assertOrderOwnership(existingOrder, currentUser);
  }

  return createOrGetInvoice(existingOrder.id);
};

export const cancelMyOrder = cancelOrder;

import type { DeliveryArea, OrderStatus, Prisma, Role } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import { calculateFinalPrice } from "../pricing/pricing.service";
import sendEmail from "../../helpers/email";
import {
  getAdminOrderCreatedEmail,
  getCustomerOrderReceivedEmail,
  getOrderStatusUpdateEmail,
} from "../../helpers/emailTemplates";
import type {
  CreateOrderInput,
  CreateOrderRequestUser,
  OrderListQuery,
  OrderListResponse,
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
  totalPrice: number;
  review?: { id: string } | null;
};

type OrderRecordWithItems = {
  id: string;
  orderCode: string;
  userId: string | null;
  userEmail: string | null;
  orderedByRole: Role;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryArea: DeliveryArea;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  payableAmount: number;
  couponCode: string | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  deliveredAt: Date | null;
  adminNote: string | null;
  items: OrderItemRecord[];
  payment: {
    id: string;
    method: "COD" | "BKASH" | "NAGAD";
    status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
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
  totalPrice: item.totalPrice,
  canReview: orderStatus === "DELIVERED",
  reviewed: Boolean(item.review),
  reviewId: item.review?.id ?? null,
});

const mapOrder = (order: OrderRecordWithItems): OrderView => ({
  id: order.id,
  orderCode: order.orderCode,
  userId: order.userId,
  userEmail: order.userEmail,
  email: order.userEmail,
  orderedByRole: order.orderedByRole,
  orderRole: order.orderedByRole,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  address: order.address,
  deliveryArea: order.deliveryArea,
  subtotal: order.subtotal,
  discountAmount: order.discountAmount,
  deliveryCharge: order.deliveryCharge,
  payableAmount: order.payableAmount,
  couponCode: order.couponCode,
  status: order.status,
  items: order.items.map((item) => mapOrderItem(item, order.status)),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  confirmedAt: order.confirmedAt,
  cancelledAt: order.cancelledAt,
  deliveredAt: order.deliveredAt,
  adminNote: order.adminNote,
  payment: order.payment,
});

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
      { userEmail: { contains: normalizedSearch, mode: "insensitive" } },
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
      attributes: true,
      customerSellPrice: true,
      salePrice: true,
      specialSaleEnabled: true,
      discountEnabled: true,
      resellerPrice: true,
      discountType: true,
      discountValue: true,
      productCode: true,
      categoryRel: { select: { discountPercentage: true, discountEnabled: true } },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product] as const));
  const settings = await getCouponSettings();

  const normalizedCouponCode = normalizeText(payload.couponCode);
  const normalizedSettingsCouponCode = normalizeText(settings.couponCode);
  const couponIsApplied = Boolean(normalizedCouponCode && settings.couponActive && normalizedCouponCode === normalizedSettingsCouponCode);

  const orderRole = currentUser?.role ?? "CUSTOMER";

  const orderItems = payload.products.map((item) => {
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
    const unitPrice = calculated.finalPrice;
    const totalPrice = roundToTwo(unitPrice * item.quantity);

    return {
      productId: product.id,
      productCode: product.productCode,
      quantity: item.quantity,
      size: item.size ?? null,
      unitPrice,
      totalPrice,
    };
  });

  const subtotal = roundToTwo(orderItems.reduce((sum, item) => sum + item.totalPrice, 0));
  const discountAmount = couponIsApplied ? roundToTwo((subtotal * settings.customerDiscountPercentage) / 100) : 0;
  const deliveryCharge = roundToTwo(await getAppliedDeliveryCharge(payload.deliveryArea));
  const payableAmount = roundToTwo(Math.max(0, subtotal - discountAmount + deliveryCharge));

  let retries = 5;
  let createdOrder: OrderCreateRecord | null = null;

  while (retries > 0) {
    const orderCode = await generateOrderCode();
    try {
      createdOrder = await prismaClient.order.create({
        data: {
          orderCode,
          userId: currentUser?.id ?? null,
          userEmail: currentUser?.email ?? null,
          orderedByRole: orderRole,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          address: payload.address,
          deliveryArea: payload.deliveryArea,
          subtotal,
          discountAmount,
          deliveryCharge,
          payableAmount,
          couponCode: couponIsApplied ? normalizedCouponCode : null,
          status: "PENDING",
          items: {
            create: orderItems,
          },
          payment: { create: { method: "COD", status: "PENDING" } },
        },
        include: orderCreateInclude,
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
      // 1. Admin Email Notification
      const adminHtml = getAdminOrderCreatedEmail({
        orderCode: createdOrder!.orderCode,
        customerName: createdOrder!.customerName,
        customerPhone: createdOrder!.customerPhone,
        customerEmail: createdOrder!.userEmail,
        customerRole: createdOrder!.orderedByRole,
        deliveryArea: createdOrder!.deliveryArea,
        address: createdOrder!.address,
        items: createdOrder!.items,
        subtotal: createdOrder!.subtotal,
        discountAmount: createdOrder!.discountAmount,
        deliveryCharge: createdOrder!.deliveryCharge,
        payableAmount: createdOrder!.payableAmount,
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

      // 2. Customer Order Received Email (only if authenticated and email exists)
      if (createdOrder!.userId && createdOrder!.userEmail) {
        const customerHtml = getCustomerOrderReceivedEmail({
          orderCode: createdOrder!.orderCode,
          items: createdOrder!.items,
          subtotal: createdOrder!.subtotal,
          deliveryCharge: createdOrder!.deliveryCharge,
          payableAmount: createdOrder!.payableAmount,
        });

        await sendEmail({
          to: createdOrder!.userEmail,
          subject: `Order Received Successfully - ${createdOrder!.orderCode}`,
          text: `Your order ${createdOrder!.orderCode} has been received successfully.`,
          html: customerHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send order placement emails:", emailError);
    }
  });

  return mapOrder(createdOrder);
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

  const statusChanged = existingOrder.status !== payload.status;

  const updateData: Prisma.OrderUpdateInput = {
    status: payload.status,
    adminNote: payload.adminNote !== undefined ? payload.adminNote : undefined,
  };

  if (statusChanged) {
    if (payload.status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
    } else if (payload.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
    } else if (payload.status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }
  }

  const updatedOrder = await prismaClient.$transaction(async (tx) => {
    if (statusChanged) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          previousStatus: existingOrder.status,
          newStatus: payload.status,
          changedById: currentUser?.id ?? null,
          adminNote: payload.adminNote ?? null,
        },
      });
    }

    return tx.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: orderInclude,
    });
  });

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

export const trackOrder = async (orderCode: string): Promise<OrderTrackingView> => {
  const order = await prismaClient.order.findUnique({
    where: { orderCode },
    select: {
      orderCode: true,
      status: true,
      createdAt: true,
      confirmedAt: true,
      deliveredAt: true,
      cancelledAt: true,
    },
  });

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  return order;
};

export const cancelMyOrder = async (orderId: string, currentUser: CreateOrderRequestUser): Promise<OrderView> => {
  const order = await prismaClient.order.findFirst({
    where: { OR: [{ id: orderId }, { orderCode: orderId }], userId: currentUser.id },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found");
  if (order.status !== "PENDING") throw new AppError(400, "Only pending orders can be cancelled");

  const updated = await prismaClient.$transaction(async (transaction) => {
    await transaction.orderStatusHistory.create({
      data: { orderId: order.id, previousStatus: order.status, newStatus: "CANCELLED", changedById: currentUser.id },
    });
    await transaction.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    return transaction.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      include: orderInclude,
    });
  });
  return mapOrder(updated);
};

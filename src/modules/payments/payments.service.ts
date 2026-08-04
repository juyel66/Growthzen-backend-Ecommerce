import type { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { ManualPaymentInput, PaymentListQuery, PaymentListView, PaymentUser, PaymentView, RejectPaymentInput, UnpaidDeliveredOrderView } from "./payments.interface";

const paymentInclude = { order: { select: { id: true, orderCode: true, userId: true, payableAmount: true, paymentCollected: true } } } satisfies Prisma.PaymentInclude;
type PaymentRecord = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

const mapPayment = (payment: PaymentRecord): PaymentView => ({
  id: payment.id,
  orderId: payment.orderId,
  orderNumber: payment.order.orderCode,
  method: payment.method,
  status: payment.status,
  paymentCollected: payment.order.paymentCollected ?? true,
  senderNumber: payment.senderNumber,
  transactionId: payment.transactionId,
  paidAmount: payment.paidAmount,
  paymentScreenshot: payment.screenshot,
  rejectionReason: payment.rejectionReason,
  refundReason: payment.refundReason,
  totalAmount: payment.order.payableAmount,
  verifiedAt: payment.verifiedAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const isAdmin = (user: PaymentUser): boolean => user.role === "ADMIN" || user.role === "SUPER_ADMIN";

export const submitManualPayment = async (user: PaymentUser, payload: ManualPaymentInput): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findFirst({
    where: { orderId: payload.orderId, order: { userId: user.id } },
    include: paymentInclude,
  });
  if (!payment) throw new AppError(404, "Payment or order not found");
  if (payment.method === "COD") throw new AppError(400, "COD orders do not accept manual transaction information");
  if (payment.method !== payload.paymentMethod) throw new AppError(400, "Payment method does not match the checkout selection");
  if (payment.status === "PAID") throw new AppError(400, "Payment is already paid");
  if (Number(payload.paidAmount.toFixed(2)) !== Number(payment.order.payableAmount.toFixed(2))) {
    throw new AppError(400, "Paid amount must equal the order grand total");
  }
  const duplicate = await prismaClient.payment.findFirst({
    where: { transactionId: payload.transactionId, id: { not: payment.id } },
    select: { id: true },
  });
  if (duplicate) throw new AppError(409, "Transaction ID already exists");

  try {
    const updated = await prismaClient.payment.update({
      where: { id: payment.id },
      data: {
        senderNumber: payload.senderNumber,
        transactionId: payload.transactionId,
        paidAmount: payload.paidAmount,
        screenshot: payload.paymentScreenshot ?? null,
        status: "PENDING",
        rejectionReason: null,
        refundReason: null,
        verifiedAt: null,
        verifiedById: null,
      },
      include: paymentInclude,
    });
    return mapPayment(updated);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") throw new AppError(409, "Transaction ID already exists");
    throw error;
  }
};

export const getPayment = async (user: PaymentUser, paymentId: string): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findFirst({
    where: { id: paymentId, ...(!isAdmin(user) ? { order: { userId: user.id } } : {}) },
    include: paymentInclude,
  });
  if (!payment) throw new AppError(404, "Payment not found");
  return mapPayment(payment);
};

export const approvePayment = async (admin: PaymentUser, paymentId: string): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) throw new AppError(404, "Payment not found");

  if (payment.status === "PAID") {
    return mapPayment(payment);
  }

  const updated = await prismaClient.$transaction(async (tx) => {
    const previousPaymentStatus = payment.status;
    const approved = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", verifiedById: admin.id, verifiedAt: new Date(), rejectionReason: null, refundReason: null },
      include: paymentInclude,
    });

    const order = await tx.order.findUnique({ where: { id: payment.orderId }, select: { id: true, status: true } });
    const orderStatus = order?.status ?? "PENDING";

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentCollected: true,
        ...(orderStatus === "PENDING" ? { status: "CONFIRMED", confirmedAt: new Date() } : {}),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        previousStatus: orderStatus,
        newStatus: orderStatus === "PENDING" ? "CONFIRMED" : orderStatus,
        previousPaymentStatus,
        newPaymentStatus: "PAID",
        changedById: admin.id,
        adminNote: "Payment approved / marked paid",
      },
    });

    return approved;
  });

  return mapPayment(updated);
};

export const rejectPayment = async (admin: PaymentUser, paymentId: string, payload: RejectPaymentInput): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findUnique({ where: { id: paymentId }, select: { id: true, orderId: true, status: true } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (payment.status !== "PENDING") throw new AppError(400, "Only pending payments can be rejected");

  const updated = await prismaClient.$transaction(async (tx) => {
    const previousPaymentStatus = payment.status;
    const rejected = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED", rejectionReason: payload.reason, verifiedById: admin.id, verifiedAt: new Date() },
      include: paymentInclude,
    });

    const order = await tx.order.findUnique({ where: { id: payment.orderId }, select: { status: true } });
    const orderStatus = order?.status ?? "PENDING";

    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentCollected: false },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        previousStatus: orderStatus,
        newStatus: orderStatus,
        previousPaymentStatus,
        newPaymentStatus: "FAILED",
        changedById: admin.id,
        adminNote: payload.reason,
      },
    });

    return rejected;
  });

  return mapPayment(updated);
};

export const listPayments = async (query: PaymentListQuery): Promise<PaymentListView> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where: Prisma.PaymentWhereInput = {
    ...(query.method ? { method: query.method } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      OR: [
        { transactionId: { contains: query.search, mode: "insensitive" } },
        { senderNumber: { contains: query.search, mode: "insensitive" } },
        { order: { orderCode: { contains: query.search, mode: "insensitive" } } },
      ],
    } : {}),
  };
  const [total, payments] = await Promise.all([
    prismaClient.payment.count({ where }),
    prismaClient.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: paymentInclude }),
  ]);
  return { items: payments.map(mapPayment), meta: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 } };
};

export const refundPayment = async (admin: PaymentUser, paymentId: string, payload: RejectPaymentInput): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findUnique({ where: { id: paymentId }, select: { id: true, orderId: true, status: true } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (payment.status !== "PAID") throw new AppError(400, "Only paid payments can be refunded");

  const updated = await prismaClient.$transaction(async (tx) => {
    const previousPaymentStatus = payment.status;
    const refunded = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", refundReason: payload.reason, verifiedById: admin.id, verifiedAt: new Date() },
      include: paymentInclude,
    });

    const order = await tx.order.findUnique({ where: { id: payment.orderId }, select: { status: true } });
    const orderStatus = order?.status ?? "DELIVERED";

    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentCollected: false },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        previousStatus: orderStatus,
        newStatus: orderStatus,
        previousPaymentStatus,
        newPaymentStatus: "REFUNDED",
        changedById: admin.id,
        adminNote: payload.reason,
      },
    });

    return refunded;
  });

  return mapPayment(updated);
};

export const getUnpaidDeliveredOrders = async (): Promise<UnpaidDeliveredOrderView[]> => {
  const orders = await prismaClient.order.findMany({
    where: {
      status: "DELIVERED",
      OR: [
        { payment: { is: null } },
        { payment: { status: "PENDING" } },
        { paymentCollected: false },
      ],
    },
    include: {
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const unpaidDelivered = orders.filter(
    (order) => order.status === "DELIVERED" && (order.payment?.status === "PENDING" || !order.payment || !order.paymentCollected)
  );

  return unpaidDelivered.map((order) => ({
    id: order.id,
    orderId: order.id,
    orderNumber: order.orderCode,
    orderCode: order.orderCode,
    customer: order.customerName,
    customerName: order.customerName,
    phone: order.customerPhone,
    customerPhone: order.customerPhone,
    amount: order.payableAmount,
    grandTotal: order.payableAmount,
    payableAmount: order.payableAmount,
    email: order.customerEmail ?? order.guestEmail ?? order.userEmail ?? null,
    customerEmail: order.customerEmail ?? order.guestEmail ?? order.userEmail ?? null,
    shippingArea: order.deliveryArea,
    deliveryArea: order.deliveryArea,
    fullAddress: order.address,
    address: order.address,
    paymentMethod: order.paymentMethod ?? order.payment?.method ?? "COD",
    paymentStatus: order.payment?.status ?? "PENDING",
    paymentCollected: order.paymentCollected,
    deliveryDate: order.deliveredAt,
    deliveredAt: order.deliveredAt,
    createdDate: order.createdAt,
    createdAt: order.createdAt,
  }));
};

export const markOrderPaymentPaid = async (admin: PaymentUser, orderId: string): Promise<PaymentView> => {
  const order = await prismaClient.order.findFirst({
    where: {
      OR: [{ id: orderId }, { orderCode: orderId }],
    },
    include: { payment: true },
  });

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  const updatedPayment = await prismaClient.$transaction(async (tx) => {
    const previousPaymentStatus = order.payment?.status ?? "PENDING";

    await tx.order.update({
      where: { id: order.id },
      data: { paymentCollected: true },
    });

    let paymentId = order.payment?.id;
    if (!paymentId) {
      const newPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: order.paymentMethod,
          status: "PAID",
          verifiedById: admin.id,
          verifiedAt: new Date(),
        },
      });
      paymentId = newPayment.id;
    } else {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          verifiedById: admin.id,
          verifiedAt: new Date(),
          rejectionReason: null,
          refundReason: null,
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: order.status,
        previousPaymentStatus,
        newPaymentStatus: "PAID",
        changedById: admin.id,
        adminNote: "Marked payment as paid",
      },
    });

    return tx.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });
  });

  if (!updatedPayment) {
    throw new AppError(500, "Failed to update payment");
  }

  return mapPayment(updatedPayment);
};



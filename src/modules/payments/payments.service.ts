import type { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { ManualPaymentInput, PaymentListQuery, PaymentListView, PaymentUser, PaymentView, RejectPaymentInput } from "./payments.interface";

const paymentInclude = { order: { select: { id: true, orderCode: true, userId: true, payableAmount: true } } } satisfies Prisma.PaymentInclude;
type PaymentRecord = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

const mapPayment = (payment: PaymentRecord): PaymentView => ({
  id: payment.id,
  orderId: payment.orderId,
  orderNumber: payment.order.orderCode,
  method: payment.method,
  status: payment.status,
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
  if (payment.status !== "PENDING") throw new AppError(400, "Only pending payments can be approved");
  if (payment.method !== "COD" && (!payment.transactionId || payment.paidAmount === null)) {
    throw new AppError(400, "Manual payment information has not been submitted");
  }
  const updated = await prismaClient.$transaction(async (transaction) => {
    const approved = await transaction.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", verifiedById: admin.id, verifiedAt: new Date(), rejectionReason: null, refundReason: null },
      include: paymentInclude,
    });
    const order = await transaction.order.findUnique({ where: { id: payment.orderId }, select: { status: true } });
    if (order?.status === "PENDING") {
      await transaction.orderStatusHistory.create({
        data: { orderId: payment.orderId, previousStatus: "PENDING", newStatus: "CONFIRMED", changedById: admin.id, adminNote: "Payment approved" },
      });
      await transaction.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    }
    return approved;
  });
  return mapPayment(updated);
};

export const rejectPayment = async (admin: PaymentUser, paymentId: string, payload: RejectPaymentInput): Promise<PaymentView> => {
  const payment = await prismaClient.payment.findUnique({ where: { id: paymentId }, select: { id: true, status: true } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (payment.status !== "PENDING") throw new AppError(400, "Only pending payments can be rejected");
  return mapPayment(await prismaClient.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", rejectionReason: payload.reason, verifiedById: admin.id, verifiedAt: new Date() },
    include: paymentInclude,
  }));
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
  const payment = await prismaClient.payment.findUnique({ where: { id: paymentId }, select: { id: true, status: true } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (payment.status !== "PAID") throw new AppError(400, "Only paid payments can be refunded");
  return mapPayment(await prismaClient.payment.update({
    where: { id: paymentId },
    data: { status: "REFUNDED", refundReason: payload.reason, verifiedById: admin.id, verifiedAt: new Date() },
    include: paymentInclude,
  }));
};

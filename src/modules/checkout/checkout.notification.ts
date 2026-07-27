import prismaClient from "../../config/prisma";
import sendEmail from "../../helpers/email";
import type { CheckoutOrderView } from "./checkout.interface";

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const money = (value: number): string => `৳${value.toFixed(2)}`;

const emailShell = (title: string, body: string): string => `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#17202a"><div style="max-width:680px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden"><div style="padding:24px;background:#17202a;color:#fff"><h1 style="margin:0;font-size:24px">${title}</h1></div><div style="padding:28px">${body}</div></div></body></html>`;

const itemRows = (order: CheckoutOrderView): string => order.products.map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.product.title)}</td><td style="padding:8px;border-bottom:1px solid #eee">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee">${money(item.total)}</td></tr>`).join("");

const adminEmail = (order: CheckoutOrderView): string => {
  const frontend = (process.env.ADMIN_FRONTEND_URL ?? "http://localhost:3000/admin").replace(/\/$/, "");
  const link = `${frontend}/orders/${encodeURIComponent(order.id)}`;
  return emailShell("New Order Received", `<p>A new order requires your attention.</p><table style="width:100%;border-collapse:collapse"><tr><td>Order Number</td><td><strong>${escapeHtml(order.orderNumber)}</strong></td></tr><tr><td>Customer</td><td>${escapeHtml(order.customerName)}</td></tr><tr><td>Email</td><td>${escapeHtml(order.customerEmail)}</td></tr><tr><td>Phone</td><td>${escapeHtml(order.customerPhone)}</td></tr><tr><td>Order Date</td><td>${order.createdAt.toISOString()}</td></tr><tr><td>Payment Method</td><td>${order.payment.method}</td></tr><tr><td>Payment Status</td><td>${order.payment.status}</td></tr><tr><td>Total Amount</td><td>${money(order.grandTotal)}</td></tr><tr><td>Total Items</td><td>${order.totalQuantity}</td></tr></table><p style="margin-top:28px"><a href="${link}" style="background:#1769aa;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">View Order Details</a></p>`);
};

const customerEmail = (order: CheckoutOrderView): string => emailShell("Thank You for Your Order", `<p>Hello ${escapeHtml(order.customerName)},</p><p>We have received order <strong>${escapeHtml(order.orderNumber)}</strong>.</p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Product</th><th align="left">Qty</th><th align="left">Total</th></tr></thead><tbody>${itemRows(order)}</tbody></table><p><strong>Total: ${money(order.grandTotal)}</strong></p><p>Payment: ${order.payment.method}<br>Order status: ${order.status}</p><p>Thank you for shopping with us.</p>`);

export const notifyNewCheckoutOrder = async (order: CheckoutOrderView): Promise<void> => {
  const admins = await prismaClient.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });

  const deliveries = admins.map((admin) => sendEmail({
    to: admin.email,
    subject: `New Order Received - ${order.orderNumber}`,
    text: `New order ${order.orderNumber} from ${order.customerName}. Total ${money(order.grandTotal)}.`,
    html: adminEmail(order),
  }));

  deliveries.push(sendEmail({
    to: order.customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    text: `Thank you. Your order ${order.orderNumber} has been received.`,
    html: customerEmail(order),
  }));

  const results = await Promise.allSettled(deliveries);
  results.forEach((result) => {
    if (result.status === "rejected") console.error("Order email delivery failed", result.reason);
  });
};

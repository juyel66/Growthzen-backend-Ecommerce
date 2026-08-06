import "dotenv/config";
import prismaClient from "./src/config/prisma";
import { createOrGetInvoice, getAllInvoicesService, getPublicInvoiceByToken } from "./src/modules/invoices/invoices.service";

async function runSyncTest() {
  try {
    console.log("Fetching order from DB...");
    const order = await prismaClient.order.findFirst({
      orderBy: { createdAt: "desc" },
      include: { payment: true },
    });

    if (!order) {
      console.log("No orders found!");
      return;
    }

    console.log(`Testing Order ID: ${order.id}, Code: ${order.orderCode}`);
    console.log(`Initial Order Payment Status in DB:`, order.payment?.status ?? "None");

    // Ensure invoice exists
    const invoiceData = await createOrGetInvoice(order.id);
    console.log("Generated/Fetched Invoice verificationToken:", invoiceData.verificationToken);

    // Call GET /invoices list service
    const invoiceList = await getAllInvoicesService({ page: 1, limit: 10, search: order.orderCode });
    const listMatch = invoiceList.data.find(inv => inv.orderId === order.id || inv.orderNumber === order.orderCode);

    // Call GET /public/invoice/:token service
    const publicInvoice = await getPublicInvoiceByToken(invoiceData.verificationToken);

    console.log("\n=== Live Order Values ===");
    console.log("Order Payment Status:", order.payment?.status ?? (order.status === "DELIVERED" ? "PAID" : "PENDING"));
    console.log("Order Status:", order.status);
    console.log("Order Payable Amount (grandTotal):", order.payableAmount);

    console.log("\n=== GET /invoices/:orderId Output ===");
    console.log("Invoice Payment Status:", invoiceData.paymentStatus);
    console.log("Invoice Order Status:", invoiceData.orderStatus);
    console.log("Invoice Grand Total:", invoiceData.grandTotal);

    console.log("\n=== GET /invoices List Item Output ===");
    console.log("List Item Payment Status:", listMatch?.paymentStatus);
    console.log("List Item Order Status:", listMatch?.orderStatus);
    console.log("List Item Grand Total:", listMatch?.grandTotal);

    console.log("\n=== GET /public/invoice/:id Output ===");
    console.log("Public Invoice Payment Status:", publicInvoice.paymentStatus);
    console.log("Public Invoice Order Status:", publicInvoice.orderStatus);
    console.log("Public Invoice Grand Total:", publicInvoice.grandTotal);

    const isSynced =
      invoiceData.paymentStatus === (order.payment?.status ?? (order.status === "DELIVERED" ? "PAID" : "PENDING")) &&
      listMatch?.paymentStatus === (order.payment?.status ?? (order.status === "DELIVERED" ? "PAID" : "PENDING")) &&
      publicInvoice.paymentStatus === (order.payment?.status ?? (order.status === "DELIVERED" ? "PAID" : "PENDING"));

    console.log(`\nSynchronization Verification: ${isSynced ? "✅ SUCCESS - 100% SYNCED" : "❌ FAILED"}`);

  } catch (err) {
    console.error("Error during sync test:", err);
  } finally {
    await prismaClient.$disconnect();
  }
}

runSyncTest();

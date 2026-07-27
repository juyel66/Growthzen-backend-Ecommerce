interface OrderEmailItem {
  productCode: string;
  quantity: number;
  size: string | null;
  unitPrice: number;
  totalPrice: number;
}

interface AdminEmailData {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerRole: string;
  deliveryArea: string;
  address: string;
  items: OrderEmailItem[];
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  payableAmount: number;
  status: string;
}

interface CustomerEmailData {
  orderCode: string;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryCharge: number;
  payableAmount: number;
}

interface StatusEmailData {
  orderCode: string;
  items: OrderEmailItem[];
  payableAmount: number;
  status: string;
  adminNote?: string | null;
}

// Common email shell/layout wrapper
const getEmailWrapper = (title: string, contentHtml: string): string => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #1e293b; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px 24px;">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          This is an automated email from our E-commerce Order Management System.<br/>
          &copy; ${new Date().getFullYear()} E-commerce Inc. All rights reserved.
        </p>
      </div>
    </div>
  </div>
`;

// Helper to format currency
const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

// Helper to render order items table
const renderItemsTable = (items: OrderEmailItem[]): string => {
  const rows = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: #0f172a;">${item.productCode}</td>
      <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: center;">${item.size || "N/A"}</td>
      <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${formatCurrency(item.totalPrice)}</td>
    </tr>
  `
    )
    .join("");

  return `
    <div style="overflow-x: auto; margin-top: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b;">Code</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: center;">Size</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: center;">Qty</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: right;">Unit Price</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

// Template 1: Order Created (Admin Notification)
export const getAdminOrderCreatedEmail = (data: AdminEmailData): string => {
  const contentHtml = `
    <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; line-height: 1.5; color: #475569;">
      A new order has been received and is waiting for review. Below are the order details:
    </p>

    <!-- Info Grid -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Details</h3>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Order Code:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.orderCode}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Name:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Phone:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.customerPhone}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Email:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.customerEmail || "N/A (Guest Order)"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Role:</td>
          <td style="padding: 6px 0; color: #0f172a;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${data.customerRole}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Delivery Area:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.deliveryArea === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Full Address:</td>
          <td style="padding: 6px 0; color: #0f172a; line-height: 1.4;">${data.address}</td>
        </tr>
      </table>
    </div>

    <!-- Products -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Ordered Products</h3>
    ${renderItemsTable(data.items)}

    <!-- Summary -->
    <div style="width: 250px; margin-left: auto; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Discount:</td>
          <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: 600;">-${formatCurrency(data.discountAmount)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 0 12px 0; color: #64748b;">Delivery Charge:</td>
          <td style="padding: 6px 0 12px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.deliveryCharge)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Total Payable:</td>
          <td style="padding: 12px 0 6px 0; text-align: right; font-size: 18px; font-weight: 700; color: #4f46e5;">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 32px;">
      <span style="background-color: #f59e0b; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
        Status: ${data.status}
      </span>
    </div>
  `;
  return getEmailWrapper(`New Order Received - ${data.orderCode}`, contentHtml);
};

// Template 2: Customer Order Received
export const getCustomerOrderReceivedEmail = (data: CustomerEmailData): string => {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700; color: #1e1b4b; text-align: center;">Thank you for your order!</h2>
    <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; line-height: 1.5; color: #475569; text-align: center;">
      Your order has been received successfully. Our team will review your order shortly.
    </p>

    <!-- Info Block -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order Code</span>
      <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${data.orderCode}</div>
    </div>

    <!-- Products -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Order Summary</h3>
    ${renderItemsTable(data.items)}

    <!-- Summary -->
    <div style="width: 250px; margin-left: auto; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 0 12px 0; color: #64748b;">Delivery Charge:</td>
          <td style="padding: 6px 0 12px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.deliveryCharge)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Total Amount:</td>
          <td style="padding: 12px 0 6px 0; text-align: right; font-size: 18px; font-weight: 700; color: #16a34a;">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>
  `;
  return getEmailWrapper(`Order Received Successfully`, contentHtml);
};

// Template 3: Status Updates
export const getOrderStatusUpdateEmail = (data: StatusEmailData): string => {
  let statusTitle = "";
  let statusMessage = "";
  let statusColor = "";
  let statusBg = "";

  switch (data.status) {
    case "CONFIRMED":
      statusTitle = "Order Confirmed";
      statusMessage = "Your order has been confirmed and is now being prepared.";
      statusColor = "#1d4ed8";
      statusBg = "#dbeafe";
      break;
    case "CANCELLED":
      statusTitle = "Order Cancelled";
      statusMessage = "Unfortunately your order has been cancelled.";
      statusColor = "#b91c1c";
      statusBg = "#fee2e2";
      break;
    case "DELIVERED":
      statusTitle = "Order Delivered";
      statusMessage = "Your order has been delivered successfully. Thank you for shopping with us.";
      statusColor = "#047857";
      statusBg = "#d1fae5";
      break;
    default:
      statusTitle = `Order Status Update - ${data.status}`;
      statusMessage = `Your order status has been changed to ${data.status}.`;
      statusColor = "#4b5563";
      statusBg = "#f3f4f6";
  }

  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700; color: #1e1b4b; text-align: center;">${statusTitle}</h2>
    
    <div style="background-color: ${statusBg}; border: 1px solid ${statusColor}40; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: ${statusColor}; font-weight: 600; line-height: 1.5;">
        ${statusMessage}
      </p>
      ${
        data.status === "CANCELLED" && data.adminNote
          ? `<p style="margin-top: 12px; margin-bottom: 0; font-size: 14px; color: #475569; font-weight: 400; text-align: left; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px dashed #e2e8f0;"><strong style="color: #0f172a;">Reason:</strong> ${data.adminNote}</p>`
          : ""
      }
      ${
        data.status !== "CANCELLED" && data.adminNote
          ? `<p style="margin-top: 12px; margin-bottom: 0; font-size: 14px; color: #475569; font-weight: 400; text-align: left; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px dashed #e2e8f0;"><strong style="color: #0f172a;">Note:</strong> ${data.adminNote}</p>`
          : ""
      }
    </div>

    <!-- Info Block -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order Code</span>
      <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${data.orderCode}</div>
    </div>

    <!-- Products -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Order Details</h3>
    ${renderItemsTable(data.items)}

    <!-- Summary -->
    <div style="width: 250px; margin-left: auto; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Total Amount:</td>
          <td style="padding: 12px 0 6px 0; text-align: right; font-size: 18px; font-weight: 700; color: ${statusColor};">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>
  `;
  return getEmailWrapper(statusTitle, contentHtml);
};

interface OrderEmailItem {
  productCode: string;
  quantity: number;
  size: string | null;
  unitPrice: number;
  totalPrice: number;
}

export interface AdminEmailData {
  orderCode: string;
  orderDate?: Date | string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerRole: string;
  deliveryArea: string;
  address: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  shippingType?: string | null;
  orderNotes?: string | null;
  paymentMethod?: string | null;
  items: OrderEmailItem[];
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  payableAmount: number;
  couponCode?: string | null;
  tax?: number;
  status: string;
}

export interface CustomerEmailData {
  orderCode: string;
  orderDate?: Date | string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryArea: string;
  address: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  shippingType?: string | null;
  orderNotes?: string | null;
  paymentMethod?: string | null;
  items: OrderEmailItem[];
  subtotal: number;
  discountAmount?: number;
  deliveryCharge: number;
  couponCode?: string | null;
  tax?: number;
  payableAmount: number;
  estimatedDelivery?: string | null;
}

export interface StatusEmailData {
  orderCode: string;
  items: OrderEmailItem[];
  payableAmount: number;
  status: string;
  adminNote?: string | null;
}

// Helper to format currency
const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

// Common email shell/layout wrapper with GrowthZen Trends branding & logo header
const getEmailWrapper = (title: string, contentHtml: string): string => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #1e293b; margin: 0;">
    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0;">
      
      <!-- Brand Logo & Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #3b82f6;">
        <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 8px; margin-bottom: 12px;">
          <span style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0f172a; text-transform: uppercase;">
            <span style="color: #2563eb;">GrowthZen</span> Trends
          </span>
        </div>
        <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">${title}</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px 24px;">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">GrowthZen Trends</div>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          Support Email: <a href="mailto:support@growthzentrends.com" style="color: #2563eb; text-decoration: none;">support@growthzentrends.com</a> | 
          Support Phone: <a href="tel:+8801700000000" style="color: #2563eb; text-decoration: none;">+8801700000000</a><br/>
          Website: <a href="https://growthzentrends.com" target="_blank" style="color: #2563eb; text-decoration: none;">https://growthzentrends.com</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} GrowthZen Trends. All rights reserved.
        </p>
      </div>
    </div>
  </div>
`;

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
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b;">Product Code</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: center;">Size</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: center;">Qty</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: right;">Unit Price</th>
            <th style="padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

// Template 1: Customer Order Confirmation Email (Requirement 7)
export const getCustomerOrderReceivedEmail = (data: CustomerEmailData): string => {
  const formattedDate = data.orderDate
    ? new Date(data.orderDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const completeAddress = [
    data.address,
    data.upazila,
    data.district,
    data.division,
  ].filter(Boolean).join(", ");

  const contentHtml = `
    <!-- Thank You Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Thank You For Your Order!</h2>
      <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.5;">
        We have received your order and are processing it. Below is your complete order receipt.
      </p>
    </div>

    <!-- Order Summary Badge -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 12px; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Order ID</span>
      <div style="font-size: 22px; font-weight: 800; color: #1e3a8a; margin-top: 4px;">${data.orderCode}</div>
      <div style="font-size: 13px; color: #3b82f6; margin-top: 4px;">Placed on ${formattedDate}</div>
    </div>

    <!-- Customer & Shipping Details -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Customer & Shipping Information</h3>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 38%;">Customer Name:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Phone Number:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.customerPhone}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Email Address:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.customerEmail || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Delivery Area:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${data.deliveryArea === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shipping Type:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.shippingType || (data.deliveryArea === "INSIDE_DHAKA" ? "Standard Inside Dhaka" : "Standard Outside Dhaka")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Complete Address:</td>
          <td style="padding: 6px 0; color: #0f172a; line-height: 1.4;">${completeAddress}</td>
        </tr>
        ${data.orderNotes ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Order Notes:</td>
          <td style="padding: 6px 0; color: #0f172a; font-style: italic;">${data.orderNotes}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;"><span style="background-color: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${data.paymentMethod || "COD (Cash On Delivery)"}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Estimated Delivery:</td>
          <td style="padding: 6px 0; color: #16a34a; font-weight: 600;">${data.estimatedDelivery || (data.deliveryArea === "INSIDE_DHAKA" ? "1-2 Business Days" : "3-5 Business Days")}</td>
        </tr>
      </table>
    </div>

    <!-- Product Table -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Order Items</h3>
    ${renderItemsTable(data.items)}

    <!-- Financial Totals Table -->
    <div style="width: 280px; margin-left: auto; margin-bottom: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shipping Charge:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.deliveryCharge)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Discount:</td>
          <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: 600;">-${formatCurrency(data.discountAmount ?? 0)}</td>
        </tr>
        ${data.couponCode ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Coupon (${data.couponCode}):</td>
          <td style="padding: 6px 0; text-align: right; color: #2563eb; font-weight: 600;">Applied</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Tax:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.tax ?? 0)}</td>
        </tr>
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Grand Total:</td>
          <td style="padding: 10px 0 4px 0; text-align: right; font-size: 18px; font-weight: 800; color: #16a34a;">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- Thank You Note -->
    <div style="text-align: center; margin-top: 32px; padding: 16px; background-color: #f1f5f9; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #334155; font-weight: 600;">
        Thank you for choosing GrowthZen Trends! We appreciate your business.
      </p>
    </div>
  `;
  return getEmailWrapper("Order Confirmation", contentHtml);
};

// Template 2: Admin Order Received Email (Requirement 8)
export const getAdminOrderCreatedEmail = (data: AdminEmailData): string => {
  const formattedDate = data.orderDate
    ? new Date(data.orderDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const completeAddress = [
    data.address,
    data.upazila,
    data.district,
    data.division,
  ].filter(Boolean).join(", ");

  const contentHtml = `
    <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; line-height: 1.5; color: #475569;">
      A new order has been submitted. Below is the complete summary for administrative review and processing:
    </p>

    <!-- Info Grid -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Complete Order & Customer Details</h3>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 38%;">Order ID:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.orderCode}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Order Date:</td>
          <td style="padding: 6px 0; color: #0f172a;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Name:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Phone Number:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.customerPhone}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Email:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.customerEmail || "N/A (Guest Order)"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Customer Type:</td>
          <td style="padding: 6px 0; color: #0f172a;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${data.customerRole || "GUEST"}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Delivery Area:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${data.deliveryArea === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shipping Details:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.shippingType || (data.deliveryArea === "INSIDE_DHAKA" ? "Inside Dhaka Standard" : "Outside Dhaka Standard")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Complete Address:</td>
          <td style="padding: 6px 0; color: #0f172a; line-height: 1.4;">${completeAddress}</td>
        </tr>
        ${data.orderNotes ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Order Notes:</td>
          <td style="padding: 6px 0; color: #0f172a; font-style: italic;">${data.orderNotes}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
          <td style="padding: 6px 0; color: #0f172a;">${data.paymentMethod || "COD"}</td>
        </tr>
      </table>
    </div>

    <!-- Product Table -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Product Table</h3>
    ${renderItemsTable(data.items)}

    <!-- Financial Breakdown & Grand Total -->
    <div style="width: 280px; margin-left: auto; margin-bottom: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Discount:</td>
          <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: 600;">-${formatCurrency(data.discountAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shipping Charge:</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(data.deliveryCharge)}</td>
        </tr>
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Grand Total:</td>
          <td style="padding: 10px 0 4px 0; text-align: right; font-size: 18px; font-weight: 800; color: #2563eb;">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <span style="background-color: #f59e0b; color: #ffffff; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
        Status: ${data.status}
      </span>
    </div>
  `;
  return getEmailWrapper(`New Order Alert - ${data.orderCode}`, contentHtml);
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
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order ID</span>
      <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${data.orderCode}</div>
    </div>

    <!-- Products -->
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Order Details</h3>
    ${renderItemsTable(data.items)}

    <!-- Summary -->
    <div style="width: 250px; margin-left: auto; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Grand Total:</td>
          <td style="padding: 12px 0 6px 0; text-align: right; font-size: 18px; font-weight: 700; color: ${statusColor};">${formatCurrency(data.payableAmount)}</td>
        </tr>
      </table>
    </div>
  `;
  return getEmailWrapper(statusTitle, contentHtml);
};

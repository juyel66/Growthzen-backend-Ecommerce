export interface InvoiceProductSnapshot {
  productId: string;
  productName: string;
  productImage: string | null;
  image: string | null;
  sku: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  title: string;
}

export interface FullInvoiceView {
  invoiceNo: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderCode: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  deliveryStatus: string;
  verificationToken: string;
  verificationUrl: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string;
  phone: string;
  email: string;

  shippingAddress: string;
  address: string;
  district: string;
  division: string;
  shippingType: string;
  shippingArea: string;

  customer: {
    name: string;
    phone: string;
    email: string;
    fullName: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    shippingAddress: string;
    district: string;
    division: string;
    areaType: string;
  };
  shipping: {
    address: string;
    fullAddress: string;
    district: string;
    division: string;
    areaType: string;
    shippingType: string;
    shippingArea: string;
  };
  items: any[];
  products: InvoiceProductSnapshot[];
  productsJson: InvoiceProductSnapshot[];

  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  productCost: number;
  courierCost: number;
  courierProfit: number;
  netProfit: number;
}

export interface PublicInvoiceProductItem {
  productId: string;
  productName: string;
  productImage: string | null;
  image: string | null;
  sku: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  title: string;
}

export interface PublicInvoiceCompanyInfo {
  companyName: string;
  logo: string | null;
  companyLogo?: string | null;
  website: string;
  companyWebsite?: string;
  supportPhone: string;
  supportEmail: string;
  name?: string;
  phone?: string;
}

export interface PublicInvoiceVerificationView {
  verificationToken: string;
  verificationUrl: string;
  qrCodeUrl?: string;

  invoice: {
    invoiceNumber: string;
    invoiceDate: string;
    verificationToken: string;
    qrCodeUrl?: string;
    orderId: string;
    orderCode: string;
    createdAt: string;
  };

  customer: {
    fullName: string;
    phone: string;
    email?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddress: string;
    district: string;
    division: string;
    areaType: string;
    name?: string;
  };

  shipping: {
    fullAddress: string;
    address: string;
    district: string;
    division: string;
    areaType: string;
    shippingType: string;
    shippingArea: string;
  };

  payment: {
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    method?: string;
    status?: string;
  };

  orderStatus: string;

  products: PublicInvoiceProductItem[];

  pricing: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    grandTotal: number;
  };

  totals: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    grandTotal: number;
  };

  summary: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    grandTotal: number;
  };

  company: PublicInvoiceCompanyInfo;

  qr: {
    verificationUrl: string;
    qrCodeUrl?: string;
  };

  companyName?: string;
  companyLogo?: string | null;
  companyWebsite?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  fullAddress?: string;
  district?: string;
  division?: string;
  orderId?: string;
  orderCode?: string;
  shippingType?: string;
  shippingArea?: string;

  invoiceNo?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  orderNumber?: string;
  orderDate?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  discount?: number;
  deliveryCharge?: number;
  grandTotal?: number;
}

export interface GetAllInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  invoiceNumber?: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus?: string;
  orderStatus?: string;
  dateFilter?: "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "custom";
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "invoiceDate" | "grandTotal";
  sortOrder?: "asc" | "desc";
}

export interface AdminInvoiceListItem {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  paymentStatus: string;
  orderStatus: string;
  invoiceDate: string;
  createdAt: string;
  publicInvoiceUrl: string;
  printInvoiceUrl: string;
  verificationToken: string;
}

export interface InvoiceSummaryStats {
  totalInvoices: number;
  totalSales: number;
  totalGrandTotal: number;
  todayInvoices: number;
  todayGrandTotal: number;
}

export interface PaginatedInvoiceResponse {
  summaryStats: InvoiceSummaryStats;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: AdminInvoiceListItem[];
}

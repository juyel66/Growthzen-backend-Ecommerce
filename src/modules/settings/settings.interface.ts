export interface SettingsView {
  id: string;
  insideDhakaDeliveryCharge: number;
  outsideDhakaDeliveryCharge: number;
  customerDiscountPercentage: number;
  couponCode: string | null;
  couponActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSettingsInput {
  insideDhakaDeliveryCharge?: number;
  outsideDhakaDeliveryCharge?: number;
  customerDiscountPercentage?: number;
  couponCode?: string | null;
  couponActive?: boolean;
}
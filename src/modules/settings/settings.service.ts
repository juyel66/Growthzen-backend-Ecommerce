import type { AppSetting } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { SettingsView, UpdateSettingsInput } from "./settings.interface";

const mapSettingsView = (settings: AppSetting): SettingsView => ({
  id: settings.id,
  storeName: settings.storeName,
  companyName: settings.companyName,
  storeLogo: settings.storeLogo,
  favicon: settings.favicon,
  supportEmail: settings.supportEmail,
  supportPhone: settings.supportPhone,
  companyAddress: settings.companyAddress,
  currency: settings.currency,
  currencySymbol: settings.currencySymbol,
  timezone: settings.timezone,
  language: settings.language,
  insideDhakaDeliveryCharge: settings.insideDhakaDeliveryCharge,
  outsideDhakaDeliveryCharge: settings.outsideDhakaDeliveryCharge,
  freeShippingMinOrderAmount: settings.freeShippingMinOrderAmount,
  estimatedDeliveryDays: settings.estimatedDeliveryDays,
  codEnabled: settings.codEnabled,
  bkashEnabled: settings.bkashEnabled,
  nagadEnabled: settings.nagadEnabled,
  merchantName: settings.merchantName,
  merchantNumber: settings.merchantNumber,
  paymentInstructions: settings.paymentInstructions,
  smtpHost: settings.smtpHost,
  smtpPort: settings.smtpPort,
  smtpUsername: settings.smtpUsername,
  hasSmtpPassword: Boolean(settings.smtpPassword && settings.smtpPassword.length > 0),
  senderName: settings.senderName,
  senderEmail: settings.senderEmail,
  maintenanceMode: settings.maintenanceMode,
  maintenanceMessage: settings.maintenanceMessage,
  customerDiscountPercentage: settings.customerDiscountPercentage,
  couponCode: settings.couponCode,
  couponActive: settings.couponActive,
  createdAt: settings.createdAt.toISOString(),
  updatedAt: settings.updatedAt.toISOString(),
});

export const getSettings = async (): Promise<SettingsView> => {
  let settings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!settings) {
    settings = await prismaClient.appSetting.create({
      data: {},
    });
  }

  return mapSettingsView(settings);
};

export const updateSettings = async (payload: UpdateSettingsInput): Promise<SettingsView> => {
  let existingSettings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!existingSettings) {
    existingSettings = await prismaClient.appSetting.create({
      data: {},
    });
  }

  const updatedSettings = await prismaClient.appSetting.update({
    where: { id: existingSettings.id },
    data: {
      ...(payload.storeName !== undefined ? { storeName: payload.storeName } : {}),
      ...(payload.companyName !== undefined ? { companyName: payload.companyName } : {}),
      ...(payload.storeLogo !== undefined ? { storeLogo: payload.storeLogo } : {}),
      ...(payload.favicon !== undefined ? { favicon: payload.favicon } : {}),
      ...(payload.supportEmail !== undefined ? { supportEmail: payload.supportEmail } : {}),
      ...(payload.supportPhone !== undefined ? { supportPhone: payload.supportPhone } : {}),
      ...(payload.companyAddress !== undefined ? { companyAddress: payload.companyAddress } : {}),
      ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
      ...(payload.currencySymbol !== undefined ? { currencySymbol: payload.currencySymbol } : {}),
      ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
      ...(payload.language !== undefined ? { language: payload.language } : {}),
      ...(payload.insideDhakaDeliveryCharge !== undefined ? { insideDhakaDeliveryCharge: payload.insideDhakaDeliveryCharge } : {}),
      ...(payload.outsideDhakaDeliveryCharge !== undefined ? { outsideDhakaDeliveryCharge: payload.outsideDhakaDeliveryCharge } : {}),
      ...(payload.freeShippingMinOrderAmount !== undefined ? { freeShippingMinOrderAmount: payload.freeShippingMinOrderAmount } : {}),
      ...(payload.estimatedDeliveryDays !== undefined ? { estimatedDeliveryDays: payload.estimatedDeliveryDays } : {}),
      ...(payload.codEnabled !== undefined ? { codEnabled: payload.codEnabled } : {}),
      ...(payload.bkashEnabled !== undefined ? { bkashEnabled: payload.bkashEnabled } : {}),
      ...(payload.nagadEnabled !== undefined ? { nagadEnabled: payload.nagadEnabled } : {}),
      ...(payload.merchantName !== undefined ? { merchantName: payload.merchantName } : {}),
      ...(payload.merchantNumber !== undefined ? { merchantNumber: payload.merchantNumber } : {}),
      ...(payload.paymentInstructions !== undefined ? { paymentInstructions: payload.paymentInstructions } : {}),
      ...(payload.smtpHost !== undefined ? { smtpHost: payload.smtpHost } : {}),
      ...(payload.smtpPort !== undefined ? { smtpPort: payload.smtpPort } : {}),
      ...(payload.smtpUsername !== undefined ? { smtpUsername: payload.smtpUsername } : {}),
      ...(payload.smtpPassword !== undefined ? { smtpPassword: payload.smtpPassword } : {}),
      ...(payload.senderName !== undefined ? { senderName: payload.senderName } : {}),
      ...(payload.senderEmail !== undefined ? { senderEmail: payload.senderEmail } : {}),
      ...(payload.maintenanceMode !== undefined ? { maintenanceMode: payload.maintenanceMode } : {}),
      ...(payload.maintenanceMessage !== undefined ? { maintenanceMessage: payload.maintenanceMessage } : {}),
      ...(payload.customerDiscountPercentage !== undefined ? { customerDiscountPercentage: payload.customerDiscountPercentage } : {}),
      ...(payload.couponCode !== undefined ? { couponCode: payload.couponCode } : {}),
      ...(payload.couponActive !== undefined ? { couponActive: payload.couponActive } : {}),
    },
  });

  return mapSettingsView(updatedSettings);
};

export const getCategoryDiscountsSettings = async () => {
  const categories = await prismaClient.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      discountPercentage: true,
      discountEnabled: true,
      status: true,
    },
  });

  return categories;
};

export const updateCategoryDiscountSetting = async (
  categoryId: string,
  payload: { discountPercentage?: number; discountEnabled?: boolean }
) => {
  const category = await prismaClient.category.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  const updated = await prismaClient.category.update({
    where: { id: categoryId },
    data: {
      ...(payload.discountPercentage !== undefined ? { discountPercentage: payload.discountPercentage } : {}),
      ...(payload.discountEnabled !== undefined ? { discountEnabled: payload.discountEnabled } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      discountPercentage: true,
      discountEnabled: true,
      status: true,
    },
  });

  return updated;
};
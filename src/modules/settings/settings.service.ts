import type { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import type { SettingsView, UpdateSettingsInput } from "./settings.interface";

const settingsSelect = {
  id: true,
  insideDhakaDeliveryCharge: true,
  outsideDhakaDeliveryCharge: true,
  customerDiscountPercentage: true,
  couponCode: true,
  couponActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AppSettingSelect;

type SettingsRecord = Prisma.AppSettingGetPayload<{
  select: typeof settingsSelect;
}>;

const mapSettings = (settings: SettingsRecord): SettingsView => ({
  ...settings,
});

const buildSettingsData = (payload: UpdateSettingsInput): Prisma.AppSettingUpdateInput => ({
  ...(payload.insideDhakaDeliveryCharge !== undefined ? { insideDhakaDeliveryCharge: payload.insideDhakaDeliveryCharge } : {}),
  ...(payload.outsideDhakaDeliveryCharge !== undefined ? { outsideDhakaDeliveryCharge: payload.outsideDhakaDeliveryCharge } : {}),
  ...(payload.customerDiscountPercentage !== undefined ? { customerDiscountPercentage: payload.customerDiscountPercentage } : {}),
  ...(payload.couponCode !== undefined ? { couponCode: payload.couponCode } : {}),
  ...(payload.couponActive !== undefined ? { couponActive: payload.couponActive } : {}),
});

export const getSettings = async (): Promise<SettingsView> => {
  const settings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: settingsSelect,
  });

  if (settings) {
    return mapSettings(settings);
  }

  const createdSettings = await prismaClient.appSetting.create({
    data: {},
    select: settingsSelect,
  });

  return mapSettings(createdSettings);
};

export const updateSettings = async (payload: UpdateSettingsInput): Promise<SettingsView> => {
  const existingSettings = await prismaClient.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: settingsSelect,
  });

  if (!existingSettings) {
    const createdSettings = await prismaClient.appSetting.create({
      data: buildSettingsData(payload) as Prisma.AppSettingUncheckedCreateInput,
      select: settingsSelect,
    });

    return mapSettings(createdSettings);
  }

  const updatedSettings = await prismaClient.appSetting.update({
    where: { id: existingSettings.id },
    data: buildSettingsData(payload),
    select: settingsSelect,
  });

  return mapSettings(updatedSettings);
};
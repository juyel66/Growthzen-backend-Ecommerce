import type { Prisma, Role, ShippingMethodStatus } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";

export interface ShippingInput { name: string; charge: number; estimatedDeliveryDays: number; description?: string | null; status?: ShippingMethodStatus }
export type ShippingUpdate = Partial<ShippingInput>;
const isAdmin = (role?: Role): boolean => role === "ADMIN" || role === "SUPER_ADMIN";

const assertUniqueName = async (name: string, excludeId?: string): Promise<void> => {
  const duplicate = await prismaClient.shippingMethod.findFirst({ where: { name: { equals: name, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
  if (duplicate) throw new AppError(409, "Shipping method name already exists");
};

export const createShipping = async (input: ShippingInput) => {
  await assertUniqueName(input.name);
  return prismaClient.shippingMethod.create({ data: { ...input, status: input.status ?? "ACTIVE" } });
};
export const listShipping = async (role?: Role) => prismaClient.shippingMethod.findMany({
  where: { deletedAt: null, ...(!isAdmin(role) ? { status: "ACTIVE" } : {}) }, orderBy: { createdAt: "desc" },
});
export const getShipping = async (id: string, role?: Role) => {
  const item = await prismaClient.shippingMethod.findFirst({ where: { id, deletedAt: null, ...(!isAdmin(role) ? { status: "ACTIVE" } : {}) } });
  if (!item) throw new AppError(404, "Shipping method not found");
  return item;
};
export const updateShipping = async (id: string, input: ShippingUpdate) => {
  await getShipping(id, "ADMIN");
  if (input.name) await assertUniqueName(input.name, id);
  return prismaClient.shippingMethod.update({ where: { id }, data: input as Prisma.ShippingMethodUpdateInput });
};
export const deleteShipping = async (id: string) => {
  await getShipping(id, "ADMIN");
  return prismaClient.shippingMethod.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
};

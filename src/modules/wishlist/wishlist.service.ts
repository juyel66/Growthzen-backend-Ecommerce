import type { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import { commerceProductSelect, getActiveCommerceProduct, mapCommerceProduct } from "../commerce/product-reference";
import type { AddWishlistItemInput, AddWishlistResult, WishlistUser, WishlistView } from "./wishlist.interface";

const wishlistInclude = {
  items: {
    orderBy: { createdAt: "desc" as const },
    include: { product: { select: commerceProductSelect } },
  },
} satisfies Prisma.WishlistInclude;

type WishlistRecord = Prisma.WishlistGetPayload<{ include: typeof wishlistInclude }>;

const mapWishlist = (wishlist: WishlistRecord, user: WishlistUser): WishlistView => ({
  id: wishlist.id,
  items: wishlist.items.map((item) => ({
    id: item.id,
    product: mapCommerceProduct(item.product, user.role),
    createdAt: item.createdAt,
  })),
  totalItems: wishlist.items.length,
  createdAt: wishlist.createdAt,
  updatedAt: wishlist.updatedAt,
});

const getWishlistRecord = async (userId: string): Promise<WishlistRecord> => prismaClient.wishlist.upsert({
  where: { userId },
  create: { userId },
  update: {},
  include: wishlistInclude,
});

export const addWishlistItem = async (user: WishlistUser, payload: AddWishlistItemInput): Promise<AddWishlistResult> => {
  await getActiveCommerceProduct(payload.productId);
  const wishlist = await prismaClient.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  const existing = await prismaClient.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId: payload.productId } },
    select: { id: true },
  });
  if (!existing) {
    await prismaClient.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: payload.productId } },
      create: { wishlistId: wishlist.id, productId: payload.productId },
      update: {},
    });
  }
  return { wishlist: mapWishlist(await getWishlistRecord(user.id), user), alreadyExists: Boolean(existing) };
};

export const getMyWishlist = async (user: WishlistUser): Promise<WishlistView> => mapWishlist(await getWishlistRecord(user.id), user);

export const removeWishlistItem = async (user: WishlistUser, itemId: string): Promise<WishlistView> => {
  const result = await prismaClient.wishlistItem.deleteMany({ where: { id: itemId, wishlist: { userId: user.id } } });
  if (result.count === 0) throw new AppError(404, "Wishlist item not found");
  return mapWishlist(await getWishlistRecord(user.id), user);
};

export const clearWishlist = async (user: WishlistUser): Promise<WishlistView> => {
  await prismaClient.wishlistItem.deleteMany({ where: { wishlist: { userId: user.id } } });
  return mapWishlist(await getWishlistRecord(user.id), user);
};

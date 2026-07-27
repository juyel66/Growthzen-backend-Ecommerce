import type { Role } from "@prisma/client";
import type { CommerceProductView } from "../commerce/product-reference";

export interface AddWishlistItemInput { productId: string }
export interface WishlistUser { id: string; role: Role }
export interface WishlistItemView { id: string; product: CommerceProductView; createdAt: Date }
export interface WishlistView { id: string; items: WishlistItemView[]; totalItems: number; createdAt: Date; updatedAt: Date }
export interface AddWishlistResult { wishlist: WishlistView; alreadyExists: boolean }

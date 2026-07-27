/**
 * Category compatibility boundary.
 * Today categories are administrator-managed strings. A future Category module
 * can resolve IDs/slugs here without changing Product controllers or DTO flow.
 */
export const PRODUCT_CATEGORY_MAX_LENGTH = 100;

export const normalizeProductCategory = (category: string): string => category.trim();

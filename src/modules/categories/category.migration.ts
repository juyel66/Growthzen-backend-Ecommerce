import prismaClient from "../../config/prisma";

export const migrateLegacyProductCategories = async (): Promise<void> => {
  try {
    const unlinkedProducts = await prismaClient.product.findMany({
      where: {
        categoryId: null,
        category: { not: null },
      },
      select: {
        id: true,
        category: true,
      },
    });

    if (unlinkedProducts.length === 0) {
      return;
    }

    console.log(`[Category Migration] Found ${unlinkedProducts.length} unlinked legacy products. Migrating...`);

    const categoryMap = new Map<string, string>();

    for (const prod of unlinkedProducts) {
      if (!prod.category || prod.category.trim().length === 0) continue;

      const catName = prod.category.trim();
      let categoryId = categoryMap.get(catName);

      if (!categoryId) {
        const baseSlug =
          catName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "category";

        let existingCategory = await prismaClient.category.findFirst({
          where: {
            OR: [
              { name: { equals: catName, mode: "insensitive" } },
              { slug: { equals: baseSlug, mode: "insensitive" } },
            ],
          },
        });

        if (!existingCategory) {
          existingCategory = await prismaClient.category.create({
            data: {
              name: catName,
              slug: baseSlug,
              status: "ACTIVE",
            },
          });
        }

        categoryId = existingCategory.id;
        categoryMap.set(catName, categoryId);
      }

      await prismaClient.product.update({
        where: { id: prod.id },
        data: { categoryId },
      });
    }

    console.log("[Category Migration] Completed migration of legacy product categories.");
  } catch (error) {
    console.error("[Category Migration Error]:", error);
  }
};

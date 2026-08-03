const getBaseUrl = (): string => {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, "");
  if (process.env.SERVER_URL) return process.env.SERVER_URL.replace(/\/+$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

export const BASE_URL = getBaseUrl();

/**
 * Normalizes a full or relative image URL to a clean relative path for DB storage.
 * e.g., "http://localhost:5000/uploads/products/thumbnails/123.png" -> "/uploads/products/thumbnails/123.png"
 * e.g., "/uploads/products/thumbnails/123.png" -> "/uploads/products/thumbnails/123.png"
 */
export const toRelativePath = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const uploadsIndex = trimmed.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
      return trimmed.substring(uploadsIndex);
    }
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/${trimmed}`;
};

/**
 * Formats a path or URL string to a complete, valid public URL for API responses.
 * Never returns relative paths. Always returns absolute HTTP/HTTPS URL.
 */
export const formatPublicUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const relativePath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${relativePath}`;
};

/**
 * Formats an array of URLs or paths, ensuring:
 * - Valid full URLs
 * - No null or undefined
 * - No empty strings
 * - No duplicate URLs
 */
export const formatPublicUrlArray = (
  urls: (string | null | undefined)[] | null | undefined
): string[] => {
  if (!Array.isArray(urls)) return [];

  const formattedList = urls
    .map((u) => formatPublicUrl(u))
    .filter((url) => typeof url === "string" && url.trim().length > 0);

  return Array.from(new Set(formattedList));
};

/**
 * Logs image flow details to console for audit & debugging.
 */
export const logImageFlow = (
  context: string,
  dbValue: unknown,
  responseValue: unknown
): void => {
  console.log(`[ImageFlow Audit - ${context}]`);
  console.log(`  └─ Database Value:`, JSON.stringify(dbValue));
  console.log(`  └─ Response Value:`, JSON.stringify(responseValue));
};

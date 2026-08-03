import fs from "fs";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import AppError from "../utils/AppError";
import { toRelativePath } from "../utils/imageUrl";

const uploadsRoot = path.resolve(process.cwd(), "uploads", "products");

const uploadFolders = {
  thumbnailImage: "thumbnails",
  productImages: "gallery",
  productVideos: "videos",
  reviewImages: "reviews",
  image: "banners",
} as const;

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_VIDEO_SIZE_MB = 100;

const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "image/svg",
]);

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
]);

const videoMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm"]);

const ensureFolderExists = (folderName: string): void => {
  const dir = path.join(uploadsRoot, folderName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    const folderName = uploadFolders[file.fieldname as keyof typeof uploadFolders] || "gallery";
    ensureFolderExists(folderName);
    callback(null, path.join(uploadsRoot, folderName));
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${basename || "file"}${extension}`;
    callback(null, fileName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  const rawMime = file.mimetype.split(";")[0]?.trim().toLowerCase() ?? "";
  const ext = path.extname(file.originalname).toLowerCase();

  if (["thumbnailImage", "productImages", "reviewImages", "image"].includes(file.fieldname)) {
    const isValidMime = imageMimeTypes.has(rawMime);
    const isValidExt = imageExtensions.has(ext);

    if (!isValidMime && !isValidExt) {
      callback(new AppError(400, "Unsupported image format"));
      return;
    }

    callback(null, true);
    return;
  }

  if (file.fieldname === "productVideos") {
    const isValidMime = videoMimeTypes.has(rawMime);
    const isValidExt = videoExtensions.has(ext);

    if (!isValidMime && !isValidExt) {
      callback(new AppError(400, "Unsupported video format"));
      return;
    }

    callback(null, true);
    return;
  }

  callback(new AppError(400, "Invalid upload field"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES, // Allow up to video limit, custom check in validateFileIntegrity
  },
});

const validateFileIntegrity = (file: Express.Multer.File): boolean => {
  try {
    const stats = fs.statSync(file.path);
    if (stats.size === 0) return false;

    // Check size limit by type
    if (file.fieldname === "productVideos") {
      if (stats.size > MAX_VIDEO_SIZE_BYTES) return false;
    } else {
      if (stats.size > MAX_IMAGE_SIZE_BYTES) return false;
    }

    if (["thumbnailImage", "productImages", "reviewImages", "image"].includes(file.fieldname)) {
      const buffer = Buffer.alloc(64);
      const fd = fs.openSync(file.path, "r");
      fs.readSync(fd, buffer, 0, 64, 0);
      fs.closeSync(fd);

      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isGif = buffer.toString("ascii", 0, 3) === "GIF";
      const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
      const isAvif = buffer.toString("ascii", 4, 8) === "ftyp";
      const headText = buffer.toString("utf8").toLowerCase();
      const isSvg = headText.includes("<svg") || headText.includes("<?xml") || headText.includes("<!doctype svg");

      return isJpeg || isPng || isGif || isWebp || isAvif || isSvg;
    }

    return true;
  } catch {
    return false;
  }
};

const toFileUrl = (folderName: string, fileName: string): string => {
  return `/uploads/products/${folderName}/${fileName}`;
};

export const ensureStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "[]") {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Ignore invalid JSON and fall back to comma splitting
      }
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

export const productUpload = upload.fields([
  { name: "thumbnailImage", maxCount: 1 },
  { name: "productImages", maxCount: 10 },
  { name: "productVideos", maxCount: 5 },
]);

export const reviewUpload = upload.fields([
  { name: "reviewImages", maxCount: 10 },
]);

export const bannerUpload = upload.fields([
  { name: "image", maxCount: 1 },
]);

export const mapProductUploadToBody = (req: Request, _res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (files) {
    const allFiles = Object.values(files).flat();

    for (const file of allFiles) {
      if (!validateFileIntegrity(file)) {
        allFiles.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {
            // Ignore cleanup error
          }
        });
        next(new AppError(400, `File ${file.originalname} exceeds limit or is corrupted`));
        return;
      }
    }
  }

  const thumbnailFile = files?.thumbnailImage?.[0];

  if (thumbnailFile) {
    req.body.thumbnailImage = toFileUrl(uploadFolders.thumbnailImage, thumbnailFile.filename);
  } else if (req.body.thumbnailImage !== undefined) {
    const rel = toRelativePath(req.body.thumbnailImage);
    if (rel) {
      req.body.thumbnailImage = rel;
    } else {
      delete req.body.thumbnailImage;
    }
  }

  const imageFiles = files?.productImages ?? [];
  const existingImages = req.body.productImages !== undefined ? ensureStringArray(req.body.productImages).map(toRelativePath).filter(Boolean) : [];
  const newImageUrls = imageFiles.map((file) => toFileUrl(uploadFolders.productImages, file.filename));

  if (newImageUrls.length > 0 || existingImages.length > 0) {
    req.body.productImages = Array.from(new Set([...existingImages, ...newImageUrls]));
  } else {
    delete req.body.productImages;
  }

  if (req.body.deletedProductImages !== undefined) {
    req.body.deletedProductImages = ensureStringArray(req.body.deletedProductImages).map(toRelativePath).filter(Boolean);
  }

  const videoFiles = files?.productVideos ?? [];
  const existingVideos = req.body.productVideos !== undefined ? ensureStringArray(req.body.productVideos).map(toRelativePath).filter(Boolean) : [];
  const newVideoUrls = videoFiles.map((file) => toFileUrl(uploadFolders.productVideos, file.filename));

  if (newVideoUrls.length > 0 || existingVideos.length > 0) {
    req.body.productVideos = Array.from(new Set([...existingVideos, ...newVideoUrls]));
  } else {
    delete req.body.productVideos;
  }

  next();
};

export const mapReviewUploadToBody = (req: Request, _res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (!files) {
    next();
    return;
  }

  const allFiles = Object.values(files).flat();

  for (const file of allFiles) {
    if (file.fieldname === "reviewImages") {
      if (!validateFileIntegrity(file)) {
        allFiles.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {
            // Ignore cleanup error
          }
        });
        next(new AppError(400, "Corrupted image file"));
        return;
      }
    }
  }

  const reviewFiles = files.reviewImages ?? [];
  const existingImages = req.body.images !== undefined ? ensureStringArray(req.body.images) : [];
  const newImageUrls = reviewFiles.map((file) => toFileUrl(uploadFolders.reviewImages, file.filename));

  if (newImageUrls.length > 0 || req.body.images !== undefined) {
    req.body.images = [...existingImages, ...newImageUrls];
  }

  next();
};

export const mapBannerUploadToBody = (req: Request, _res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (!files) {
    next();
    return;
  }

  const allFiles = Object.values(files).flat();

  for (const file of allFiles) {
    if (file.fieldname === "image") {
      if (!validateFileIntegrity(file)) {
        allFiles.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {
            // Ignore cleanup error
          }
        });
        next(new AppError(400, "Corrupted image file"));
        return;
      }
    }
  }

  const bannerFile = files.image?.[0];

  if (bannerFile) {
    req.body.image = toFileUrl(uploadFolders.image, bannerFile.filename);
  }

  next();
};

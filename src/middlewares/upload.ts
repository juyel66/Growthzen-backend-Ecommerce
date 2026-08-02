import fs from "fs";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import AppError from "../utils/AppError";

const uploadsRoot = path.resolve(process.cwd(), "uploads", "products");

const uploadFolders = {
  thumbnailImage: "thumbnails",
  productImages: "images",
  productVideos: "videos",
  reviewImages: "reviews",
  image: "banners",
} as const;

const imageMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const videoMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const ensureFolderExists = (folderName: string): void => {
  fs.mkdirSync(path.join(uploadsRoot, folderName), { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const folderName = uploadFolders[file.fieldname as keyof typeof uploadFolders];

    if (!folderName) {
      callback(new AppError(400, "Invalid upload field"), "");
      return;
    }

    ensureFolderExists(folderName);
    callback(null, path.join(uploadsRoot, folderName));
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, fileName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  if (file.fieldname === "thumbnailImage" || file.fieldname === "productImages" || file.fieldname === "reviewImages" || file.fieldname === "image") {
    if (!imageMimeTypes.has(file.mimetype.toLowerCase())) {
      callback(new AppError(400, "Only jpg, jpeg, png, and webp images are allowed"));
      return;
    }

    callback(null, true);
    return;
  }

  if (file.fieldname === "productVideos") {
    if (!videoMimeTypes.has(file.mimetype.toLowerCase())) {
      callback(new AppError(400, "Only mp4, mov, and webm videos are allowed"));
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
    fileSize: 25 * 1024 * 1024,
  },
});

const toFileUrl = (folderName: string, fileName: string): string => {
  return `/uploads/products/${folderName}/${fileName}`;
};

const ensureStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Ignore invalid JSON and fall back to comma splitting.
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

  if (!files) {
    next();
    return;
  }

  const thumbnailFile = files.thumbnailImage?.[0];

  if (thumbnailFile) {
    req.body.thumbnailImage = toFileUrl(uploadFolders.thumbnailImage, thumbnailFile.filename);
  }

  const imageFiles = files.productImages ?? [];

  if (imageFiles.length > 0) {
    req.body.productImages = imageFiles.map((file) => toFileUrl(uploadFolders.productImages, file.filename));
  } else if (req.body.productImages !== undefined) {
    req.body.productImages = ensureStringArray(req.body.productImages);
  }

  const videoFiles = files.productVideos ?? [];

  if (videoFiles.length > 0) {
    req.body.productVideos = videoFiles.map((file) => toFileUrl(uploadFolders.productVideos, file.filename));
  } else if (req.body.productVideos !== undefined) {
    req.body.productVideos = ensureStringArray(req.body.productVideos);
  }

  next();
};

export const mapReviewUploadToBody = (req: Request, _res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (!files) {
    next();
    return;
  }

  const reviewFiles = files.reviewImages ?? [];

  if (reviewFiles.length > 0) {
    req.body.images = reviewFiles.map((file) => toFileUrl(uploadFolders.reviewImages, file.filename));
  } else if (req.body.images !== undefined) {
    req.body.images = ensureStringArray(req.body.images);
  }

  next();
};

export const mapBannerUploadToBody = (req: Request, _res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (!files) {
    next();
    return;
  }

  const bannerFile = files.image?.[0];

  if (bannerFile) {
    req.body.image = toFileUrl(uploadFolders.image, bannerFile.filename);
  }

  next();
};

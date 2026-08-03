import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { toRelativePath } from "../utils/imageUrl";

/**
 * Safely deletes a local physical file from the uploads directory using fs.unlink().
 */
export const deleteLocalFile = async (
  fileUrlOrPath: string | null | undefined
): Promise<void> => {
  if (!fileUrlOrPath) return;
  const trimmed = String(fileUrlOrPath).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return;

  try {
    const rel = toRelativePath(trimmed);
    if (rel.startsWith("/uploads/") || rel.startsWith("uploads/")) {
      const localFilePath = path.resolve(process.cwd(), rel.replace(/^\/+/, ""));
      if (fsSync.existsSync(localFilePath)) {
        await fs.unlink(localFilePath);
        console.log(`[StorageService - Local File Unlinked] File: ${localFilePath}`);
      }
    }
  } catch (error) {
    console.error(`[StorageService - Delete Local File Error] Path: ${fileUrlOrPath}`, error);
  }
};

/**
 * Alias function to maintain compatibility.
 */
export const deleteFileFromStorage = deleteLocalFile;

/**
 * Next-Gen Image Compression & CDN Optimization Utility
 * Converts images to WebP/AVIF formats client-side, compresses before upload,
 * and provides CDN optimization for Cloudflare, Cloudinary, Unsplash & Supabase.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  targetFormat?: "image/webp" | "image/avif" | "image/jpeg";
}

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savingsPct: number;
  width: number;
  height: number;
  format: string;
  name: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Client-side high performance image compressor & WebP format converter.
 */
export async function compressAndConvertToWebP(
  file: File | Blob,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    targetFormat = "image/webp",
  } = options;

  const originalSize = file.size;
  const fileName = file instanceof File ? file.name : "image.webp";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);

    img.onload = () => {
      // Calculate scaled dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context creation failed"));
        return;
      }

      // Smooth resizing algorithm
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt targetFormat conversion (WebP default)
      let mimeType = targetFormat;
      let dataUrl = canvas.toDataURL(mimeType, quality);

      // Fallback if browser doesn't support target format
      if (!dataUrl.startsWith(`data:${mimeType}`)) {
        mimeType = "image/jpeg";
        dataUrl = canvas.toDataURL(mimeType, quality);
      }

      canvas.toBlob(
        (blob) => {
          const finalBlob = blob || new Blob([], { type: mimeType });
          const compressedSize = finalBlob.size;
          const savingsPct =
            originalSize > 0
              ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
              : 0;

          const formatLabel = mimeType.replace("image/", "").toUpperCase();
          const cleanName = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;

          resolve({
            dataUrl,
            blob: finalBlob,
            originalSize,
            compressedSize,
            savingsPct,
            width,
            height,
            format: formatLabel,
            name: `${cleanName}.${formatLabel.toLowerCase()}`,
          });
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => reject(new Error("Failed to load image for compression"));
    reader.readAsDataURL(file);
  });
}

/**
 * Appends CDN transformation parameters to serve WebP / AVIF with responsive width
 */
export function buildCDNImageUrl(
  url: string | null | undefined,
  width = 800,
  quality = 80,
  cdnPreset: "auto" | "cloudflare" | "cloudinary" | "unsplash" = "auto",
): string {
  if (!url?.trim()) return "/placeholder-product.svg";
  const clean = url.trim();

  // Local data URLs or static SVGs pass through directly
  if (clean.startsWith("data:") || clean.endsWith(".svg") || clean.startsWith("/")) {
    return clean;
  }

  // Unsplash Image CDN
  if (clean.includes("images.unsplash.com")) {
    const base = clean.split("?")[0];
    return `${base}?w=${width}&q=${quality}&auto=format&fm=webp&fit=crop`;
  }

  // Cloudinary CDN
  if (clean.includes("res.cloudinary.com") || cdnPreset === "cloudinary") {
    if (clean.includes("/upload/")) {
      return clean.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    }
  }

  // Cloudflare Images CDN
  if (clean.includes("imagedelivery.net") || cdnPreset === "cloudflare") {
    const sep = clean.includes("?") ? "&" : "?";
    return `${clean}${sep}format=auto&width=${width}&quality=${quality}`;
  }

  // Supabase Storage Transformation CDN
  if (clean.includes("supabase.co/storage/v1/object/public")) {
    const sep = clean.includes("?") ? "&" : "?";
    return `${clean}${sep}width=${width}&quality=${quality}&format=origin`;
  }

  return clean;
}

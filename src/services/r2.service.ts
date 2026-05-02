import { AppError } from "../errors/AppError";
import { ImageCaptureMetadata } from "../types/image-capture-metadata";
import { getExifData } from "./image-metadata.service";

export const getImage = async (bucket: R2Bucket, key: string, url: string) => {
  if (!key) {
    return null;
  } else {
    // attempt to hit cache first
    const cache = caches.default;
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      return cachedResponse;
    }

    const r2Object = await bucket.get(key);

    if (!r2Object) {
      return null;
    }

    const headers = new Headers();
    r2Object.writeHttpMetadata(headers);

    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Content-Type", "image/avif");
    headers.set("Vary", "Accept");

    return new Response(r2Object.body, { headers });
  }
};

export const getImagePage = async (bucket: R2Bucket, cursor?: string) => {
  const r2ListResult = await bucket.list({
    include: ["customMetadata"],
    limit: 6,
    cursor,
  });

  return r2ListResult;
};

export const uploadImage = async (
  bucket: R2Bucket,
  key: string,
  file: File,
  passedExifData?: ImageCaptureMetadata,
) => {
  const buffer = await file.arrayBuffer();

  const exifData = await getExifData(buffer, passedExifData);
  console.log("extracted metadata for upload:", exifData);
  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      exifData: JSON.stringify(exifData),
    },
  });
};

export const deleteAllImages = async (bucket: R2Bucket) => {
  const r2ListResult = await bucket.list();

  if (!r2ListResult || r2ListResult.objects.length === 0) {
    throw new AppError("No images to delete");
  }

  await Promise.all(
    r2ListResult.objects.map((obj: R2Object) => bucket.delete(obj.key)),
  );
};

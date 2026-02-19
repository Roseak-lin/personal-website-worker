import { AppError } from "../errors/AppError";
import { getExifData } from "./image-metadata.service";

export const getImage = async (bucket: R2Bucket, key: string) => {
  if (!key) {
    return null;
  } else {
    const r2Object = await bucket.get(key);
    const response = new Response(r2Object?.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Accept-Ranges": "bytes",
      },
    });

    if (!r2Object) {
      return null;
    }
    
    return response;
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
) => {
  const buffer = await file.arrayBuffer();
  const exifData = await getExifData(buffer);

  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      exifData: exifData ? JSON.stringify(exifData) : "",
    },
  });
};

export const deleteAllImages = async (bucket: R2Bucket) => { 
    const r2ListResult = await bucket.list();

    if (!r2ListResult || r2ListResult.objects.length === 0) {
        throw new AppError("No images to delete")
    }

    await Promise.all(r2ListResult.objects.map((obj : R2Object) => bucket.delete(obj.key)))
}
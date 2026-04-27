import { Context } from "hono";

import * as Services from "../services/r2.service";
import { AppError } from "../errors/AppError";

export const getItems = async (c: Context) => {
  try {
    const cursor = c.req.query("cursor") || undefined;

    const r2ListResult = await Services.getImagePage(
      c.env["personal-bucket"],
      cursor,
    );

    if (!r2ListResult || r2ListResult.objects.length === 0) {
      return c.json({ images: [] });
    }

    const images = r2ListResult.objects.map((obj: R2Object) => ({
      key: obj.key,
      exifData: obj.customMetadata?.exifData,
      imageId: `${encodeURIComponent(obj.key)}`,
    }));

    return c.json({
      images,
      cursor: r2ListResult.truncated ? r2ListResult.cursor : null,
      truncated: r2ListResult.truncated,
      pageSize: 6,
    });
  } catch (err) {
    return c.json({ error: "Failed to list R2 objects." }, 500);
  }
};

export const getImagePreview = async (c: Context) => {
  const id = c.req.param().id;

  if (!id) {
    return c.json({ error: "File ID is required." }, 400);
  } else {
    const r2Object = await Services.getImage(c.env["personal-bucket"], id);

    const converted = await c.env.IMAGES
      .input(r2Object?.body)
      .transform({ width: 960 })
      .output({ format: "image/jpeg" });

    if (!r2Object) {
      return c.json({ error: "Failed to retrieve image." }, 404);
    }
    return converted.response();
  }
};

export const getImageFull = async (c: Context) => {
  const id = c.req.param().id;

  if (!id) {
    return c.json({ error: "File ID is required." }, 400);
  } else {
    const r2Object = await Services.getImage(c.env["personal-bucket"], id);

    if (!r2Object) {
      return c.json({ error: "Failed to retrieve image." }, 404);
    }
    return r2Object;
  }
};

export const uploadImage = async (c: Context) => {
  const body = await c.req.formData();
  const file = body.get("file") as File;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Issue with file uploaded." }, 400);
  }

  try {
    await Services.uploadImage(c.env["personal-bucket"], file.name, file);

    return c.json({ message: "File uploaded successfully." });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to upload file." }, 500);
  }
};

// ONLY FOR DEV PURPOSES - delete all files in the r2 bucket
export const deleteAllImages = async (c: Context) => {
  const provided = c.req.header("x-admin-key");
  if (provided !== c.env.CLOUDFLARE_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const bucket = c.env["personal-bucket"];
    const r2ListResult = await bucket.list();

    await Promise.all(
      r2ListResult.objects.map((obj: R2Object) => bucket.delete(obj.key)),
    );

    return c.json({ message: "All images deleted successfully." });
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ error: err.message });
    } else {
      return c.json({ error: "Failed to delete images." }, 500);
    }
  }
};

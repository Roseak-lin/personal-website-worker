import { Context } from "hono";

import * as Services from "../services/r2.services";
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
      width: obj.customMetadata?.width,
      height: obj.customMetadata?.height,
      url: `/images/${encodeURIComponent(obj.key)}`,
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

export const getImage = async (c: Context) => {
  const id = c.req.param().id;

  if (!id) {
    return c.json({ error: "File ID is required." }, 400);
  } else {
    const r2Object = await Services.getImage(c.env["personal-bucket"], id);
    const response = new Response(r2Object?.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Accept-Ranges": "bytes",
      },
    });

    if (!r2Object) {
      return c.json({ error: "Failed to retrieve image." }, 404);
    }
    return response;
  }
};

export const uploadImage = async (c: Context) => {
  const body = await c.req.formData();
  const file = body.get("file") as File;
  const width = body.get("width") as string;
  const height = body.get("height") as string;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Issue with file uploaded." }, 400);
  }

  try {
    Services.uploadImage(
      c.env["personal-website"],
      file.name,
      file,
      width,
      height,
    );

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
        return c.json({error: err.message});
    } else {
        return c.json({ error: "Failed to delete images." }, 500);
    }
  }
};

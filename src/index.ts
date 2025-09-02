import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  "personal-bucket": R2Bucket;
  CLOUDFLARE_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: [
      "https://roseak-lin.github.io",
      "http://localhost:3000",
      "http://localhost:8080",
    ],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "DELETE"],
  })
);

app.get("/getItems", async (c) => {
  try {
    const env = await c.env["personal-bucket"];
    const r2ListResult = await c.env["personal-bucket"].list({include: ['customMetadata']});

    if (!r2ListResult || r2ListResult.objects.length === 0) {
      return c.json({ images: [] });
    }

    const images = r2ListResult.objects.map((obj) => ({
      key: obj.key,
      width: obj.customMetadata?.width,
      height: obj.customMetadata?.height,
      url: `/getImage/${encodeURIComponent(obj.key)}`,
    }));

    return c.json({ images });
  } catch (err) {
    return c.json({ error: "Failed to list R2 objects." }, 500);
  }
});

app.get("/", (c) => {
  return c.html(`
    <strong>R Lin</strong>
  `);
});

app.get("/getImage/:id", async (c) => {
  const id = c.req.param().id;

  if (!id) {
    return c.json({ error: "File ID is required." }, 400);
  } else {
    const r2Object = await c.env["personal-bucket"].get(id);
    const buffer = await r2Object?.arrayBuffer();

    if (!buffer) {
      return c.json({ error: "Failed to retrieve image." }, 404);
    }

    return c.body(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  }
});

// write an endpoint to upload a file into the r2 bucket
app.post("/upload", async (c) => {
  const body = await c.req.formData();
  const file = body.get("file") as File;
  const buffer = await file.arrayBuffer();
  const width = body.get("width") as string;
  const height = body.get("height") as string;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Issue with file uploaded." }, 400);
  }

  try {
    const bucket = c.env["personal-bucket"];
    await bucket.put(file.name, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        width,
        height,
      },
    });

    return c.json({ message: "File uploaded successfully." });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to upload file." }, 500);
  }
});

app.delete("/deleteAll", async (c) => {
  const provided = c.req.header('x-admin-key');
  if (provided !== c.env.CLOUDFLARE_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const bucket = c.env["personal-bucket"];
    const r2ListResult = await bucket.list();

    if (!r2ListResult || r2ListResult.objects.length === 0) {
      return c.json({ message: "No images to delete." });
    }

    await Promise.all(
      r2ListResult.objects.map((obj) => bucket.delete(obj.key))
    );

    return c.json({ message: "All images deleted successfully." });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to delete images." }, 500);
  }
});

export default app;

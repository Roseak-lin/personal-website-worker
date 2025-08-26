// Add the correct import or declare R2Bucket if it's a global type
// For example, if using Cloudflare types:
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
    allowMethods: ["GET"],
  })
);

app.get("/getItems", async (c) => {
  try {
    const r2ListResult = await c.env["personal-bucket"].list();

    if (!r2ListResult || r2ListResult.objects.length === 0) {
      return c.json({ images: [] });
    }

    const images = r2ListResult.objects.map((obj) => ({
      key: obj.key,
      url: `/getImage/${encodeURIComponent(obj.key)}`,
    }));

    return c.json({ images });
  } catch (err) {
    return c.json({ error: "Failed to list R2 objects." }, 500);
  }
});

app.get("/", (c) => {
  return c.html(`
    <html>
      <body>
      <form method="post" action="/upload" enctype="multipart/form-data">
        <input type='file' name='file' />
        <button type='submit'>Upload</button>
      </form>
    </body>
  </html>
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

app.get("/rename-all", async (c) => {
  try {
    const bucket = c.env["personal-bucket"];

    const listResult = await bucket.list();

    if (!listResult.objects || listResult.objects.length === 0) {
      return c.json({ message: "No objects found in bucket." });
    }

    for (const [index, obj] of listResult.objects.entries()) {
      const oldKey = obj.key;
      if (!oldKey) return c.json({ error: "No objects found in bucket." });
      const extension = oldKey.split(".").pop();
      const newKey = `IMG_2181`;

      const object = await bucket.get(oldKey);
      if (!object || !object.body) {
        console.warn(`Skipping ${oldKey}: unable to fetch`);
        return c.json({ error: "Failed to fetch object." }, 404);
      }

      await bucket.put(newKey, object.body, {
        httpMetadata: object.httpMetadata,
      });

      await bucket.delete(oldKey);
      console.log(`Renamed ${oldKey} → ${newKey}`);
    }

    return c.json({ message: "All objects renamed successfully." });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to rename objects." }, 500);
  }
});

// write an endpoint to upload a file into the r2 bucket
app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  console.log(body);

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Issue with file uploaded." }, 400);
  }

  try {
    const bucket = c.env["personal-bucket"];
    await bucket.put(file.name, file);
    return c.json({ message: "File uploaded successfully." });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to upload file." }, 500);
  }
});

export default app;

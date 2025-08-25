// Add the correct import or declare R2Bucket if it's a global type
// For example, if using Cloudflare types:
import type { R2Bucket } from "@cloudflare/workers-types";
import { Context, Hono } from "hono";

type Bindings = {
  "personal-bucket": R2Bucket;
  CLOUDFLARE_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/getItems", async (c) => {
  if (!authenticate()) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const r2ListResult = await c.env["personal-bucket"].list();

    // Check for a valid result from the R2 list operation
    if (!r2ListResult) {
      return c.json({ error: "Failed to list R2 objects." }, 500);
    }

    return c.json(r2ListResult);
  } catch (err) {
    // Catch any unexpected errors from the R2 call itself
    return c.json({ error: "An unexpected error occurred." }, 500);
  }
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/getImage", async (c) => {
  if (!authenticate()) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // get by fileid in req body
  const requestBody = await c.req.json();
  const fileId: string | undefined = requestBody.fileId;
  console.log(fileId);

  if (!fileId) {
    return c.json({ error: "File ID is required." }, 400);
  } else {
    const r2Object = await c.env["personal-bucket"].get(fileId);
    return c.json(r2Object);
  }
});

const authenticate = () => {
  return (c: Context) => {
    const apiKey = c.req.header("x-api-key");
    if (!apiKey || apiKey !== c.env.CLOUDFLARE_TOKEN) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  };
};

export default app;

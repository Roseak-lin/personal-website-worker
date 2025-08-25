// Add the correct import or declare R2Bucket if it's a global type
// For example, if using Cloudflare types:
import type { R2Bucket } from "@cloudflare/workers-types";
import { Hono } from "hono";

type Bindings = {
  "personal-bucket": R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/getItems", async (c) => {
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

app.get("/getImage/${fileId}", async (c) => {
  //  const r2Object = await c.env['personal-bucket'].get();
});

export default app;

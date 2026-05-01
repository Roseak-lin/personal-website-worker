import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "./types/bindings";
import routes from "./routes/images.routes";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (origin === "https://roseak-lin.github.io") return origin;
      if (origin.startsWith("http://localhost:")) return origin;
      
      return null;
    },
    allowHeaders: ["Content-Type", "x-admin-key"],
    allowMethods: ["GET", "POST", "DELETE"],
  })
);

app.route("/images", routes);

app.get("/", (c) => {
  return c.html(`
    <strong>R Lin</strong>
  `);
});

export default app;

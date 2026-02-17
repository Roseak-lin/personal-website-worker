import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "./types/bindings";
import routes from "./routes/images.routes";

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

app.route("/images", routes);

app.get("/", (c) => {
  return c.html(`
    <strong>R Lin</strong>
  `);
});

export default app;

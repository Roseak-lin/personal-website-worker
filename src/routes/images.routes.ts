import { Hono } from "hono";
import * as controller from "../controllers/images.controllers";
import { Bindings } from "../types/bindings";

const images = new Hono<{ Bindings: Bindings }>();

images.get("/", controller.getItems);
images.get("/preview/:id", controller.getImagePreview);
images.get("/:id", controller.getImageFull);
images.post("/", controller.uploadImage);
images.delete("/", controller.deleteAllImages);

export default images;

import { Router } from "express";
import * as controller from "../controllers/products.controller.ts";
import { requireIdParam, validate } from "../middleware/validate.ts";
import { uploadImage, verifyImage } from "../middleware/upload.ts";
import { productBody } from "../validators/products.validators.ts";

export const productsRouter = Router();

// uploadImage runs first: the validators read req.body, which does not exist
// until multer has parsed the multipart stream.
const withImage = [uploadImage, verifyImage, ...productBody, validate];

productsRouter.get("/", controller.list);
productsRouter.get("/:id", requireIdParam, controller.get);
productsRouter.post("/", withImage, controller.create);
productsRouter.put("/:id", requireIdParam, withImage, controller.update);
productsRouter.delete("/:id", requireIdParam, controller.remove);

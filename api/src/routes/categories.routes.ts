import { Router } from "express";
import * as controller from "../controllers/categories.controller.ts";
import { requireIdParam, validate } from "../middleware/validate.ts";
import { categoryBody } from "../validators/categories.validators.ts";

export const categoriesRouter = Router();

categoriesRouter.get("/", controller.list);
categoriesRouter.get("/:id", requireIdParam, controller.get);
categoriesRouter.get("/:id/products", requireIdParam, controller.listProducts);
categoriesRouter.post("/", categoryBody, validate, controller.create);
categoriesRouter.put("/:id", requireIdParam, categoryBody, validate, controller.update);
categoriesRouter.delete("/:id", requireIdParam, controller.remove);

import { Router } from "express";
import { categoriesRouter } from "./categories.routes.ts";
import { productsRouter } from "./products.routes.ts";

export const apiRouter = Router();

apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);

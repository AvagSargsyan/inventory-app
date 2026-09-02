import { Router } from 'express';
import { categoriesRouter } from './categories.routes.js';
import { productsRouter } from './products.routes.js';

export const apiRouter = Router();

apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);

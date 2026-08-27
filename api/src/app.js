import express from 'express';
import cors from 'cors';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

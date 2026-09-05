import type { RequestHandler } from "express";
import * as service from "../services/products.service.ts";
import type { ProductInput } from "../services/products.service.ts";

// Express types params as string | string[] because of wildcard routes. These
// routes declare :id, and requireIdParam has already checked it is an integer.
type IdParams = { id: string };

// @types/express types req.body as `any`, and the validator chain has already
// run by the time a controller sees it. This is the one place that guarantee
// is turned back into a type.
const toInput = (body: Record<string, unknown>): ProductInput => ({
  category_id: body.category_id as string | number,
  name: body.name as string,
  price: body.price as string | number,
  stock_quantity: body.stock_quantity as string | number | undefined,
  remove_image: body.remove_image as string | undefined,
});

export const list: RequestHandler = async (req, res) => res.json(await service.list(req.query));

export const get: RequestHandler<IdParams> = async (req, res) =>
  res.json(await service.get(req.params.id));

export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await service.create(toInput(req.body), req.verifiedImage));

export const update: RequestHandler<IdParams> = async (req, res) =>
  res.json(await service.update(req.params.id, toInput(req.body), req.verifiedImage));

export const remove: RequestHandler<IdParams> = async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).end();
};

import type { RequestHandler } from "express";
import * as service from "../services/categories.service.ts";
import type { CategoryInput } from "../services/categories.service.ts";

// Express types params as string | string[] because of wildcard routes. These
// routes declare :id, and requireIdParam has already checked it is an integer.
type IdParams = { id: string };

// @types/express types req.body as `any`, and the validator chain has already
// run by the time a controller sees it. This is the one place that guarantee
// is turned back into a type.
const toInput = (body: Record<string, unknown>): CategoryInput => ({
  name: body.name as string,
  description: (body.description as string | null | undefined) ?? null,
});

export const list: RequestHandler = async (_req, res) => res.json(await service.list());

export const get: RequestHandler<IdParams> = async (req, res) =>
  res.json(await service.get(req.params.id));

export const listProducts: RequestHandler<IdParams> = async (req, res) =>
  res.json(await service.listProducts(req.params.id));

export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await service.create(toInput(req.body)));

export const update: RequestHandler<IdParams> = async (req, res) =>
  res.json(await service.update(req.params.id, toInput(req.body)));

export const remove: RequestHandler<IdParams> = async (req, res) => {
  if (req.query.reassign_to === undefined) {
    await service.remove(req.params.id);
  } else {
    await service.reassignAndDelete(Number(req.params.id), Number(req.query.reassign_to));
  }
  res.status(204).end();
};

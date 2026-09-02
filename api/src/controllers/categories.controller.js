import * as service from '../services/categories.service.js';

const toInput = (body) => ({ name: body.name, description: body.description ?? null });

export const list = async (_req, res) => res.json(await service.list());

export const get = async (req, res) => res.json(await service.get(req.params.id));

export const listProducts = async (req, res) => res.json(await service.listProducts(req.params.id));

export const create = async (req, res) => res.status(201).json(await service.create(toInput(req.body)));

export const update = async (req, res) => res.json(await service.update(req.params.id, toInput(req.body)));

export async function remove(req, res) {
  if (req.query.reassign_to === undefined) {
    await service.remove(req.params.id);
  } else {
    await service.reassignAndDelete(Number(req.params.id), Number(req.query.reassign_to));
  }
  res.status(204).end();
}

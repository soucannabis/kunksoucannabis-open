'use strict';

const itemsRepository = require('../repositories/itemsRepository');
const { scopeFilterFor } = require('../schema/rbac');
const { assertUserDeletable, assertProfessionalDeletable } = require('./linkGuards');

function getScope(req) {
  return scopeFilterFor(req.user?.roles || req.user?.permissions, req.user);
}

async function list(req) {
  return itemsRepository.listItems(req.params.collection, req.query, {
    scopeFilter: getScope(req),
  });
}

async function getById(req) {
  return itemsRepository.getItem(req.params.collection, req.params.id, req.query, {
    scopeFilter: getScope(req),
  });
}

async function create(req) {
  return itemsRepository.createItem(req.params.collection, req.body);
}

async function update(req) {
  return itemsRepository.updateItem(req.params.collection, req.params.id, req.body, {
    scopeFilter: getScope(req),
  });
}

async function remove(req) {
  const collection = req.params.collection;
  const id = req.params.id;
  if (collection === 'users') {
    const user = await itemsRepository.getItem('users', id);
    await assertUserDeletable(user);
  }
  if (collection === 'professionals') {
    const pro = await itemsRepository.getItem('professionals', id);
    await assertProfessionalDeletable(pro);
  }
  if (collection === 'orders') {
    const ordersService = require('./ordersService');
    return ordersService.deleteOrder(id);
  }
  return itemsRepository.deleteItem(collection, id, {
    scopeFilter: getScope(req),
  });
}

module.exports = { list, getById, create, update, remove };

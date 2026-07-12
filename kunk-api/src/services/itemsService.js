'use strict';

const itemsRepository = require('../repositories/itemsRepository');
const { scopeFilterFor } = require('../schema/rbac');

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
  return itemsRepository.deleteItem(req.params.collection, req.params.id, {
    scopeFilter: getScope(req),
  });
}

module.exports = { list, getById, create, update, remove };

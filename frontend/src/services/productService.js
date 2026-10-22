import api from './api'

export const getProducts = (params = {}) =>
  api.get('/products/', { params }).then((r) => r.data)
export const getProduct = (id) => api.get(`/products/${id}/`).then((r) => r.data)
export const createProduct = (data) => api.post('/products/', data).then((r) => r.data)
export const updateProduct = (id, data) =>
  api.patch(`/products/${id}/`, data).then((r) => r.data)
// 204 (deleted) returns no body; 200 returns { is_active: false } (deactivated)
export const deleteProduct = (id) => api.delete(`/products/${id}/`).then((r) => r.data)
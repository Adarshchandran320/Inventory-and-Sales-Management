import api from './api'

export const getPurchases = (params = {}) =>
  api.get('/purchases/', { params }).then((r) => r.data)
export const getPurchase = (id) => api.get(`/purchases/${id}/`).then((r) => r.data)
export const createPurchase = (data) => api.post('/purchases/', data).then((r) => r.data)
export const receivePurchase = (id) =>
  api.post(`/purchases/${id}/receive/`).then((r) => r.data)
export const cancelPurchase = (id) =>
  api.post(`/purchases/${id}/cancel/`).then((r) => r.data)
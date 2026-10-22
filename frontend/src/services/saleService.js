import api from './api'

export const getSales = (params = {}) =>
  api.get('/sales/', { params }).then((r) => r.data)
export const getSale = (id) => api.get(`/sales/${id}/`).then((r) => r.data)
export const createSale = (data) => api.post('/sales/', data).then((r) => r.data)
export const cancelSale = (id) => api.post(`/sales/${id}/cancel/`).then((r) => r.data)
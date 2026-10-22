import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Flattens DRF errors like { items: { "1": { product: ["..."] } } } into text
function flatten(value, label = '') {
  if (Array.isArray(value)) return value.flatMap((v) => flatten(v, label))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) =>
      flatten(v, /^\d+$/.test(key) || key === 'non_field_errors' ? label : key),
    )
  }
  return [label ? `${label}: ${value}` : String(value)]
}

// One place that turns any failed request into a readable message
export function getErrorMessage(error) {
  const data = error.response?.data
  if (!data) return 'Cannot reach the server. Is the backend running?'
  if (typeof data === 'string') return 'Server error. Check the backend console.'
  if (data.detail) return data.detail
  return flatten(data).join(' | ')
}

export default api
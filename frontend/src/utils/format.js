// Change 'INR' / 'en-IN' here if you want a different currency
export const money = (value) =>
  Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

export const formatDate = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
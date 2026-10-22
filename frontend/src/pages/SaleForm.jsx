import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { getProducts } from '../services/productService'
import { createSale } from '../services/saleService'
import { money } from '../utils/format'

let rowCounter = 0
const newRow = () => ({ key: ++rowCounter, product: '', quantity: 1 })

// Only active products with stock can be sold
const loadSellable = () =>
  getProducts({ active: 'true' }).then((all) => all.filter((p) => p.stock_quantity > 0))

export default function SaleForm() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [rows, setRows] = useState([newRow()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSellable()
      .then(setProducts)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const productOf = (id) => products.find((p) => String(p.id) === String(id))

  const updateRow = (key, changes) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)))

  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key))

  const estimatedTotal = rows.reduce((sum, r) => {
    const p = productOf(r.product)
    return sum + (p ? Number(p.selling_price) * (Number(r.quantity) || 0) : 0)
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Only product and quantity are sent. Price and totals are decided by the server.
    const items = rows
      .filter((r) => r.product)
      .map((r) => ({ product: Number(r.product), quantity: Number(r.quantity) }))
    if (items.length === 0) return setError('Add at least one product.')

    setSaving(true)
    try {
      const created = await createSale({ items })
      navigate(`/sales/${created.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
      // Stock may have changed since this page loaded, so refresh the numbers
      loadSellable().then(setProducts).catch(() => {})
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 820 }}>
      <h2>New Sale</h2>
      <ErrorMessage message={error} onClose={() => setError('')} />

      {products.length === 0 ? (
        <div className="alert alert-warning">
          No products are in stock. <Link to="/purchases/new">Create a purchase order</Link>{' '}
          and receive it to add stock.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Product</th>
                  <th style={{ width: '14%' }}>Quantity</th>
                  <th className="text-end">Unit price</th>
                  <th className="text-end">Subtotal (est.)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = productOf(r.product)
                  const takenElsewhere = rows
                    .filter((o) => o.key !== r.key && o.product)
                    .map((o) => o.product)
                  return (
                    <tr key={r.key}>
                      <td>
                        <select className="form-select" value={r.product}
                          onChange={(e) => updateRow(r.key, { product: e.target.value, quantity: 1 })}>
                          <option value="">Select product</option>
                          {products.map((o) => (
                            <option key={o.id} value={o.id}
                              disabled={takenElsewhere.includes(String(o.id))}>
                              {o.sku} - {o.product_name} (stock {o.stock_quantity})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="number" min="1" max={p ? p.stock_quantity : undefined}
                          className="form-control" value={r.quantity}
                          onChange={(e) => updateRow(r.key, { quantity: e.target.value })} />
                      </td>
                      <td className="text-end">{p ? money(p.selling_price) : '-'}</td>
                      <td className="text-end">
                        {p ? money(Number(p.selling_price) * (Number(r.quantity) || 0)) : '-'}
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger"
                          disabled={rows.length === 1} onClick={() => removeRow(r.key)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <button type="button" className="btn btn-outline-secondary"
              onClick={() => setRows((rs) => [...rs, newRow()])}>
              + Add item
            </button>
            <div className="text-end">
              <div className="fw-bold fs-5">{money(estimatedTotal)}</div>
              <div className="form-text">Estimate only. The server calculates the final total.</div>
            </div>
          </div>

          <button className="btn btn-primary me-2" disabled={saving}>
            {saving ? 'Saving...' : 'Confirm Sale'}
          </button>
          <Link to="/sales" className="btn btn-outline-secondary">
            Cancel
          </Link>
        </form>
      )}
    </div>
  )
}
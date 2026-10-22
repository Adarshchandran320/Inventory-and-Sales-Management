import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { getProducts } from '../services/productService'
import { createPurchase } from '../services/purchaseService'
import { getSuppliers } from '../services/supplierService'
import { money } from '../utils/format'

let rowCounter = 0
const newRow = () => ({ key: ++rowCounter, product: '', quantity: 1, unit_cost: '' })

export default function PurchaseForm() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('Draft')
  const [rows, setRows] = useState([newRow()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSuppliers()
      .then(setSuppliers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  // A purchase order only accepts products from its own supplier,
  // so changing the supplier clears the item rows.
  const handleSupplierChange = async (e) => {
    const id = e.target.value
    setSupplierId(id)
    setRows([newRow()])
    setProducts([])
    if (!id) return
    try {
      setProducts(await getProducts({ supplier: id, active: 'true' }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateRow = (key, changes) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)))

  const handleProductChange = (key, productId) => {
    const product = products.find((p) => String(p.id) === productId)
    updateRow(key, { product: productId, unit_cost: product ? product.cost_price : '' })
  }

  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key))

  const estimatedTotal = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_cost) || 0),
    0,
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!supplierId) return setError('Select a supplier.')
    const items = rows
      .filter((r) => r.product)
      .map((r) => ({
        product: Number(r.product),
        quantity: Number(r.quantity),
        ...(r.unit_cost !== '' && { unit_cost: r.unit_cost }),
      }))
    if (items.length === 0) return setError('Add at least one product.')

    setSaving(true)
    try {
      const created = await createPurchase({ supplier: Number(supplierId), status, items })
      navigate(`/purchases/${created.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 820 }}>
      <h2>New Purchase Order</h2>
      <ErrorMessage message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit}>
        <div className="row g-3 mb-4">
          <div className="col-md-7">
            <label className="form-label">Supplier</label>
            <select className="form-select" value={supplierId}
              onChange={handleSupplierChange} required>
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.company_name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label">Save as</label>
            <select className="form-select" value={status}
              onChange={(e) => setStatus(e.target.value)}>
              <option value="Draft">Draft</option>
              <option value="Ordered">Ordered</option>
            </select>
          </div>
        </div>

        {supplierId && products.length === 0 && (
          <div className="alert alert-warning">
            This supplier has no active products.{' '}
            <Link to="/products/new">Add a product</Link> first.
          </div>
        )}

        {supplierId && products.length > 0 && (
          <>
            <h5>Items</h5>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Product</th>
                    <th style={{ width: '16%' }}>Quantity</th>
                    <th style={{ width: '20%' }}>Unit cost</th>
                    <th className="text-end">Subtotal (est.)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const takenElsewhere = rows
                      .filter((o) => o.key !== r.key && o.product)
                      .map((o) => o.product)
                    return (
                      <tr key={r.key}>
                        <td>
                          <select className="form-select" value={r.product}
                            onChange={(e) => handleProductChange(r.key, e.target.value)}>
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}
                                disabled={takenElsewhere.includes(String(p.id))}>
                                {p.sku} - {p.product_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="number" min="1" className="form-control"
                            value={r.quantity}
                            onChange={(e) => updateRow(r.key, { quantity: e.target.value })} />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01" className="form-control"
                            value={r.unit_cost}
                            onChange={(e) => updateRow(r.key, { unit_cost: e.target.value })} />
                        </td>
                        <td className="text-end">
                          {money((Number(r.quantity) || 0) * (Number(r.unit_cost) || 0))}
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
          </>
        )}

        <button className="btn btn-primary me-2" disabled={saving || !supplierId}>
          {saving ? 'Saving...' : 'Create Purchase Order'}
        </button>
        <Link to="/purchases" className="btn btn-outline-secondary">
          Cancel
        </Link>
      </form>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { createProduct, getProduct, updateProduct } from '../services/productService'
import { getSuppliers } from '../services/supplierService'

const empty = {
  sku: '',
  product_name: '',
  category: '',
  cost_price: '',
  selling_price: '',
  reorder_level: 10,
  supplier: '',
  is_active: true,
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [stock, setStock] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const requests = [getSuppliers()]
    if (isEdit) requests.push(getProduct(id))
    Promise.all(requests)
      .then(([supplierList, p]) => {
        setSuppliers(supplierList)
        if (p) {
          setStock(p.stock_quantity)
          setForm({
            sku: p.sku,
            product_name: p.product_name,
            category: p.category,
            cost_price: p.cost_price,
            selling_price: p.selling_price,
            reorder_level: p.reorder_level,
            supplier: p.supplier,
            is_active: p.is_active,
          })
        }
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      reorder_level: Number(form.reorder_level),
      supplier: Number(form.supplier),
    }
    try {
      if (isEdit) await updateProduct(id, payload)
      else await createProduct(payload)
      navigate('/products')
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  if (!isEdit && suppliers.length === 0) {
    return (
      <p>
        Add a supplier first. <Link to="/suppliers/new">Create supplier</Link>
      </p>
    )
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>{isEdit ? 'Edit Product' : 'Add Product'}</h2>
      <ErrorMessage message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit}>
        <div className="row g-3 mb-3">
          <div className="col-md-5">
            <label className="form-label">SKU</label>
            <input className="form-control" name="sku" value={form.sku}
              onChange={handleChange} required />
          </div>
          <div className="col-md-7">
            <label className="form-label">Product name</label>
            <input className="form-control" name="product_name" value={form.product_name}
              onChange={handleChange} required />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <input className="form-control" name="category" value={form.category}
              onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Supplier</label>
            <select className="form-select" name="supplier" value={form.supplier}
              onChange={handleChange} required>
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.company_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Cost price</label>
            <input type="number" step="0.01" min="0" className="form-control"
              name="cost_price" value={form.cost_price} onChange={handleChange} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Selling price</label>
            <input type="number" step="0.01" min="0" className="form-control"
              name="selling_price" value={form.selling_price} onChange={handleChange} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Reorder level</label>
            <input type="number" min="0" className="form-control"
              name="reorder_level" value={form.reorder_level} onChange={handleChange} required />
          </div>
        </div>

        {isEdit && (
          <>
            <div className="mb-3">
              <label className="form-label">Stock quantity</label>
              <input className="form-control" value={stock ?? ''} disabled />
              <div className="form-text">
                Stock changes only through received purchases and confirmed sales.
              </div>
            </div>
            <div className="form-check mb-3">
              <input id="isActive" type="checkbox" className="form-check-input"
                name="is_active" checked={form.is_active} onChange={handleChange} />
              <label htmlFor="isActive" className="form-check-label">Active</label>
            </div>
          </>
        )}

        <button className="btn btn-primary me-2" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <Link to="/products" className="btn btn-outline-secondary">
          Cancel
        </Link>
      </form>
    </div>
  )
}
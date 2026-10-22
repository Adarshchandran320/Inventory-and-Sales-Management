import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConfirmDelete from '../components/ConfirmDelete'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { deleteProduct, getProducts } from '../services/productService'
import { money } from '../utils/format'

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const supplierId = searchParams.get('supplier') || ''

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState(searchParams.get('active') || '')
  const [lowStock, setLowStock] = useState(searchParams.get('low_stock') === 'true')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Category dropdown options come from the full, unfiltered list
  useEffect(() => {
    getProducts()
      .then((all) => setCategories([...new Set(all.map((p) => p.category))].sort()))
      .catch(() => {})
  }, [reloadKey])

  useEffect(() => {
    const params = {}
    if (search) params.search = search
    if (category) params.category = category
    if (active) params.active = active
    if (lowStock) params.low_stock = 'true'
    if (supplierId) params.supplier = supplierId

    const timer = setTimeout(() => {
      setLoading(true)
      getProducts(params)
        .then((data) => {
          setProducts(data)
          setError('')
        })
        .catch((e) => setError(getErrorMessage(e)))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search, category, active, lowStock, supplierId, reloadKey])

  const confirmDelete = async () => {
    try {
      const result = await deleteProduct(toDelete.id)
      setNotice(
        result?.is_active === false
          ? `"${toDelete.product_name}" has transaction history, so it was deactivated instead of deleted.`
          : `"${toDelete.product_name}" was deleted.`,
      )
      setToDelete(null)
      setReloadKey((k) => k + 1)
    } catch (e) {
      setToDelete(null)
      setError(getErrorMessage(e))
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Products</h2>
        <Link to="/products/new" className="btn btn-primary">
          Add Product
        </Link>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input className="form-control" placeholder="Search by name or SKU"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={active}
            onChange={(e) => setActive(e.target.value)}>
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <div className="form-check">
            <input id="lowStock" type="checkbox" className="form-check-input"
              checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
            <label htmlFor="lowStock" className="form-check-label">Low stock only</label>
          </div>
        </div>
      </div>

      {supplierId && (
        <div className="mb-3">
          <span className="badge text-bg-info me-2">Supplier #{supplierId}</span>
          <button className="btn btn-sm btn-link" onClick={() => setSearchParams({})}>
            Clear supplier filter
          </button>
        </div>
      )}

      <ErrorMessage message={error} onClose={() => setError('')} />
      {notice && (
        <div className="alert alert-info d-flex justify-content-between">
          <span>{notice}</span>
          <button className="btn-close" onClick={() => setNotice('')} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <p className="text-muted">No products found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Supplier</th>
                <th className="text-end">Cost</th>
                <th className="text-end">Price</th>
                <th className="text-end">Stock</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock_quantity <= p.reorder_level
                return (
                  <tr key={p.id} className={low && p.is_active ? 'table-warning' : ''}>
                    <td>{p.sku}</td>
                    <td>{p.product_name}</td>
                    <td>{p.category}</td>
                    <td>{p.supplier_name}</td>
                    <td className="text-end">{money(p.cost_price)}</td>
                    <td className="text-end">{money(p.selling_price)}</td>
                    <td className="text-end">
                      {p.stock_quantity}
                      {low && p.is_active && (
                        <span className="badge text-bg-warning ms-1">Low</span>
                      )}
                    </td>
                    <td><StatusBadge status={p.is_active ? 'Active' : 'Inactive'} /></td>
                    <td className="text-end">
                      <Link to={`/products/${p.id}/edit`}
                        className="btn btn-sm btn-outline-primary me-1">Edit</Link>
                      <button className="btn btn-sm btn-outline-danger"
                        onClick={() => setToDelete(p)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDelete
        show={Boolean(toDelete)}
        message={`Delete "${toDelete?.product_name}"? Products with sales or purchase history are deactivated instead.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
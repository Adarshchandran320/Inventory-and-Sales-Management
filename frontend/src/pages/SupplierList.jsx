import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDelete from '../components/ConfirmDelete'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { deleteSupplier, getSuppliers } from '../services/supplierService'

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // 300ms debounce so we don't call the API on every keystroke
    const timer = setTimeout(() => {
      setLoading(true)
      getSuppliers(search ? { search } : {})
        .then((data) => {
          setSuppliers(data)
          setError('')
        })
        .catch((e) => setError(getErrorMessage(e)))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search, reloadKey])

  const confirmDelete = async () => {
    try {
      await deleteSupplier(toDelete.id)
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
        <h2 className="mb-0">Suppliers</h2>
        <Link to="/suppliers/new" className="btn btn-primary">
          Add Supplier
        </Link>
      </div>

      <input
        className="form-control mb-3"
        placeholder="Search by company, contact or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ErrorMessage message={error} onClose={() => setError('')} />

      {loading ? (
        <Loading />
      ) : suppliers.length === 0 ? (
        <p className="text-muted">No suppliers found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.company_name}</td>
                  <td>{s.contact_person || '-'}</td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td className="text-end">
                    <Link
                      to={`/products?supplier=${s.id}`}
                      className="btn btn-sm btn-outline-secondary me-1"
                    >
                      Products
                    </Link>
                    <Link
                      to={`/suppliers/${s.id}/edit`}
                      className="btn btn-sm btn-outline-primary me-1"
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setToDelete(s)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDelete
        show={Boolean(toDelete)}
        message={`Delete supplier "${toDelete?.company_name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
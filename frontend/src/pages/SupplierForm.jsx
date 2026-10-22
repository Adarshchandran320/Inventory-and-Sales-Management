import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { createSupplier, getSupplier, updateSupplier } from '../services/supplierService'

const empty = { company_name: '', contact_person: '', email: '', phone: '' }

export default function SupplierForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    getSupplier(id)
      .then((s) =>
        setForm({
          company_name: s.company_name,
          contact_person: s.contact_person,
          email: s.email,
          phone: s.phone,
        }),
      )
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEdit) await updateSupplier(id, form)
      else await createSupplier(form)
      navigate('/suppliers')
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 560 }}>
      <h2>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
      <ErrorMessage message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Company name</label>
          <input className="form-control" name="company_name" value={form.company_name}
            onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Contact person</label>
          <input className="form-control" name="contact_person" value={form.contact_person}
            onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" name="email" value={form.email}
            onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Phone</label>
          <input className="form-control" name="phone" value={form.phone}
            onChange={handleChange} required />
        </div>
        <button className="btn btn-primary me-2" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <Link to="/suppliers" className="btn btn-outline-secondary">
          Cancel
        </Link>
      </form>
    </div>
  )
}
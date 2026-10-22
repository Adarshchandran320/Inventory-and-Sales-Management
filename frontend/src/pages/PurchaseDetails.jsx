import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDelete from '../components/ConfirmDelete'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { cancelPurchase, getPurchase, receivePurchase } from '../services/purchaseService'
import { formatDate, money } from '../utils/format'

export default function PurchaseDetails() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(null) // 'receive' | 'cancel' | null
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return getPurchase(id)
      .then(setOrder)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async () => {
    const action = pending
    setPending(null)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated =
        action === 'receive' ? await receivePurchase(id) : await cancelPurchase(id)
      setOrder(updated)
      setNotice(
        action === 'receive'
          ? 'Order received. Stock has been updated.'
          : 'Order cancelled.',
      )
    } catch (e) {
      setError(getErrorMessage(e))
      await load() // the page was stale: show the real current status
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!order) return <ErrorMessage message={error || 'Purchase order not found.'} />

  const canAct = order.status === 'Draft' || order.status === 'Ordered'

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          Purchase Order #{order.id} <StatusBadge status={order.status} />
        </h2>
        <Link to="/purchases" className="btn btn-outline-secondary">
          Back to list
        </Link>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />
      {notice && (
        <div className="alert alert-success d-flex justify-content-between">
          <span>{notice}</span>
          <button className="btn-close" onClick={() => setNotice('')} />
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body row">
          <div className="col-md-4">
            <div className="text-muted small">Supplier</div>
            <div>{order.supplier_name}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Order date</div>
            <div>{formatDate(order.order_date)}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Received</div>
            <div>{order.received_at ? formatDate(order.received_at) : '-'}</div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="text-end">Quantity</th>
              <th className="text-end">Unit cost</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.sku}</td>
                <td>{i.product_name}</td>
                <td className="text-end">{i.quantity}</td>
                <td className="text-end">{money(i.unit_cost)}</td>
                <td className="text-end">{money(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan="4" className="text-end">Total</th>
              <th className="text-end">{money(order.total_amount)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      {canAct && (
        <div className="d-flex gap-2">
          <button className="btn btn-success" disabled={busy}
            onClick={() => setPending('receive')}>
            Receive Order
          </button>
          <button className="btn btn-outline-danger" disabled={busy}
            onClick={() => setPending('cancel')}>
            Cancel Order
          </button>
        </div>
      )}

      <ConfirmDelete
        show={pending === 'receive'}
        title="Receive this order?"
        message="Stock for every item will increase. This can only be done once."
        confirmLabel="Receive"
        confirmClass="btn-success"
        onConfirm={runAction}
        onCancel={() => setPending(null)}
      />
      <ConfirmDelete
        show={pending === 'cancel'}
        title="Cancel this order?"
        message="A cancelled order can no longer be received."
        confirmLabel="Cancel order"
        onConfirm={runAction}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
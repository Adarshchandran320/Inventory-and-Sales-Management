const colors = {
  Draft: 'secondary',
  Ordered: 'primary',
  Received: 'success',
  Confirmed: 'success',
  Cancelled: 'danger',
  Active: 'success',
  Inactive: 'secondary',
}

export default function StatusBadge({ status }) {
  return <span className={`badge text-bg-${colors[status] || 'light'}`}>{status}</span>
}
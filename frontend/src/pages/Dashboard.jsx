import { useEffect, useState } from 'react'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import { getErrorMessage } from '../services/api'
import { getDashboard } from '../services/dashboardService'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
  }, [])

  if (error) return <ErrorMessage message={error} />
  if (!data) return <Loading />
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
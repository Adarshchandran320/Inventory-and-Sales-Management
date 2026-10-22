import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'

const Soon = ({ name }) => <p className="text-muted">{name} page comes in Phase 8.</p>

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Soon name="Products" />} />
          <Route path="/suppliers" element={<Soon name="Suppliers" />} />
          <Route path="/purchases" element={<Soon name="Purchases" />} />
          <Route path="/sales" element={<Soon name="Sales" />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import ProductForm from './pages/ProductForm'
import ProductList from './pages/ProductList'
import SupplierForm from './pages/SupplierForm'
import SupplierList from './pages/SupplierList'

const Soon = ({ name }) => <p className="text-muted">{name} page comes in the next step.</p>

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/suppliers/new" element={<SupplierForm />} />
          <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="/purchases" element={<Soon name="Purchases" />} />
          <Route path="/sales" element={<Soon name="Sales" />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
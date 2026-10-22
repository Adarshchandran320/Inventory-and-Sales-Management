import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import ProductForm from './pages/ProductForm'
import ProductList from './pages/ProductList'
import PurchaseDetails from './pages/PurchaseDetails'
import PurchaseForm from './pages/PurchaseForm'
import PurchaseList from './pages/PurchaseList'
import SaleDetails from './pages/SaleDetails'
import SaleForm from './pages/SaleForm'
import SaleList from './pages/SaleList'
import SupplierForm from './pages/SupplierForm'
import SupplierList from './pages/SupplierList'

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
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/purchases/new" element={<PurchaseForm />} />
          <Route path="/purchases/:id" element={<PurchaseDetails />} />
          <Route path="/sales" element={<SaleList />} />
          <Route path="/sales/new" element={<SaleForm />} />
          <Route path="/sales/:id" element={<SaleDetails />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
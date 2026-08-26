import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import Store from './components/Store'
import Cart from './components/Cart'
import Shipping from './components/Shipping'
import AdminOrders from './components/AdminOrders'
import SitePage from './components/SitePage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/store" element={<Store />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/webtoon" element={<SitePage title="Webtoon" />} />
        <Route path="/pinya" element={<SitePage title="Pinya" />} />
        <Route path="/patreon" element={<SitePage title="Patreon" />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  )
}

export default App

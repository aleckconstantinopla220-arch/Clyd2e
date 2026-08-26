import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL } from '../config'
import '../styles/Home.css'
import '../styles/Store.css'

export default function SitePage({ title }) {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                cartCount={cart.length}
                onCartClick={() => navigate('/cart')}
                onAdminClick={() => navigate('/admin/orders')}
                isAdmin={isAdmin}
            />
            <div className="store-body">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="store-main module-page">
                    <p className="module-page-label">Clyd2e</p>
                    <h1 className="module-page-title">{title}</h1>
                    <p className="module-page-description">The {title} page is coming soon.</p>
                    <button type="button" className="back-home-button" onClick={() => navigate('/home')}>
                        Back to home
                    </button>
                </main>
            </div>
        </div>
    )
}
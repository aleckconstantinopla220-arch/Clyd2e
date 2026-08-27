import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_EMAIL, API_BASE_URL } from '../config'

export default function UpperTab({ isSidebarOpen, onToggleSidebar, cartCount = 0, onCartClick, onShippingClick, isVisible = true, isAdmin = false }) {
    const navigate = useNavigate()
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
    const [adminOrderCount, setAdminOrderCount] = useState(0)

    useEffect(() => {
        if (!isAdmin) {
            setAdminOrderCount(0)
            return
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const adminId = user.id || (user.email?.toLowerCase() === ADMIN_EMAIL ? 'admin001' : '')
        fetch(`${API_BASE_URL}/api/orders?adminId=${encodeURIComponent(adminId)}&adminEmail=${encodeURIComponent(user.email || '')}`)
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load orders')))
            .then(orders => setAdminOrderCount(orders.length))
            .catch(() => setAdminOrderCount(0))
    }, [isAdmin])

    const handleCartClick = () => {
        setIsAccountMenuOpen(false)
        onCartClick?.()
    }

    const handleShippingClick = () => {
        setIsAccountMenuOpen(false)
        onShippingClick?.()
    }

    const handleOrdersClick = () => {
        navigate('/admin/orders')
    }

    const handleRoleSwitch = () => {
        setIsAccountMenuOpen(false)
        if (isAdmin) {
            const previousUser = localStorage.getItem('userBeforeAdmin')
            if (previousUser) {
                localStorage.setItem('user', previousUser)
                localStorage.removeItem('userBeforeAdmin')
            } else {
                localStorage.removeItem('user')
            }
        } else {
            const currentUser = localStorage.getItem('user')
            if (currentUser) {
                localStorage.setItem('userBeforeAdmin', currentUser)
            }
            localStorage.setItem('user', JSON.stringify({
                id: 'admin001',
                username: 'admin',
                email: 'aleckconstantinopla220@gmail.com'
            }))
        }
        navigate('/home')
    }

    return (
        <nav className={`store-navbar ${!isVisible ? 'navbar-hidden' : ''}`}>
            <div className="nav-content">
                <button
                    className="sidebar-toggle-btn"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isSidebarOpen}
                >
                    <span className="sidebar-toggle-icon">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </button>
                <h1 className="store-logo">CLYD2E'S<span> STORE</span></h1>
                <div className="nav-right">
                    <button className="nav-icon-button cart-button" onClick={handleCartClick} aria-label={`Shopping cart with ${cartCount} items`} title="Shopping cart">
                        <span className="cart-icon" aria-hidden="true" />
                        {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                    </button>
                    <button className="nav-icon-button shipping-button" onClick={handleShippingClick} aria-label="Shipping orders" title="Shipping">
                        <span className="shipping-icon" aria-hidden="true" />
                    </button>
                    {isAdmin && (
                        <button className="nav-icon-button orders-button" onClick={handleOrdersClick} aria-label={`Admin orders with ${adminOrderCount} orders`} title="Admin orders">
                            <span className="orders-icon" aria-hidden="true" />
                            <span className="cart-count">{adminOrderCount}</span>
                        </button>
                    )}
                    <div className="account-menu">
                        <button
                            className="nav-icon-button"
                            onClick={() => setIsAccountMenuOpen(prev => !prev)}
                            aria-label="User account"
                            aria-expanded={isAccountMenuOpen}
                            aria-haspopup="menu"
                            title="User account"
                        >
                            <span className={`user-icon ${isAdmin ? 'admin-user-icon' : ''}`} aria-hidden="true" />
                        </button>
                        {isAccountMenuOpen && (
                            <div className="account-dropdown" role="menu">
                                <button type="button" role="menuitem" onClick={handleCartClick}>My Cart</button>
                                <button type="button" role="menuitem" onClick={handleShippingClick}>Shipping</button>
                                <button type="button" role="menuitem" onClick={handleRoleSwitch}>
                                    {isAdmin ? 'Switch to User' : 'Switch to Admin'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}

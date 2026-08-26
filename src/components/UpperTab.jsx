import { useState } from 'react'

const ADMIN_EMAIL = 'aleckconstantinopla220@gmail.com'

export default function UpperTab({ isSidebarOpen, onToggleSidebar, cartCount = 0, onCartClick, onShippingClick, isVisible = true, isAdmin = false }) {
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

    const handleAdminAccess = () => {
        const email = window.prompt('Enter the admin Gmail address')?.trim().toLowerCase()

        if (email !== ADMIN_EMAIL) {
            return
        }

        localStorage.setItem('user', JSON.stringify({
            id: 'admin001',
            username: 'admin',
            email: ADMIN_EMAIL,
            isAdmin: true
        }))
        window.location.reload()
    }

    const handleCartClick = () => {
        setIsAccountMenuOpen(false)
        onCartClick?.()
    }

    const handleShippingClick = () => {
        setIsAccountMenuOpen(false)
        onShippingClick?.()
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
                                <button type="button" role="menuitem" onClick={handleAdminAccess}>Admin access</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}

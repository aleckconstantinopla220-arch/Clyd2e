import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import UpperTab from './UpperTab'
import '../styles/Home.css'
import '../styles/Cart.css'
import '../styles/Shipping.css'

export default function Shipping() {
    const navigate = useNavigate()
    const [orders] = useState(() => JSON.parse(localStorage.getItem('orders') || '[]'))
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={false}
                onToggleSidebar={() => { }}
                onLogout={handleLogout}
                cartCount={cart.length}
                onCartClick={() => navigate('/cart')}
                onShippingClick={() => navigate('/shipping')}
            />
            <main className="shipping-page">
                <header className="shipping-header">
                    <div>
                        <p className="module-page-label">Delivery tracking</p>
                        <h1 className="module-page-title">Shipping</h1>
                        <p className="module-page-description">Your purchased items and delivery status.</p>
                    </div>
                    <button type="button" className="continue-shopping-button" onClick={() => navigate('/store')}>
                        Continue shopping
                    </button>
                </header>

                {orders.length === 0 ? (
                    <p className="empty-cart">No purchased items yet.</p>
                ) : (
                    <section className="shipping-items" aria-label="Purchased items for shipping">
                        {orders.map((product, index) => (
                            <article className="shipping-item" key={`${product.id}-${index}`}>
                                <div className="cart-item-image">{product.image}</div>
                                <div>
                                    <p className="product-category">{product.category}</p>
                                    <h2 className="product-name">{product.name}</h2>
                                </div>
                                <span className="shipping-status">Order confirmed</span>
                                <span className="product-price">{product.price}</span>
                            </article>
                        ))}
                    </section>
                )}
            </main>
        </div>
    )
}

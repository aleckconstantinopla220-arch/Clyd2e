import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UpperTab from './UpperTab'
import '../styles/Home.css'
import '../styles/Cart.css'

export default function Cart() {
    const navigate = useNavigate()
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
    const [purchaseMessage, setPurchaseMessage] = useState('')

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/login')
    }

    const removeItem = index => {
        setCart(currentCart => {
            const updatedCart = currentCart.filter((_, itemIndex) => itemIndex !== index)
            localStorage.setItem('cart', JSON.stringify(updatedCart))
            return updatedCart
        })
    }

    const cartTotal = cart.reduce((total, product) => total + Number(product.price.replace('$', '')), 0)

    const handlePurchase = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const previousOrders = JSON.parse(localStorage.getItem('orders') || '[]')
        localStorage.setItem('orders', JSON.stringify([...previousOrders, ...cart.map(product => ({ ...product, userId: user.id }))]))
        fetch('http://localhost:3001/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, items: cart })
        }).catch(() => {})
        localStorage.removeItem('cart')
        setCart([])
        setPurchaseMessage('Purchase complete. Thank you for your order.')
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
            <main className="cart-page">
                <header className="cart-header">
                    <div>
                        <p className="module-page-label">Your order</p>
                        <h1 className="module-page-title">My Cart</h1>
                        <p className="module-page-description">Items you have selected from the store.</p>
                    </div>
                    <button type="button" className="continue-shopping-button" onClick={() => navigate('/store')}>
                        Continue shopping
                    </button>
                </header>

                {cart.length === 0 ? (
                    <p className="empty-cart">{purchaseMessage || 'Your cart is empty.'}</p>
                ) : (
                    <>
                        <section className="cart-items" aria-label="Purchased items">
                            {cart.map((product, index) => (
                                <article className="cart-item" key={`${product.id}-${index}`}>
                                    <div className="cart-item-image">{product.image}</div>
                                    <div className="cart-item-details">
                                        <p className="product-category">{product.category}</p>
                                        <h2 className="product-name">{product.name}</h2>
                                    </div>
                                    <span className="product-price">{product.price}</span>
                                    <button type="button" className="remove-item-button" onClick={() => removeItem(index)}>
                                        Remove
                                    </button>
                                </article>
                            ))}
                        </section>
                        <footer className="cart-summary">
                            <span>Total: ${cartTotal.toFixed(2)}</span>
                            <button type="button" className="purchase-button" onClick={handlePurchase}>
                                Purchase
                            </button>
                        </footer>
                    </>
                )}
            </main>
        </div>
    )
}

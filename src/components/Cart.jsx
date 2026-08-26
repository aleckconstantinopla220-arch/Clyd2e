import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL } from '../config'
import '../styles/Home.css'
import '../styles/Cart.css'

export default function Cart() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
    const [purchaseMessage, setPurchaseMessage] = useState('')
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [customer, setCustomer] = useState({ name: '', email: '', address: '' })
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    const removeItem = index => {
        setCart(currentCart => {
            const updatedCart = currentCart.filter((_, itemIndex) => itemIndex !== index)
            localStorage.setItem('cart', JSON.stringify(updatedCart))
            return updatedCart
        })
    }

    const cartTotal = cart.reduce((total, product) => total + Number(product.price.replace('$', '')), 0)

    const handlePurchase = async event => {
        event.preventDefault()
        if (cart.length === 0 || isPurchasing) {
            setPurchaseMessage('Please add an item before purchasing.')
            return
        }

        setIsPurchasing(true)
        setPurchaseMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, customer })
            })

            if (!response.ok) {
                const result = await response.json().catch(() => ({}))
                throw new Error(result.error || 'Order could not be saved')
            }

            const { order } = await response.json()
            const previousOrders = JSON.parse(localStorage.getItem('orders') || '[]')
            localStorage.setItem('orders', JSON.stringify([...previousOrders, ...order.items.map(item => ({
                ...item,
                orderId: order.id,
                username: order.username,
                email: order.email,
                address: order.address,
                status: order.status,
                createdAt: order.createdAt
            }))]))
            localStorage.removeItem('cart')
            setCart([])
            setIsCheckoutOpen(false)
            setCustomer({ name: '', email: '', address: '' })
            setPurchaseMessage('Purchase complete. Thank you for your order.')
            navigate('/shipping')
        } catch (error) {
            setPurchaseMessage(`Purchase failed: ${error.message}`)
        } finally {
            setIsPurchasing(false)
        }
    }

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                onLogout={handleLogout}
                cartCount={cart.length}
                onCartClick={() => navigate('/cart')}
                onShippingClick={() => navigate('/shipping')}
                onAdminClick={() => navigate('/admin/orders')}
                isAdmin={isAdmin}
            />
            <div className="store-body">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
                                {purchaseMessage && <p className="purchase-message" role="alert">{purchaseMessage}</p>}
                                <button type="button" className="purchase-button" onClick={() => setIsCheckoutOpen(true)} disabled={isPurchasing}>
                                    Purchase
                                </button>
                            </footer>
                        </>
                    )}
                </main>
            </div>
            {isCheckoutOpen && (
                <div className="checkout-backdrop" onClick={() => setIsCheckoutOpen(false)}>
                    <form className="checkout-dialog" onSubmit={handlePurchase} onClick={event => event.stopPropagation()}>
                        <div className="checkout-header">
                            <div>
                                <p className="module-page-label">Checkout</p>
                                <h2>Complete your order</h2>
                            </div>
                            <button type="button" className="checkout-close" onClick={() => setIsCheckoutOpen(false)} aria-label="Close checkout">×</button>
                        </div>
                        <label>
                            Name
                            <input type="text" value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} required />
                        </label>
                        <label>
                            Email
                            <input type="email" value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} required />
                        </label>
                        <label>
                            Address
                            <textarea value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} required rows="3" />
                        </label>
                        <button type="submit" className="purchase-button" disabled={isPurchasing}>
                            {isPurchasing ? 'Processing...' : 'Purchase'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice, parsePrice } from '../config'
import '../styles/Home.css'
import '../styles/Cart.css'

export default function Cart() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
    const [orderedItems] = useState(() => JSON.parse(localStorage.getItem('orders') || '[]'))
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [purchaseMessage, setPurchaseMessage] = useState('')
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [customer, setCustomer] = useState({ name: '', email: '', address: '' })
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const sessionId = params.get('session_id')
        if (params.get('payment') === 'cancelled') {
            setPurchaseMessage('Payment was cancelled. Your cart is still here.')
            window.history.replaceState({}, '', '/cart')
            return
        }
        if (params.get('payment') !== 'success' || !sessionId) return

        setIsPurchasing(true)
        fetch(`${API_BASE_URL}/api/orders/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        })
            .then(async response => {
                const result = await response.json().catch(() => ({}))
                if (!response.ok) throw new Error(result.error || 'Payment could not be confirmed')
                return result.order
            })
            .then(order => {
                const previousOrders = JSON.parse(localStorage.getItem('orders') || '[]')
                const newItems = order.items.map(item => ({
                    ...item, orderId: order.id, username: order.username, email: order.email,
                    address: order.address, status: order.status, createdAt: order.createdAt
                }))
                const ordersWithoutCurrent = previousOrders.filter(item => item.orderId !== order.id)
                localStorage.setItem('orders', JSON.stringify([...ordersWithoutCurrent, ...newItems]))
                localStorage.removeItem('cart')
                setCart([])
                setPurchaseMessage('Purchase complete. Thank you for your order.')
                window.history.replaceState({}, '', '/cart')
                navigate('/shipping')
            })
            .catch(error => setPurchaseMessage(`Payment failed: ${error.message}`))
            .finally(() => setIsPurchasing(false))
    }, [navigate])

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

    const cartTotal = cart.reduce((total, product) => total + parsePrice(product.price), 0)
    const orderedGroups = orderedItems.reduce((groups, item) => {
        const orderKey = item.orderId || item.id
        if (!groups[orderKey]) {
            groups[orderKey] = { ...item, items: [] }
        }
        groups[orderKey].items.push(item)
        return groups
    }, {})

    const handlePurchase = async event => {
        event.preventDefault()
        if (cart.length === 0 || isPurchasing) {
            setPurchaseMessage('Please add an item before purchasing.')
            return
        }

        setIsPurchasing(true)
        setPurchaseMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/api/checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart.map(item => ({ id: item.id })), customer })
            })

            if (!response.ok) {
                const result = await response.json().catch(() => ({}))
                throw new Error(result.error || 'Order could not be saved')
            }

            const { url } = await response.json()
            window.location.assign(url)
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
                    </header>

                    {cart.length === 0 ? (
                        <>
                            <p className="empty-cart">{purchaseMessage || 'Your cart is empty.'}</p>
                            {orderedItems.length > 0 && (
                                <section className="ordered-items-section" aria-label="Items you have ordered">
                                    <h2 className="ordered-items-title">Items you have ordered</h2>
                                    <div className="ordered-items-cards">
                                        {Object.values(orderedGroups).map(order => (
                                            <article className="ordered-item-card" key={order.orderId || order.id} role="button" tabIndex="0" onClick={() => setSelectedOrder(order)} onKeyDown={event => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    setSelectedOrder(order)
                                                }
                                            }}>
                                                <div className="ordered-item-header">
                                                    <div>
                                                        <p className="product-category">Order {order.orderId || order.id}</p>
                                                        <p className="shipping-status">{order.status || 'Order confirmed'}</p>
                                                    </div>
                                                    <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                                                </div>
                                                <div className="ordered-item-footer">
                                                    <span>{order.email}</span>
                                                    <strong>Total: {formatPrice(order.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    ) : (
                        <>
                            <section className="cart-items" aria-label="Purchased items">
                                {cart.map((product, index) => (
                                    <article className="cart-item" key={`${product.id}-${index}`}>
                                        <div className="cart-item-image" aria-label={`${product.name} image`}>
                                            {product.image?.startsWith('data:image') || product.image?.startsWith('http') || product.image?.startsWith('/')
                                                ? <img src={product.image} alt={`${product.name} product`} />
                                                : <span>{product.image}</span>}
                                        </div>
                                        <div className="cart-item-details">
                                            <p className="product-category">{product.category}</p>
                                            <h2 className="product-name">{product.name}</h2>
                                        </div>
                                        <span className="product-price">{formatPrice(product.price)}</span>
                                        <button type="button" className="remove-item-button" onClick={() => removeItem(index)}>
                                            Remove
                                        </button>
                                    </article>
                                ))}
                            </section>
                            <footer className="cart-summary">
                                <span>Total: {formatPrice(cartTotal)}</span>
                                {purchaseMessage && <p className="purchase-message" role="alert">{purchaseMessage}</p>}
                                <button type="button" className="purchase-button" onClick={() => setIsCheckoutOpen(true)} disabled={isPurchasing}>
                                    Purchase
                                </button>
                            </footer>
                        </>
                    )}
                    <button type="button" className="bottom-home-button" onClick={() => navigate('/store')}>
                        Back to Store
                    </button>
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
            {selectedOrder && (
                <div className="ordered-details-backdrop" onClick={() => setSelectedOrder(null)}>
                    <section className="ordered-details-dialog" role="dialog" aria-modal="true" aria-labelledby="ordered-details-title" onClick={event => event.stopPropagation()}>
                        <div className="ordered-details-header">
                            <div>
                                <p className="module-page-label">Purchased order</p>
                                <h2 id="ordered-details-title">Order details</h2>
                                <p>{selectedOrder.email}</p>
                                {selectedOrder.address && <p className="ordered-details-address">{selectedOrder.address}</p>}
                            </div>
                            <button type="button" className="checkout-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details">×</button>
                        </div>
                        <div className="ordered-details-items">
                            {selectedOrder.items.map((item, index) => (
                                <div className="ordered-details-item" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <span>{item.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="ordered-details-summary">
                            <span>{selectedOrder.status || 'Order confirmed'}</span>
                            <strong>Total: {formatPrice(selectedOrder.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

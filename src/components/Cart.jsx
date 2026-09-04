import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice, parsePrice, saveCart, savePurchasedOrder } from '../config'
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
    const [selectedPurchaseType, setSelectedPurchaseType] = useState(() => {
        const params = new URLSearchParams(window.location.search)
        return params.get('purchaseType') === 'preorder' ? 'preorder' : 'regular'
    })
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const sessionId = params.get('session_id') || localStorage.getItem('paymongo-session-id')
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
                savePurchasedOrder(order)
                localStorage.removeItem('cart')
                localStorage.removeItem('paymongo-session-id')
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

    const adjustCartQuantity = (product, amount) => {
        setCart(currentCart => {
            const productItems = currentCart.filter(item => item.id === product.id)
            let updatedCart
            if (amount > 0) {
                updatedCart = [...currentCart, product]
            } else if (productItems.length > 1) {
                const removedIndex = currentCart.findIndex(item => item.id === product.id)
                updatedCart = currentCart.filter((_, index) => index !== removedIndex)
            } else {
                updatedCart = currentCart
            }
            saveCart(updatedCart)
            return updatedCart
        })
    }

    const hasPreOrderItems = cart.some(item => item.preOrderOnly)
    const hasRegularItems = cart.some(item => !item.preOrderOnly)

    useEffect(() => {
        if (selectedPurchaseType === 'regular' && !hasRegularItems && hasPreOrderItems) setSelectedPurchaseType('preorder')
        if (selectedPurchaseType === 'preorder' && !hasPreOrderItems && hasRegularItems) setSelectedPurchaseType('regular')
    }, [hasPreOrderItems, hasRegularItems, selectedPurchaseType])

    const purchaseTabs = []
    if (hasRegularItems) purchaseTabs.push({ key: 'regular', label: 'Purchase' })
    if (hasPreOrderItems) purchaseTabs.push({ key: 'preorder', label: 'Pre-order Purchase' })

    const cartTotal = cart.reduce((total, product) => total + parsePrice(product.price), 0)
    const visibleCartItems = selectedPurchaseType === 'preorder'
        ? cart.filter(item => item.preOrderOnly)
        : cart.filter(item => !item.preOrderOnly)
    const groupedCart = Object.values(visibleCartItems.reduce((groups, product) => {
        const key = String(product.id)
        if (!groups[key]) groups[key] = { ...product, quantity: 0 }
        groups[key].quantity += 1
        return groups
    }, {}))
    const visibleCartTotal = visibleCartItems.reduce((total, product) => total + parsePrice(product.price), 0)
    const orderedGroups = orderedItems.reduce((groups, item) => {
        const orderKey = item.orderId || item.id
        if (!groups[orderKey]) {
            groups[orderKey] = { ...item, items: [] }
        }
        groups[orderKey].items.push(item)
        return groups
    }, {})

    const handlePurchase = () => {
        const selectedTabItems = selectedPurchaseType === 'preorder'
            ? cart.filter(item => item.preOrderOnly)
            : cart.filter(item => !item.preOrderOnly)

        if (selectedTabItems.length === 0 || isPurchasing) {
            setPurchaseMessage(selectedPurchaseType === 'preorder' ? 'Please add a pre-order item before purchasing.' : 'Please add an item before purchasing.')
            return
        }

        navigate(`/payment?purchaseType=${selectedPurchaseType}`)
    }

    const removeCartProduct = product => {
        setCart(currentCart => {
            const updatedCart = currentCart.filter(item => item.id !== product.id || item.preOrderOnly !== product.preOrderOnly)
            const hasPreOrderItemsAfterRemoval = updatedCart.some(item => item.preOrderOnly)
            const hasRegularItemsAfterRemoval = updatedCart.some(item => !item.preOrderOnly)
            if (selectedPurchaseType === 'preorder' && !hasPreOrderItemsAfterRemoval && hasRegularItemsAfterRemoval) setSelectedPurchaseType('regular')
            if (selectedPurchaseType === 'regular' && !hasRegularItemsAfterRemoval && hasPreOrderItemsAfterRemoval) setSelectedPurchaseType('preorder')
            saveCart(updatedCart)
            return updatedCart
        })
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
                            {purchaseTabs.length > 1 && (
                                <div className="purchase-tabs" role="tablist" aria-label="Purchase type tabs">
                                    {purchaseTabs.map(tab => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            role="tab"
                                            className={`purchase-tab ${selectedPurchaseType === tab.key ? 'active' : ''}`}
                                            aria-selected={selectedPurchaseType === tab.key}
                                            onClick={() => setSelectedPurchaseType(tab.key)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <section className="cart-items" aria-label="Purchased items">
                                {groupedCart.map(product => (
                                    <article className="cart-item" key={product.id}>
                                        <div className="cart-item-image" aria-label={`${product.name} image`}>
                                            {product.image?.startsWith('data:image') || product.image?.startsWith('http') || product.image?.startsWith('/')
                                                ? <img src={product.image} alt={`${product.name} product`} />
                                                : <span>{product.image}</span>}
                                        </div>
                                        <div className="cart-item-details">
                                            <p className="product-category">{product.category}</p>
                                            <h2 className="product-name">{product.name}</h2>
                                            <div className="cart-item-quantity">
                                                <span>Quantity</span>
                                                <span className="cart-quantity-stepper">
                                                    <button type="button" onClick={() => adjustCartQuantity(product, -1)} disabled={product.quantity === 1} aria-label={`Decrease quantity for ${product.name}`}>-</button>
                                                    <span>{product.quantity}</span>
                                                    <button type="button" onClick={() => adjustCartQuantity(product, 1)} aria-label={`Increase quantity for ${product.name}`}>+</button>
                                                </span>
                                            </div>
                                            <div className="cart-item-footer">
                                                <span className="product-price">{formatPrice(product.price)}</span>
                                                <button type="button" className="remove-item-button" onClick={() => removeCartProduct(product)}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </section>
                            <footer className="cart-summary">
                                <span>Total: {formatPrice(visibleCartTotal)}</span>
                                {purchaseMessage && <p className="purchase-message" role="alert">{purchaseMessage}</p>}
                                <button type="button" className="purchase-button" onClick={handlePurchase} disabled={isPurchasing}>
                                    {selectedPurchaseType === 'preorder' ? 'Purchase Pre-Order' : 'Purchase'}
                                </button>
                            </footer>
                        </>
                    )}
                    <button type="button" className="bottom-home-button" onClick={() => navigate('/store')}>
                        Back to Store
                    </button>
                </main>
            </div>
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

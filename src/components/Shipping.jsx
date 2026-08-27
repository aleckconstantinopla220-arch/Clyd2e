import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice, parsePrice } from '../config'
import '../styles/Home.css'
import '../styles/Cart.css'
import '../styles/Shipping.css'

export default function Shipping() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('orders') || '[]'))
    const [selectedOrder, setSelectedOrder] = useState(null)
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    useEffect(() => {
        const refreshStatuses = () => {
            const orderIds = [...new Set(orders.map(item => item.orderId).filter(Boolean))]
            const cachedStatuses = Object.fromEntries(orderIds
                .map(orderId => [orderId, localStorage.getItem(`order-status-${orderId}`)])
                .filter(([, status]) => status))

            if (Object.keys(cachedStatuses).length > 0) {
                setOrders(currentOrders => {
                    const updatedOrders = currentOrders.map(item => cachedStatuses[item.orderId]
                        ? { ...item, status: cachedStatuses[item.orderId] }
                        : item)
                    if (JSON.stringify(updatedOrders) === JSON.stringify(currentOrders)) return currentOrders
                    localStorage.setItem('orders', JSON.stringify(updatedOrders))
                    return updatedOrders
                })
            }

            if (orderIds.length === 0) return

            Promise.all(orderIds.map(orderId =>
                fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/status`)
                    .then(response => response.ok ? response.json() : null)
                    .catch(() => null)
            )).then(statuses => {
                const statusById = Object.fromEntries(statuses.filter(Boolean).map(order => [order.id, order.status]))
                if (Object.keys(statusById).length === 0) return

                setOrders(currentOrders => {
                    const updatedOrders = currentOrders.map(item => statusById[item.orderId]
                        ? { ...item, status: statusById[item.orderId] }
                        : item)
                    if (JSON.stringify(updatedOrders) === JSON.stringify(currentOrders)) return currentOrders
                    localStorage.setItem('orders', JSON.stringify(updatedOrders))
                    return updatedOrders
                })
            })
        }

        refreshStatuses()
        const refreshTimer = window.setInterval(refreshStatuses, 5000)
        window.addEventListener('focus', refreshStatuses)
        document.addEventListener('visibilitychange', refreshStatuses)
        window.addEventListener('storage', refreshStatuses)
        return () => {
            window.clearInterval(refreshTimer)
            window.removeEventListener('focus', refreshStatuses)
            document.removeEventListener('visibilitychange', refreshStatuses)
            window.removeEventListener('storage', refreshStatuses)
        }
    }, [orders.map(item => item.orderId).filter(Boolean).join(',')])
    const orderGroups = orders.reduce((groups, item) => {
        const orderKey = item.orderId || item.id
        if (!groups[orderKey]) {
            groups[orderKey] = { ...item, items: [] }
        }
        groups[orderKey].items.push(item)
        return groups
    }, {})

    const isOrderCompleted = order => order.status === 'Order completed'

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
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
                <main className="shipping-page">
                    <header className="shipping-header">
                        <div>
                            <p className="module-page-label">Delivery tracking</p>
                            <h1 className="module-page-title">Shipping</h1>
                            <p className="module-page-description">Your purchased items and delivery status.</p>
                        </div>
                    </header>

                    {orders.length === 0 ? (
                        <p className="empty-cart">No purchased items yet.</p>
                    ) : (
                        <section className="shipping-items" aria-label="Purchased orders">
                            {Object.values(orderGroups).map(order => (
                                <article className="shipping-order-card" key={order.orderId || order.id} role="button" tabIndex="0" onClick={() => setSelectedOrder(order)} onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        setSelectedOrder(order)
                                    }
                                }}>
                                    <div className="shipping-order-heading">
                                        <div>
                                            <p className="product-category">Order {order.orderId || order.id}</p>
                                            <p className="shipping-order-email">{order.email}</p>
                                        </div>
                                        <span className="shipping-status">{order.status || 'Purchased'}</span>
                                    </div>
                                    <div className="shipping-order-footer">
                                        <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                                        <strong>Total: {formatPrice(order.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong>
                                    </div>
                                    <div className={`shipping-status-bar ${isOrderCompleted(order) ? 'completed' : 'ongoing'}`} aria-label={isOrderCompleted(order) ? 'Order completed' : 'Order ongoing'}>
                                        <span className="shipping-status-bar-fill" />
                                    </div>
                                    <p className="shipping-status-label">{isOrderCompleted(order) ? 'Completed' : 'Ongoing'}</p>
                                </article>
                            ))}
                        </section>
                    )}
                    <button type="button" className="bottom-home-button" onClick={() => navigate('/store')}>
                        Back to Store
                    </button>
                </main>
            </div>
            {selectedOrder && (
                <div className="shipping-modal-backdrop" onClick={() => setSelectedOrder(null)}>
                    <section className="shipping-modal" role="dialog" aria-modal="true" aria-labelledby="shipping-order-title" onClick={event => event.stopPropagation()}>
                        <div className="shipping-modal-header">
                            <div>
                                <p className="module-page-label">Your order</p>
                                <h2 id="shipping-order-title">Order details</h2>
                                <p>{selectedOrder.email}</p>
                                {selectedOrder.address && <p className="shipping-address">{selectedOrder.address}</p>}
                            </div>
                            <button type="button" className="shipping-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details">×</button>
                        </div>
                        <div className="shipping-modal-items">
                            {selectedOrder.items.map((item, index) => (
                                <div className="shipping-modal-item" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <span>{item.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="shipping-modal-summary">
                            <span>{selectedOrder.status || 'Purchased'}</span>
                            <strong>Total: {formatPrice(selectedOrder.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong>
                        </div>
                        <div className={`shipping-status-bar ${isOrderCompleted(selectedOrder) ? 'completed' : 'ongoing'}`} aria-label={isOrderCompleted(selectedOrder) ? 'Order completed' : 'Order ongoing'}>
                            <span className="shipping-status-bar-fill" />
                        </div>
                        <p className="shipping-status-label">{isOrderCompleted(selectedOrder) ? 'Completed' : 'Ongoing'}</p>
                    </section>
                </div>
            )}
        </div>
    )
}

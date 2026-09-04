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
    const [activeTab, setActiveTab] = useState('pending')
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
                    .then(response => response.ok ? response.json() : response.status === 404 ? { id: orderId, missing: true } : null)
                    .catch(() => null)
            )).then(statuses => {
                const validStatuses = statuses.filter(order => order && !order.missing)
                const statusById = Object.fromEntries(validStatuses.map(order => [order.id, order.status]))
                const missingOrderIds = new Set(statuses.filter(order => order?.missing).map(order => order.id))
                if (Object.keys(statusById).length === 0 && missingOrderIds.size === 0) return

                setOrders(currentOrders => {
                    const updatedOrders = currentOrders
                        .filter(item => !missingOrderIds.has(item.orderId))
                        .map(item => statusById[item.orderId] ? { ...item, status: statusById[item.orderId] } : item)
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
        if (!groups[orderKey]) groups[orderKey] = { ...item, items: [] }
        groups[orderKey].items.push(item)
        return groups
    }, {})
    const sortedOrders = Object.values(orderGroups).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

    const getOrderProgress = order => {
        if (order.status === 'Refunded') return 'refunded'
        if (['Completed', 'Completion listed', 'Shipped'].includes(order.status)) return 'completed'
        if (order.status === 'Order completed') return 'shipping'
        return 'pending'
    }

    const getProgressLabel = order => {
        const progress = getOrderProgress(order)
        return progress === 'completed' ? 'Completed' : progress === 'shipping' ? 'Shipping' : progress === 'refunded' ? 'Refunded' : 'Pending'
    }
    const isPreOrder = order => order.items.some(item => item.preOrderOnly === true)
    const visibleOrders = sortedOrders.filter(order => getOrderProgress(order) === activeTab)

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    return (
        <div className="store-container">
            <UpperTab isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} onLogout={handleLogout} cartCount={cart.length} onCartClick={() => navigate('/cart')} onShippingClick={() => navigate('/shipping')} onAdminClick={() => navigate('/admin/orders')} isAdmin={isAdmin} />
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
                    <div className="shipping-tab-group" role="tablist" aria-label="Order status filters">
                        {[
                            ['pending', 'Pending'],
                            ['shipping', 'Shipping'],
                            ['completed', 'Completion'],
                            ['refunded', 'Refunded']
                        ].map(([key, label]) => (
                            <button key={key} type="button" role="tab" className={`shipping-tab-button ${activeTab === key ? 'active' : ''}`} aria-selected={activeTab === key} onClick={() => setActiveTab(key)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {orders.length === 0 ? <p className="empty-cart">No purchased items yet.</p> : visibleOrders.length === 0 ? <p className="empty-cart">No {activeTab === 'completed' ? 'completion' : activeTab} orders yet.</p> : (
                        <section className="shipping-items" aria-label="Purchased orders">
                            {visibleOrders.map(order => (
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
                                        <span className={`shipping-status-tag ${getOrderProgress(order)}`}>{getProgressLabel(order)}</span>
                                    </div>
                                    <span className={`shipping-order-type-tag ${isPreOrder(order) ? 'preorder' : 'regular'}`}>
                                        {isPreOrder(order) ? 'Pre-Order' : 'Regular Purchase'}
                                    </span>
                                    <div className="shipping-order-footer">
                                        <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                                        <strong>Total: {formatPrice(order.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong>
                                    </div>
                                    <div className="shipping-order-preview" aria-label="Products in this order">
                                        {order.items.slice(0, 3).map((item, index) => <div className="shipping-order-preview-image" key={`${item.id}-${index}`}>
                                            {item.image?.startsWith('data:image') || item.image?.startsWith('http') || item.image?.startsWith('/') ? <img src={item.image} alt={`${item.name} product`} /> : <span>{item.image || item.name}</span>}
                                        </div>)}
                                    </div>
                                    <div className={`shipping-status-bar ${getOrderProgress(order)}`} aria-label={`${getProgressLabel(order)} order progress`}><span className="shipping-status-bar-fill" /></div>
                                    <p className="shipping-status-label">{getProgressLabel(order)}</p>
                                </article>
                            ))}
                        </section>
                    )}
                    <button type="button" className="bottom-home-button" onClick={() => navigate('/store')}>Back to Store</button>
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
                            {selectedOrder.items.map((item, index) => <div className="shipping-modal-item" key={`${item.id}-${index}`}>
                                <div className="shipping-modal-product">
                                    <div className="shipping-modal-image">{item.image?.startsWith('data:image') || item.image?.startsWith('http') || item.image?.startsWith('/') ? <img src={item.image} alt={`${item.name} product`} /> : <span>{item.image || item.name}</span>}</div>
                                    <span>{item.name}</span>
                                </div>
                                <span>{item.price}</span>
                            </div>)}
                        </div>
                        <div className="shipping-modal-summary"><span className={`shipping-status-tag ${getOrderProgress(selectedOrder)}`}>{getProgressLabel(selectedOrder)}</span><strong>Total: {formatPrice(selectedOrder.items.reduce((total, item) => total + parsePrice(item.price), 0))}</strong></div>
                        <span className={`shipping-order-type-tag ${isPreOrder(selectedOrder) ? 'preorder' : 'regular'}`}>
                            {isPreOrder(selectedOrder) ? 'Pre-Order' : 'Regular Purchase'}
                        </span>
                        <div className={`shipping-status-bar ${getOrderProgress(selectedOrder)}`} aria-label={`${getProgressLabel(selectedOrder)} order progress`}><span className="shipping-status-bar-fill" /></div>
                        <p className="shipping-status-label">{getProgressLabel(selectedOrder)}</p>
                    </section>
                </div>
            )}
        </div>
    )
}

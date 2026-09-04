import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice } from '../config'
import '../styles/Home.css'
import '../styles/AdminOrders.css'

export default function AdminOrders() {
    const navigate = useNavigate()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL
    const adminId = user.id || (isAdmin ? 'admin001' : '')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [orders, setOrders] = useState([])
    const [error, setError] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [orderToRemove, setOrderToRemove] = useState(null)
    const [orderToShip, setOrderToShip] = useState(null)

    useEffect(() => {
        if (!isAdmin) {
            navigate('/home', { replace: true })
            return
        }

        fetch(`${API_BASE_URL}/api/orders?adminId=${encodeURIComponent(adminId)}&adminEmail=${encodeURIComponent(user.email || '')}`)
            .then(response => response.ok ? response.json() : Promise.reject(new Error(`Unable to load orders (${response.status})`)))
            .then(setOrders)
            .catch(error => setError(error.message || 'Unable to load orders. Please check the server.'))
    }, [navigate, adminId, isAdmin])

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    const updateOrderStatus = (orderId, status) => {
        fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId, adminEmail: user.email, status })
        })
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to complete order')))
            .then(({ order: updatedOrder }) => {
                localStorage.setItem(`order-status-${updatedOrder.id}`, updatedOrder.status)
                setOrders(currentOrders => currentOrders.map(order => order.id === updatedOrder.id ? updatedOrder : order))
                setSelectedOrder(currentOrder => currentOrder?.id === updatedOrder.id ? updatedOrder : currentOrder)
            })
            .catch(() => setError('Unable to complete order. Please check the server.'))
    }

    const handleRefundOrder = orderId => {
        updateOrderStatus(orderId, 'Refunded')
        setActiveTab('pending')
        setOrderToRemove(null)
    }

    const confirmShipOrder = orderId => {
        updateOrderStatus(orderId, 'Order completed')
        setOrderToShip(null)
    }

    const confirmShippedOrder = orderId => {
        const nextStatus = activeTab === 'shipping' ? 'Completed' : 'Completion listed'

        updateOrderStatus(orderId, nextStatus)

        if (activeTab === 'shipping') {
            setActiveTab('completed')
        } else if (activeTab === 'completed') {
            setActiveTab('completion-list')
        }

        setOrderToRemove(null)
    }

    const isPreOrderOrder = order => {
        const status = (order.status || '').trim()
        const hasPreOrderItem = Array.isArray(order.items) && order.items.some(item => item.preOrderOnly === true)
        return hasPreOrderItem
            || ['Pre-order', 'Pre-Order', 'Preorder', 'pre-order', 'pre order', 'Pre Order'].includes(status)
            || /pre[- ]?order/i.test(status)
    }

    const [activeTab, setActiveTab] = useState('pending')
    const visibleOrders = [...orders]
        .filter(order => {
            if (activeTab === 'preorder') return isPreOrderOrder(order) && order.status !== 'Refunded'
            if (activeTab === 'pending') return ['Order confirmed', 'Purchased'].includes(order.status) && !isPreOrderOrder(order)
            if (activeTab === 'shipping') return order.status === 'Order completed' && !isPreOrderOrder(order)
            if (activeTab === 'completed') return ['Completed', 'Shipped'].includes(order.status) && !isPreOrderOrder(order)
            if (activeTab === 'completion-list') return order.status === 'Completion listed' && !isPreOrderOrder(order)
            if (activeTab === 'refunded') return order.status === 'Refunded'
            return true
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                onLogout={handleLogout}
                cartCount={0}
                onCartClick={() => navigate('/cart')}
                onShippingClick={() => navigate('/shipping')}
                isAdmin
            />
            <div className="store-body">
                <Sidebar
                    isOpen={isSidebarOpen}
                    categories={[]}
                    selectedCategory=""
                    onCategorySelect={() => { }}
                    onClose={() => setIsSidebarOpen(false)}
                    isAdmin
                    onOrdersClick={() => navigate('/admin/orders')}
                />
                <main className="admin-orders-page">
                    <header className="admin-orders-header">
                        <div>
                            <p className="module-page-label">Admin dashboard</p>
                            <h1 className="module-page-title">Orders</h1>
                            <p className="module-page-description">View purchases from every user.</p>
                        </div>
                        <span className="order-count">{visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'}</span>
                    </header>

                    {error && <p className="admin-orders-message">{error}</p>}
                    {!error && orders.length === 0 && <p className="admin-orders-message">No orders have been placed yet.</p>}

                    <div className="admin-order-tab-group" role="tablist" aria-label="Order status filters">
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'pending' ? 'active' : ''}`} aria-selected={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>Pending</button>
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'shipping' ? 'active' : ''}`} aria-selected={activeTab === 'shipping'} onClick={() => setActiveTab('shipping')}>Shipping</button>
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'completed' ? 'active' : ''}`} aria-selected={activeTab === 'completed'} onClick={() => setActiveTab('completed')}>Completed</button>
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'completion-list' ? 'active' : ''}`} aria-selected={activeTab === 'completion-list'} onClick={() => setActiveTab('completion-list')}>Completion List</button>
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'refunded' ? 'active' : ''}`} aria-selected={activeTab === 'refunded'} onClick={() => setActiveTab('refunded')}>Refunded</button>
                        <button type="button" role="tab" className={`admin-order-tab-button ${activeTab === 'preorder' ? 'active' : ''}`} aria-selected={activeTab === 'preorder'} onClick={() => setActiveTab('preorder')}>Pre-Order</button>
                    </div>

                    {!error && visibleOrders.length === 0 ? (
                        <p className="admin-orders-message">
                            No {activeTab === 'preorder' ? 'pre-order' : activeTab === 'pending' ? 'pending' : activeTab === 'shipping' ? 'shipping' : activeTab === 'completion-list' ? 'completion list' : activeTab === 'refunded' ? 'refunded' : 'completed'} items yet.
                        </p>
                    ) : (
                        <section className="admin-order-list" aria-label="Customer orders by status">
                            {visibleOrders.map(order => (
                                <article
                                    className="admin-order-card"
                                    key={order.id}
                                    role="button"
                                    tabIndex="0"
                                    onClick={() => setSelectedOrder(order)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault()
                                            setSelectedOrder(order)
                                        }
                                    }}
                                >
                                    <div className="admin-order-heading">
                                        <div>
                                            <p className="order-user">{order.username}{order.email ? ` · ${order.email}` : ''}</p>
                                            <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
                                        </div>
                                        <span className="shipping-status">{order.status}</span>
                                    </div>
                                    <span className={`admin-order-type-tag ${isPreOrderOrder(order) ? 'preorder' : 'regular'}`}>
                                        {isPreOrderOrder(order) ? 'Pre-Order' : 'Regular Purchase'}
                                    </span>
                                    <div className="admin-order-card-footer">
                                        <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                                        <strong>Total: {formatPrice(order.total)}</strong>
                                    </div>
                                    {order.address && !isPreOrderOrder(order) && <p className="order-address">Ship to: {order.address}</p>}
                                    {order.phone && <p className="order-address">Phone: {order.phone}</p>}
                                    {activeTab === 'refunded' || activeTab === 'completion-list' ? null : activeTab === 'preorder' ? (
                                        <div className="pending-order-actions">
                                            <button type="button" className="refund-order-button" onClick={event => {
                                                event.stopPropagation()
                                                handleRefundOrder(order.id)
                                            }}>
                                                Refund
                                            </button>
                                            <button type="button" className="complete-order-button" onClick={event => {
                                                event.stopPropagation()
                                                updateOrderStatus(order.id, 'Completed')
                                            }}>
                                                Complete
                                            </button>
                                        </div>
                                    ) : activeTab === 'pending' ? (
                                        <div className="pending-order-actions">
                                            <button type="button" className="refund-order-button" onClick={event => {
                                                event.stopPropagation()
                                                handleRefundOrder(order.id)
                                            }}>
                                                Refund
                                            </button>
                                            <button type="button" className="complete-order-button" onClick={event => {
                                                event.stopPropagation()
                                                setOrderToShip(order)
                                            }}>
                                                Ship Order
                                            </button>
                                        </div>
                                    ) : activeTab === 'shipping' && order.status === 'Order completed' ? (
                                        <div className="completed-order-actions">
                                            <button type="button" className="undo-order-button" onClick={event => {
                                                event.stopPropagation()
                                                updateOrderStatus(order.id, 'Order confirmed')
                                            }}>
                                                Undo
                                            </button>
                                            <button type="button" className="complete-order-button" onClick={event => {
                                                event.stopPropagation()
                                                setOrderToRemove(order)
                                            }}>
                                                Complete order
                                            </button>
                                        </div>
                                    ) : activeTab === 'completed' && ['Completed', 'Shipped'].includes(order.status) ? (
                                        <button type="button" className="complete-order-button" onClick={event => {
                                            event.stopPropagation()
                                            setOrderToRemove(order)
                                        }}>
                                            Complete
                                        </button>
                                    ) : (
                                        <button type="button" className="complete-order-button" onClick={event => {
                                            event.stopPropagation()
                                            updateOrderStatus(order.id, 'Order completed')
                                        }}>
                                            Complete order
                                        </button>
                                    )}
                                </article>
                            ))}
                        </section>
                    )}
                </main>
            </div>
            {selectedOrder && (
                <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
                    <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title" onClick={event => event.stopPropagation()}>
                        <div className="order-modal-header">
                            <div>
                                <p className="module-page-label">Customer order</p>
                                <h2 id="order-modal-title">{selectedOrder.username}</h2>
                                <p>{selectedOrder.email}</p>
                                {selectedOrder.phone && <p className="order-address-detail">Phone: {selectedOrder.phone}</p>}
                                {selectedOrder.address && (
                                    <p className="order-address-detail">
                                        <span className="house-icon" aria-hidden="true" />
                                        <span>{selectedOrder.address}</span>
                                    </p>
                                )}
                            </div>
                            <button type="button" className="order-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details">×</button>
                        </div>
                        <div className="order-modal-items">
                            {selectedOrder.items.map((item, index) => (
                                <div className="admin-order-product" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <span>{formatPrice(item.price)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="order-modal-summary">
                            <span>{selectedOrder.status}</span>
                            <strong>Total: {formatPrice(selectedOrder.total)}</strong>
                        </div>
                        {selectedOrder.proofOfPayment?.dataUrl && selectedOrder.items.some(item => item.preOrderOnly === true) && (
                            <div className="order-proof">
                                <h3>Proof of Payment</h3>
                                <a href={selectedOrder.proofOfPayment.dataUrl} target="_blank" rel="noreferrer" aria-label="Open proof of payment">
                                    <img src={selectedOrder.proofOfPayment.dataUrl} alt="Proof of payment" />
                                </a>
                                <span>{selectedOrder.proofOfPayment.name || 'View payment proof'}</span>
                            </div>
                        )}
                    </section>
                </div>
            )}
            {orderToRemove && (
                <div className="order-modal-backdrop" onClick={() => setOrderToRemove(null)}>
                    <section className="order-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-order-title" onClick={event => event.stopPropagation()}>
                        <p className="module-page-label">{activeTab === 'completed' ? 'Completion confirmation' : 'Shipping confirmation'}</p>
                        <h2 id="remove-order-title">{activeTab === 'completed' ? 'Complete this order?' : 'Ship this order?'}</h2>
                        <p className="order-confirmation-details">
                            {orderToRemove.username}{orderToRemove.email ? ` · ${orderToRemove.email}` : ''}
                        </p>
                        <p className="order-confirmation-details">{orderToRemove.items.length} item{orderToRemove.items.length === 1 ? '' : 's'} · {formatPrice(orderToRemove.total)}</p>
                        <div className="order-confirmation-items" aria-label="Items in this order">
                            {orderToRemove.items.map((item, index) => (
                                <div className="order-confirmation-item" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <span>{item.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="order-confirmation-actions">
                            <button type="button" className="undo-order-button" onClick={() => setOrderToRemove(null)}>Cancel</button>
                            <button type="button" className="complete-order-button" onClick={() => confirmShippedOrder(orderToRemove.id)}>
                                {activeTab === 'completed' ? 'Confirm Complete' : 'Confirm Ship'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {orderToShip && (
                <div className="order-modal-backdrop" onClick={() => setOrderToShip(null)}>
                    <section className="order-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="ship-order-title" onClick={event => event.stopPropagation()}>
                        <p className="module-page-label">Shipping confirmation</p>
                        <h2 id="ship-order-title">Ship this order?</h2>
                        <p className="order-confirmation-details">
                            {orderToShip.username}{orderToShip.email ? ` · ${orderToShip.email}` : ''}
                        </p>
                        <p className="order-confirmation-details">{orderToShip.items.length} item{orderToShip.items.length === 1 ? '' : 's'} · {formatPrice(orderToShip.total)}</p>
                        <div className="order-confirmation-items" aria-label="Items in this order">
                            {orderToShip.items.map((item, index) => (
                                <div className="order-confirmation-item" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <span>{formatPrice(item.price)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="order-confirmation-actions">
                            <button type="button" className="undo-order-button" onClick={() => setOrderToShip(null)}>Cancel</button>
                            <button type="button" className="complete-order-button" onClick={() => confirmShipOrder(orderToShip.id)}>
                                Confirm Ship
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

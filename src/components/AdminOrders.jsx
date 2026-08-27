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

    const removeCompletedOrder = orderId => {
        fetch(`${API_BASE_URL}/api/orders/${orderId}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId, adminEmail: user.email })
        })
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to remove order')))
            .then(() => {
                setOrders(currentOrders => currentOrders.filter(order => order.id !== orderId))
                setOrderToRemove(null)
            })
            .catch(() => setError('Unable to remove order. Please check the server.'))
    }

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
                        <span className="order-count">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
                    </header>

                    {error && <p className="admin-orders-message">{error}</p>}
                    {!error && orders.length === 0 && <p className="admin-orders-message">No orders have been placed yet.</p>}
                    <section className="admin-order-list" aria-label="All customer orders">
                        {orders.map(order => (
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
                                <div className="admin-order-card-footer">
                                    <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                                    <strong>Total: {formatPrice(order.total)}</strong>
                                </div>
                                {order.address && <p className="order-address">Ship to: {order.address}</p>}
                                {order.status === 'Order completed' ? (
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
                                            Completed
                                        </button>
                                    </div>
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
                    </section>
                </div>
            )}
            {orderToRemove && (
                <div className="order-modal-backdrop" onClick={() => setOrderToRemove(null)}>
                    <section className="order-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-order-title" onClick={event => event.stopPropagation()}>
                        <p className="module-page-label">Completed order</p>
                        <h2 id="remove-order-title">Order Completed?</h2>
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
                            <button type="button" className="undo-order-button" onClick={() => setOrderToRemove(null)}>No</button>
                            <button type="button" className="complete-order-button" onClick={() => removeCompletedOrder(orderToRemove.id)}>Yes</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

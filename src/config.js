export const ADMIN_EMAIL = 'aleckconstantinopla220@gmail.com'
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const PAYMONGO_PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || ''
export const parsePrice = value => Number(String(value).replace(/[^0-9.-]/g, '')) || 0
export const formatPrice = value => `₱${parsePrice(value).toFixed(2)}`
export const saveCart = cart => {
    const persistedCart = cart.map(product => {
        if (!product.image?.startsWith('data:')) return product
        const { image, ...productWithoutImage } = product
        return productWithoutImage
    })

    try {
        localStorage.setItem('cart', JSON.stringify(persistedCart))
    } catch (error) {
        console.error('Unable to persist cart:', error)
    }
}

const compactOrderItem = item => {
    if (!item.image?.startsWith('data:')) return item
    const { image, ...itemWithoutImage } = item
    return itemWithoutImage
}

export const savePurchasedOrder = order => {
    const previousOrders = JSON.parse(localStorage.getItem('orders') || '[]')
    const newItems = order.items.map(item => ({
        ...compactOrderItem(item),
        orderId: order.id,
        username: order.username,
        email: order.email,
        phone: order.phone,
        address: order.address,
        status: item.preOrderOnly ? 'Pre-order' : 'Order confirmed',
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
    }))
    const ordersWithoutCurrent = previousOrders.filter(item => item.orderId !== order.id)
    const compactOrders = ordersWithoutCurrent.map(compactOrderItem)

    try {
        localStorage.setItem('orders', JSON.stringify([...compactOrders, ...newItems]))
    } catch (error) {
        localStorage.removeItem('orders')
        localStorage.setItem('orders', JSON.stringify(newItems))
    }
}
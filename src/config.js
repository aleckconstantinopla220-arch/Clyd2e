export const ADMIN_EMAIL = 'aleckconstantinopla220@gmail.com'
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const PAYMONGO_PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || 'pk_live_tbqmELPjX8rdi8sdt4pzpLtk'
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
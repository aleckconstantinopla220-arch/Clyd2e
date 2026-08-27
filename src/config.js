export const ADMIN_EMAIL = 'aleckconstantinopla220@gmail.com'
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const parsePrice = value => Number(String(value).replace(/[^0-9.-]/g, '')) || 0
export const formatPrice = value => `₱${parsePrice(value).toFixed(2)}`
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, PAYMONGO_PUBLIC_KEY, formatPrice, parsePrice } from '../config'
import '../styles/Home.css'
import '../styles/Payment.css'

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1'

export default function Payment() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [cart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
    const [customer, setCustomer] = useState({ name: '', email: '', address: '' })
    const [paymentMethod, setPaymentMethod] = useState('gcash')
    const [message, setMessage] = useState('')
    const [isPaying, setIsPaying] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [pendingIntentId, setPendingIntentId] = useState('')
    const [isPurchaseSummaryOpen, setIsPurchaseSummaryOpen] = useState(false)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL
    const total = cart.reduce((sum, item) => sum + parsePrice(item.price), 0)

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    useEffect(() => {
        const pendingCustomer = JSON.parse(localStorage.getItem('pending-customer') || 'null')
        if (pendingCustomer) setCustomer(pendingCustomer)
    }, [])

    const updateCustomer = event => setCustomer({ ...customer, [event.target.name]: event.target.value })
    const completePayment = async intentId => {
        const response = await fetch(`${API_BASE_URL}/api/payment-intents/${encodeURIComponent(intentId)}/complete`, { method: 'POST' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const error = new Error(result.error || 'Payment could not be confirmed')
            error.status = response.status
            throw error
        }
        const previousOrders = JSON.parse(localStorage.getItem('orders') || '[]')
        const order = result.order
        const newItems = order.items.map(item => ({ ...item, orderId: order.id, username: order.username, email: order.email, address: order.address, status: order.status, paymentStatus: order.paymentStatus, createdAt: order.createdAt }))
        localStorage.setItem('orders', JSON.stringify([...previousOrders.filter(item => item.orderId !== order.id), ...newItems]))
        localStorage.removeItem('cart')
        localStorage.removeItem('pending-customer')
        localStorage.removeItem('paymongo-intent-id')
        navigate('/shipping')
    }

    useEffect(() => {
        if (!pendingIntentId) return undefined

        const checkPayment = () => completePayment(pendingIntentId).catch(error => {
            if (error.status !== 402) setMessage(error.message)
        })

        checkPayment()
        const paymentTimer = window.setInterval(checkPayment, 5000)
        return () => window.clearInterval(paymentTimer)
    }, [pendingIntentId])

    useEffect(() => {
        const intentId = new URLSearchParams(window.location.search).get('payment_intent_id') || localStorage.getItem('paymongo-intent-id')
        if (!intentId || new URLSearchParams(window.location.search).get('payment') !== 'success') return
        setIsPaying(true)
        completePayment(intentId).catch(error => setMessage(error.message)).finally(() => setIsPaying(false))
    }, [])

    const handleSubmit = async event => {
        event.preventDefault()
        if (!PAYMONGO_PUBLIC_KEY) {
            setMessage('PayMongo public key is not configured.')
            return
        }
        const normalizedCustomer = {
            name: customer.name.trim(),
            email: customer.email.trim().toLowerCase(),
            address: customer.address.trim(),
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email)) {
            setMessage('Please enter a valid email address.')
            return
        }
        setIsPaying(true)
        setMessage('')
        try {
            const intentResponse = await fetch(`${API_BASE_URL}/api/payment-intents`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart.map(item => ({ id: item.id })), customer: normalizedCustomer })
            })
            const intentResult = await intentResponse.json().catch(() => ({}))
            if (!intentResponse.ok) throw new Error(intentResult.error || 'Unable to start payment')
            const { id: intentId, clientKey } = intentResult
            localStorage.setItem('paymongo-intent-id', intentId)

            const auth = `Basic ${window.btoa(`${PAYMONGO_PUBLIC_KEY}:`)}`
            const methodResponse = await fetch(`${PAYMONGO_API_URL}/payment_methods`, {
                method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { attributes: { type: paymentMethod, billing: { name: normalizedCustomer.name, email: normalizedCustomer.email, address: { line1: normalizedCustomer.address, country: 'PH' } } } } })
            })
            const methodResult = await methodResponse.json().catch(() => ({}))
            if (!methodResponse.ok) throw new Error(methodResult.errors?.[0]?.detail || 'E-wallet could not be selected')

            const attachResponse = await fetch(`${PAYMONGO_API_URL}/payment_intents/${intentId}/attach`, {
                method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { attributes: { payment_method: methodResult.data.id, client_key: clientKey, return_url: `${window.location.origin}/payment?payment=success` } } })
            })
            const attachResult = await attachResponse.json().catch(() => ({}))
            if (!attachResponse.ok) {
                const detail = attachResult.errors?.[0]?.detail || ''
                if (attachResponse.status === 404 && /no such payment intent/i.test(detail)) {
                    localStorage.removeItem('paymongo-intent-id')
                    throw new Error('PayMongo keys do not match. Set the same test or live account keys in the backend and frontend hosting settings, then try again.')
                }
                throw new Error(detail || 'Payment could not be processed')
            }
            const paymentIntent = attachResult.data
            if (paymentIntent.attributes.status === 'awaiting_next_action') {
                const nextAction = paymentIntent.attributes.next_action
                if (paymentMethod === 'qrph') {
                    const imageUrl = nextAction?.code?.image_url
                    if (!imageUrl) throw new Error('PayMongo did not return a QR code. Please try again.')
                    setQrCodeUrl(imageUrl)
                    setPendingIntentId(intentId)
                    return
                }

                const redirectUrl = nextAction?.redirect?.url
                if (!redirectUrl) throw new Error('PayMongo did not return a payment redirect. Please try again.')
                window.location.assign(redirectUrl)
                return
            }
            if (paymentIntent.attributes.status !== 'succeeded') throw new Error(paymentIntent.attributes.last_payment_error?.message || 'Payment was not completed')
            await completePayment(intentId)
        } catch (error) {
            setMessage(error.message)
        } finally {
            setIsPaying(false)
        }
    }

    if (cart.length === 0) return <div className="store-container"><UpperTab isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} onLogout={handleLogout} cartCount={0} onCartClick={() => navigate('/cart')} onShippingClick={() => navigate('/shipping')} onAdminClick={() => navigate('/admin/orders')} isAdmin={isAdmin} /><main className="payment-page"><h1>No items to pay for</h1><button type="button" className="purchase-button" onClick={() => navigate('/store')}>Back to Store</button></main></div>

    return <div className="store-container">
        <UpperTab isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} onLogout={handleLogout} cartCount={cart.length} onCartClick={() => navigate('/cart')} onShippingClick={() => navigate('/shipping')} onAdminClick={() => navigate('/admin/orders')} isAdmin={isAdmin} />
        <div className="store-body">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="payment-page">
                <button type="button" className="payment-back" onClick={() => navigate('/cart')}>Back to Cart</button>
                <button type="button" className="payment-items-card" onClick={() => setIsPurchaseSummaryOpen(true)} aria-haspopup="dialog" aria-expanded={isPurchaseSummaryOpen}>
                    <span>
                        <span className="payment-items-label">Your purchase</span>
                        <strong>{cart.length} item{cart.length === 1 ? '' : 's'}</strong>
                    </span>
                    <span className="payment-items-total">Total: {formatPrice(total)}</span>
                    <span className="payment-items-arrow" aria-hidden="true">→</span>
                </button>
                <div className="payment-layout">
                    <section className="payment-intro"><p className="module-page-label">Secure payment</p><h1>Complete your purchase</h1><div className="payment-total"><span>Total</span><strong>{formatPrice(total)}</strong></div></section>
                    <form className="payment-form" onSubmit={handleSubmit}>
                        <h2>Contact and delivery</h2>
                        <label>Name<input name="name" value={customer.name} onChange={updateCustomer} required /></label>
                        <label>Email<input type="email" name="email" value={customer.email} onChange={updateCustomer} required /></label>
                        <label>Address<textarea name="address" value={customer.address} onChange={updateCustomer} required rows="3" /></label>
                        <h2>Choose an e-wallet</h2>
                        <div className="payment-methods" role="radiogroup" aria-label="Payment method">
                            {[['gcash', 'GCash'], ['paymaya', 'Maya'], ['grab_pay', 'GrabPay'], ['qrph', 'QR Ph']].map(([value, label]) => <button type="button" className={`payment-method ${paymentMethod === value ? 'selected' : ''}`} onClick={() => setPaymentMethod(value)} aria-pressed={paymentMethod === value} key={value}>{label}</button>)}
                        </div>
                        <p className="payment-note">{paymentMethod === 'qrph' ? 'Scan the QR code with your bank or e-wallet app to pay.' : `You will be redirected to ${paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'paymaya' ? 'Maya' : 'GrabPay'} to authorize the payment.`}</p>
                        {qrCodeUrl && (
                            <div className="qr-payment-panel">
                                <img src={qrCodeUrl} alt="Scan QR code to pay" />
                                <p>Waiting for payment confirmation...</p>
                            </div>
                        )}
                        {message && <p className="payment-error" role="alert">{message}</p>}
                        <button type="submit" className="purchase-button" disabled={isPaying}>{isPaying ? 'Processing payment...' : `Pay ${formatPrice(total)}`}</button>
                    </form>
                </div>
            </main>
        </div>
        {isPurchaseSummaryOpen && (
            <div className="payment-items-backdrop" onClick={() => setIsPurchaseSummaryOpen(false)}>
                <section className="payment-items-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-items-title" onClick={event => event.stopPropagation()}>
                    <div className="payment-items-dialog-header">
                        <div>
                            <p className="module-page-label">Your purchase</p>
                            <h2 id="payment-items-title">Items in your order</h2>
                        </div>
                        <button type="button" className="payment-items-close" onClick={() => setIsPurchaseSummaryOpen(false)} aria-label="Close purchase items">×</button>
                    </div>
                    <div className="payment-items-list">
                        {cart.map((item, index) => (
                            <div className="payment-item-row" key={`${item.id}-${index}`}>
                                <span>{item.name}</span>
                                <strong>{formatPrice(item.price)}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="payment-items-summary">
                        <span>Total</span>
                        <strong>{formatPrice(total)}</strong>
                    </div>
                </section>
            </div>
        )}
    </div>
}
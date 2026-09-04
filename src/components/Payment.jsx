import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, PAYMONGO_PUBLIC_KEY, formatPrice, parsePrice, saveCart, savePurchasedOrder } from '../config'
import '../styles/Home.css'
import '../styles/Payment.css'

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1'

const getNormalizedCustomer = () => {
    try {
        const pendingCustomer = JSON.parse(localStorage.getItem('pending-customer') || '{}')
        if (!pendingCustomer || typeof pendingCustomer !== 'object') return { name: '', email: '', phone: '', address: '' }
        const normalizedCustomer = {
            name: typeof pendingCustomer.name === 'string' ? pendingCustomer.name : '',
            email: typeof pendingCustomer.email === 'string' ? pendingCustomer.email : '',
            phone: typeof pendingCustomer.phone === 'string' ? pendingCustomer.phone : '',
            address: typeof pendingCustomer.address === 'string' ? pendingCustomer.address : ''
        }
        localStorage.setItem('pending-customer', JSON.stringify(normalizedCustomer))
        return normalizedCustomer
    } catch {
        localStorage.removeItem('pending-customer')
        return { name: '', email: '', phone: '', address: '' }
    }
}

export default function Payment() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const purchaseType = new URLSearchParams(window.location.search).get('purchaseType') === 'preorder' ? 'preorder' : 'regular'
    const [cart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]').filter(item => purchaseType === 'preorder' ? item.preOrderOnly : !item.preOrderOnly))
    const [customer, setCustomer] = useState(() => getNormalizedCustomer())
    const [paymentMethod, setPaymentMethod] = useState(() => {
        if (purchaseType === 'preorder') return 'gcash'
        const savedMethod = localStorage.getItem('selected-payment-method')
        return ['gcash', 'paymaya', 'grab_pay', 'qrph'].includes(savedMethod) ? savedMethod : 'gcash'
    })
    const [message, setMessage] = useState('')
    const [isPaying, setIsPaying] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [pendingIntentId, setPendingIntentId] = useState('')
    const [proofOfPayment, setProofOfPayment] = useState(null)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL
    const total = cart.reduce((sum, item) => sum + parsePrice(item.price), 0)
    const removePurchasedItems = () => {
        const currentCart = JSON.parse(localStorage.getItem('cart') || '[]')
        const remainingCart = currentCart.filter(item => purchaseType === 'preorder' ? !item.preOrderOnly : item.preOrderOnly)
        if (remainingCart.length > 0) saveCart(remainingCart)
        else localStorage.removeItem('cart')
    }

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    useEffect(() => {
        const sanitizedCustomer = {
            name: typeof customer.name === 'string' ? customer.name : '',
            email: typeof customer.email === 'string' ? customer.email : '',
            phone: typeof customer.phone === 'string' ? customer.phone : '',
            address: typeof customer.address === 'string' ? customer.address : ''
        }
        localStorage.setItem('pending-customer', JSON.stringify(sanitizedCustomer))
    }, [customer])

    useEffect(() => {
        localStorage.setItem('selected-payment-method', paymentMethod)
    }, [paymentMethod])

    const updateCustomer = event => setCustomer({ ...customer, [event.target.name]: event.target.value })
    const handleProofFile = file => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setMessage('Proof of payment must be an image file.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage('Proof of payment must be 5 MB or smaller.')
            return
        }
        const reader = new FileReader()
        reader.onload = () => setProofOfPayment({ name: file.name, dataUrl: reader.result })
        reader.onerror = () => setMessage('Unable to read the proof of payment.')
        reader.readAsDataURL(file)
    }
    const handleProofDrop = event => {
        event.preventDefault()
        handleProofFile(event.dataTransfer.files[0])
    }
    const handlePaymentMethodChange = nextMethod => {
        setPaymentMethod(nextMethod)
        localStorage.setItem('selected-payment-method', nextMethod)
    }
    const completePayment = async intentId => {
        const response = await fetch(`${API_BASE_URL}/api/payment-intents/${encodeURIComponent(intentId)}/complete`, { method: 'POST' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const error = new Error(result.error || 'Payment could not be confirmed')
            error.status = response.status
            throw error
        }
        const order = result.order
        savePurchasedOrder(order)
        removePurchasedItems()
        localStorage.removeItem('pending-customer')
        localStorage.removeItem('paymongo-intent-id')
        localStorage.removeItem('selected-payment-method')
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
        if (purchaseType === 'preorder') return
        const intentId = new URLSearchParams(window.location.search).get('payment_intent_id') || localStorage.getItem('paymongo-intent-id')
        if (!intentId || new URLSearchParams(window.location.search).get('payment') !== 'success') return
        setIsPaying(true)
        completePayment(intentId).catch(error => setMessage(error.message)).finally(() => setIsPaying(false))
    }, [])

    const handleSubmit = async event => {
        event.preventDefault()
        const normalizedCustomer = {
            name: customer.name.trim(),
            email: customer.email.trim().toLowerCase(),
            phone: customer.phone.trim(),
            address: customer.address.trim()
        }
        if (!normalizedCustomer.name || !normalizedCustomer.email || !normalizedCustomer.phone || (purchaseType !== 'preorder' && !normalizedCustomer.address)) {
            setMessage(purchaseType === 'preorder' ? 'Name, email, and phone number are required before submitting a pre-order.' : 'Name, email, phone number, and address are required before paying.')
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email)) {
            setMessage('Please enter a valid email address.')
            return
        }
        if (!/^\+?[0-9\s\-()]{7,20}$/.test(normalizedCustomer.phone)) {
            setMessage('Please enter a valid phone number.')
            return
        }
        if (purchaseType === 'preorder' && !proofOfPayment) {
            setMessage('Please upload your GCash proof of payment.')
            return
        }
        setIsPaying(true)
        setMessage('')
        try {
            if (purchaseType === 'preorder') {
                const preorderResponse = await fetch(`${API_BASE_URL}/api/preorders`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: cart.map(item => ({ id: item.id })), customer: normalizedCustomer, paymentMethod: 'gcash', proofOfPayment })
                })
                const preorderResult = await preorderResponse.json().catch(() => ({}))
                if (!preorderResponse.ok) throw new Error(preorderResult.error || 'Unable to place pre-order')
                savePurchasedOrder(preorderResult.order)
                removePurchasedItems()
                localStorage.removeItem('pending-customer')
                localStorage.removeItem('selected-payment-method')
                navigate('/shipping')
                return
            }
            if (!PAYMONGO_PUBLIC_KEY) {
                setMessage('PayMongo public key is not configured.')
                return
            }
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
            <main className={`payment-page ${purchaseType === 'preorder' ? 'preorder-payment-page' : ''}`}>
                <button type="button" className="payment-back" onClick={() => navigate('/cart')}>Back to Cart</button>
                <div className="payment-layout">
                    <section className="payment-intro">
                        <p className="module-page-label">{purchaseType === 'preorder' ? 'Pre-order payment' : 'Secure payment'}</p>
                        <h1>{purchaseType === 'preorder' ? 'Complete your pre-order' : 'Complete your purchase'}</h1>
                        <div className="payment-receipt" aria-label="Order receipt">
                            {cart.map((item, index) => (
                                <div className="payment-item-row" key={`${item.id}-${index}`}>
                                    <span>{item.name}</span>
                                    <strong>{formatPrice(item.price)}</strong>
                                </div>
                            ))}
                            <div className="payment-items-summary">
                                <span>Total</span>
                                <strong>{formatPrice(total)}</strong>
                            </div>
                        </div>
                    </section>
                    <form className="payment-form" onSubmit={handleSubmit}>
                        <h2>Contact and delivery</h2>
                        <label>Name<input name="name" value={customer.name} onChange={updateCustomer} required /></label>
                        <label>Email<input type="email" name="email" value={customer.email} onChange={updateCustomer} required /></label>
                        <label>Phone Number<input type="tel" name="phone" value={customer.phone} onChange={updateCustomer} required placeholder="e.g. +63 912 345 6789" /></label>
                        {purchaseType !== 'preorder' && <label>Address<textarea name="address" value={customer.address} onChange={updateCustomer} required rows="3" /></label>}
                        <h2>Choose an e-wallet</h2>
                        <div className="payment-methods" role="radiogroup" aria-label="Payment method">
                            {(purchaseType === 'preorder' ? [['gcash', 'GCash']] : [['gcash', 'GCash'], ['paymaya', 'Maya'], ['grab_pay', 'GrabPay'], ['qrph', 'QR Ph']]).map(([value, label]) => <button type="button" className={`payment-method ${paymentMethod === value ? 'selected' : ''}`} onClick={() => handlePaymentMethodChange(value)} aria-pressed={paymentMethod === value} key={value}>{label}</button>)}
                        </div>
                        <p className="payment-note">{purchaseType === 'preorder' ? 'Pay through GCash. Your pre-order will be confirmed after payment is verified.' : paymentMethod === 'qrph' ? 'Scan the QR code with your bank or e-wallet app to pay.' : `You will be redirected to ${paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'paymaya' ? 'Maya' : 'GrabPay'} to authorize the payment.`}</p>
                        {purchaseType === 'preorder' && (
                            <div className="gcash-qr-placeholder" role="img" aria-label="GCash QR code image placement">
                                <span>GCash QR</span>
                                <small>QR CODE IMAGE</small>
                            </div>
                        )}
                        {purchaseType === 'preorder' && (
                            <div className="proof-upload">
                                <label htmlFor="proof-of-payment">Proof of Payment</label>
                                <div className="proof-dropzone" onDragOver={event => event.preventDefault()} onDrop={handleProofDrop}>
                                    <input id="proof-of-payment" type="file" accept="image/*" onChange={event => handleProofFile(event.target.files[0])} />
                                    {proofOfPayment && <img src={proofOfPayment.dataUrl} alt="Selected proof of payment" />}
                                    <strong>{proofOfPayment ? proofOfPayment.name : 'Drop your receipt image here'}</strong>
                                    <span>{proofOfPayment ? 'Proof selected' : 'or click to browse'}</span>
                                </div>
                            </div>
                        )}
                        {qrCodeUrl && (
                            <div className="qr-payment-panel">
                                <img src={qrCodeUrl} alt="Scan QR code to pay" />
                                <p>Waiting for payment confirmation...</p>
                            </div>
                        )}
                        {message && <p className="payment-error" role="alert">{message}</p>}
                        <button type="submit" className="purchase-button" disabled={isPaying}>{isPaying ? 'Processing payment...' : purchaseType === 'preorder' ? 'Submit Pre-Order' : `Pay ${formatPrice(total)}`}</button>
                    </form>
                </div>
            </main>
        </div>
    </div>
}
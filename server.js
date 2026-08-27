import 'dotenv/config'
import crypto from 'crypto'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'aleckconstantinopla220@gmail.com'
const USERS_DB = path.join(__dirname, 'users.json')
const PRODUCTS_DB = path.join(__dirname, 'products.json')
const ORDERS_DB = process.env.ORDERS_DB_PATH || path.join(__dirname, 'orders.json')
const payMongoSecretKey = process.env.PAYMONGO_SECRET_KEY
const payMongoWebhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
const PAYMONGO_CREATE_URL = 'https://api.paymongo.com/v2/checkout_sessions'
const PAYMONGO_RETRIEVE_URL = 'https://api.paymongo.com/v1/checkout_sessions'

// Middleware
app.use(cors())
app.post('/api/webhooks/paymongo', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!payMongoWebhookSecret) return res.status(503).json({ error: 'PayMongo webhook secret is not configured' })
        const signatureParts = Object.fromEntries(String(req.headers['paymongo-signature'] || '').split(',').map(part => part.split('=')))
        const timestamp = signatureParts.t
        const receivedSignature = signatureParts.te || signatureParts.li
        const signedPayload = `${timestamp}.${req.body.toString('utf8')}`
        const expectedSignature = crypto.createHmac('sha256', payMongoWebhookSecret).update(signedPayload).digest('hex')
        if (!timestamp || !receivedSignature || receivedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
            return res.status(401).json({ error: 'Invalid PayMongo webhook signature' })
        }

        const payload = JSON.parse(req.body.toString('utf8'))
        const event = payload.data?.attributes || payload.data || payload
        const eventType = event.type || event.attributes?.type
        const resource = event.data || event.attributes?.data
        const intentId = resource?.attributes?.payment_intent_id || (resource?.type === 'payment_intent' ? resource.id : null)
        if (eventType === 'payment.paid' || eventType === 'checkout_session.payment.paid') {
            if (intentId) await fulfillPaymentIntent(intentId)
        }
        return res.status(200).json({ received: true })
    } catch (error) {
        console.error('Failed to process PayMongo webhook:', error)
        return res.status(400).json({ error: 'Invalid PayMongo webhook payload' })
    }
})
app.use(express.json({ limit: '10mb' }))

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')))
}

// Initialize database file if it doesn't exist
fs.mkdirSync(path.dirname(ORDERS_DB), { recursive: true })

if (!fs.existsSync(USERS_DB)) {
    fs.writeFileSync(USERS_DB, JSON.stringify([]))
}

if (!fs.existsSync(ORDERS_DB)) {
    fs.writeFileSync(ORDERS_DB, JSON.stringify([]))
}

// Utility functions
const readUsers = () => {
    const data = fs.readFileSync(USERS_DB, 'utf-8')
    return JSON.parse(data || '[]')
}

const writeUsers = (users) => {
    fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2))
}

const readProducts = () => {
    const data = fs.readFileSync(PRODUCTS_DB, 'utf-8')
    return JSON.parse(data || '[]')
}

const writeProducts = (products) => {
    fs.writeFileSync(PRODUCTS_DB, JSON.stringify(products, null, 2))
}

const readOrders = () => {
    const data = fs.readFileSync(ORDERS_DB, 'utf-8')
    return JSON.parse(data || '[]')
}

const writeOrders = (orders) => {
    fs.writeFileSync(ORDERS_DB, JSON.stringify(orders, null, 2))
}

const isAdminUser = user => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
const isAuthorizedAdmin = (users, adminId, adminEmail) => users.some(user =>
    isAdminUser(user) && ((adminId && user.id === adminId) || (adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase()))
)
const priceInSmallestUnit = value => Math.round((Number(String(value).replace(/[^0-9.-]/g, '')) || 0) * 100)
const payMongoHeaders = () => ({
    Authorization: `Basic ${Buffer.from(`${payMongoSecretKey}:`).toString('base64')}`,
    'Content-Type': 'application/json'
})

const fulfillPaymentIntent = async intentId => {
    if (!payMongoSecretKey) throw new Error('PayMongo is not configured on the server')
    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(intentId)}`, { headers: payMongoHeaders() })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.errors?.[0]?.detail || 'Unable to verify payment')
    const intent = result.data
    if (intent.attributes.status !== 'succeeded') return null

    const orders = readOrders()
    const existingOrder = orders.find(order => order.paymentIntentId === intent.id)
    if (existingOrder) return existingOrder
    const metadata = intent.attributes.metadata || {}
    const productIds = String(metadata.productIds || '').split(',').filter(Boolean).map(Number)
    const products = readProducts()
    const items = productIds.map(id => products.find(product => product.id === id)).filter(Boolean)
    if (items.length !== productIds.length || items.length === 0) throw new Error('Unable to restore purchased products')

    const order = {
        id: Date.now().toString(), userId: null, username: metadata.customerName,
        email: metadata.customerEmail, address: metadata.customerAddress, items,
        total: items.reduce((sum, item) => sum + priceInSmallestUnit(item.price), 0) / 100,
        status: 'Purchased', paymentStatus: 'Paid', paymentIntentId: intent.id,
        createdAt: new Date().toISOString()
    }
    orders.push(order)
    writeOrders(orders)
    return order
}

// Register endpoint
app.post('/api/register', (req, res) => {
    try {
        const { username, email, password } = req.body

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }

        const users = readUsers()

        // Check if email already exists
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ error: 'Email already registered' })
        }

        // Check if username already exists
        if (users.some(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already taken' })
        }

        // Add new user
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password, // In production, this should be hashed!
            createdAt: new Date().toISOString()
        }

        users.push(newUser)
        writeUsers(users)

        res.status(201).json({
            message: 'Account created successfully',
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        })
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' })
    }
})

// Login endpoint
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const users = readUsers()
        const user = users.find(u => u.email === email && u.password === password)

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        res.status(200).json({
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email, isAdmin: isAdminUser(user) }
        })
    } catch (error) {
        res.status(500).json({ error: 'Login failed' })
    }
})

// Get all products
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts()
        res.status(200).json(products)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' })
    }
})

// Create a Payment Intent for the custom payment page.
app.post('/api/payment-intents', async (req, res) => {
    try {
        const { items, customer = {} } = req.body
        const customerEmail = String(customer.email || '').trim().toLowerCase()
        const customerName = String(customer.name || '').trim()
        const customerAddress = String(customer.address || '').trim()
        if (!payMongoSecretKey || !Array.isArray(items) || items.length === 0 || !customerName || !customerEmail || !customerAddress) {
            return res.status(400).json({ error: 'PayMongo, items, name, email and address are required' })
        }

        const products = readProducts()
        const paymentItems = items.map(item => products.find(product => product.id === Number(item.id))).filter(Boolean)
        if (paymentItems.length !== items.length || paymentItems.some(item => priceInSmallestUnit(item.price) < 100)) {
            return res.status(400).json({ error: 'One or more products are unavailable or below the PHP 1.00 minimum' })
        }

        const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
            method: 'POST',
            headers: payMongoHeaders(),
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: paymentItems.reduce((sum, item) => sum + priceInSmallestUnit(item.price), 0),
                        currency: 'PHP',
                        payment_method_allowed: ['gcash', 'paymaya', 'grab_pay'],
                        description: `Clyd2e order for ${customerName}`,
                        metadata: { customerName, customerEmail, customerAddress, productIds: paymentItems.map(item => item.id).join(',') }
                    }
                }
            })
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) return res.status(response.status === 401 ? 503 : 500).json({ error: result.errors?.[0]?.detail || 'Unable to start PayMongo payment' })
        return res.status(201).json({ id: result.data.id, clientKey: result.data.attributes.client_key })
    } catch (error) {
        console.error('Failed to create PayMongo Payment Intent:', error)
        return res.status(500).json({ error: 'Unable to start payment' })
    }
})

// Fulfill a custom payment only after PayMongo reports success.
app.post('/api/payment-intents/:id/complete', async (req, res) => {
    try {
        const order = await fulfillPaymentIntent(req.params.id)
        if (!order) return res.status(402).json({ error: 'Payment has not succeeded' })
        return res.status(200).json({ order })
    } catch (error) {
        console.error('Failed to complete PayMongo Payment Intent:', error)
        return res.status(500).json({ error: error.message || 'Failed to complete paid order' })
    }
})

// Start payment before an order is created.
app.post('/api/checkout-session', async (req, res) => {
    try {
        const { items, customer = {} } = req.body

        const customerEmail = String(customer.email || '').trim().toLowerCase()
        const customerName = String(customer.name || '').trim()
        const customerAddress = String(customer.address || '').trim()

        if (!Array.isArray(items) || items.length === 0 || !customerName || !customerEmail || !customerAddress) {
            return res.status(400).json({ error: 'Items, name, email and address are required' })
        }

        if (!payMongoSecretKey) {
            return res.status(503).json({ error: 'PayMongo is not configured on the server' })
        }

        const products = readProducts()
        const checkoutItems = items.map(item => products.find(product => product.id === Number(item.id))).filter(Boolean)
        if (checkoutItems.length !== items.length || checkoutItems.some(item => priceInSmallestUnit(item.price) <= 0)) {
            return res.status(400).json({ error: 'One or more products are no longer available' })
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        const response = await fetch(PAYMONGO_CREATE_URL, {
            method: 'POST',
            headers: payMongoHeaders(),
            body: JSON.stringify({
                data: {
                    attributes: {
                        line_items: checkoutItems.map(item => ({
                            currency: 'PHP',
                            amount: priceInSmallestUnit(item.price),
                            name: item.name,
                            quantity: 1
                        })),
                        payment_method_types: ['card', 'gcash', 'grab_pay', 'paymaya'],
                        description: `Clyd2e order for ${customerName}`,
                        success_url: `${frontendUrl}/cart?payment=success`,
                        cancel_url: `${frontendUrl}/cart?payment=cancelled`,
                        metadata: { customerName, customerEmail, customerAddress, productIds: checkoutItems.map(item => item.id).join(',') }
                    }
                }
            })
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const errorMessage = result.errors?.[0]?.detail || 'Unable to start PayMongo payment'
            return res.status(response.status === 401 ? 503 : 500).json({ error: errorMessage })
        }

        return res.status(201).json({ url: result.data.attributes.checkout_url, sessionId: result.data.id })
    } catch (error) {
        console.error('Failed to create PayMongo checkout session:', error)
        return res.status(500).json({ error: 'Unable to start payment' })
    }
})

// Create the order only after PayMongo confirms payment.
app.post('/api/orders/complete', async (req, res) => {
    try {
        const { sessionId } = req.body
        if (!payMongoSecretKey || !sessionId) {
            return res.status(400).json({ error: 'A paid PayMongo checkout session is required' })
        }

        const response = await fetch(`${PAYMONGO_RETRIEVE_URL}/${encodeURIComponent(sessionId)}`, {
            headers: payMongoHeaders()
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            return res.status(response.status === 401 ? 503 : response.status).json({ error: result.errors?.[0]?.detail || 'Unable to verify PayMongo payment' })
        }

        const session = result.data
        const attributes = session.attributes || {}
        const isPaid = attributes.status === 'completed' || attributes.payments?.some(payment => payment.attributes?.status === 'paid')
        if (!isPaid) {
            return res.status(402).json({ error: 'Payment has not been completed' })
        }

        const orders = readOrders()
        const existingOrder = orders.find(order => order.paymentSessionId === session.id)
        if (existingOrder) {
            return res.status(200).json({ message: 'Order already created', order: existingOrder })
        }

        const metadata = attributes.metadata || {}
        const productIds = String(metadata.productIds || '').split(',').filter(Boolean).map(Number)
        const products = readProducts()
        const items = productIds.map(id => products.find(product => product.id === id)).filter(Boolean)
        if (items.length !== productIds.length || items.length === 0) {
            return res.status(400).json({ error: 'Unable to restore purchased products' })
        }

        const order = {
            id: Date.now().toString(),
            userId: null,
            username: metadata.customerName,
            email: metadata.customerEmail,
            address: metadata.customerAddress,
            items,
            total: items.reduce((sum, item) => sum + priceInSmallestUnit(item.price), 0) / 100,
            status: 'Purchased',
            paymentStatus: 'Paid',
            createdAt: new Date().toISOString(),
            paymentSessionId: session.id
        }

        orders.push(order)
        writeOrders(orders)

        res.status(201).json({ message: 'Order created successfully', order })
    } catch (error) {
        console.error('Failed to complete paid PayMongo order:', error)
        res.status(500).json({ error: 'Failed to complete paid order' })
    }
})

// View all orders (admin only)
app.get('/api/orders', (req, res) => {
    try {
        const { adminId, adminEmail } = req.query
        const users = readUsers()

        if (!isAuthorizedAdmin(users, adminId, adminEmail)) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        res.status(200).json(readOrders())
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' })
    }
})

// Read the public status of one order for shipping updates
app.get('/api/orders/:id/status', (req, res) => {
    try {
        const order = readOrders().find(existingOrder => existingOrder.id === req.params.id)

        if (!order) {
            return res.status(404).json({ error: 'Order not found' })
        }

        res.status(200).json({ id: order.id, status: order.status })
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order status' })
    }
})

// Mark an order as completed (admin only)
app.put('/api/orders/:id', (req, res) => {
    try {
        const { id } = req.params
        const { adminId, adminEmail, status } = req.body
        const users = readUsers()

        if (!isAuthorizedAdmin(users, adminId, adminEmail)) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const orders = readOrders()
        const orderIndex = orders.findIndex(order => order.id === id)

        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' })
        }

        orders[orderIndex] = {
            ...orders[orderIndex],
            status: status || 'Order completed'
        }
        writeOrders(orders)

        res.status(200).json({ message: 'Order updated successfully', order: orders[orderIndex] })
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order' })
    }
})

// Remove a completed order (admin only)
app.post('/api/orders/:id/remove', (req, res) => {
    try {
        const { id } = req.params
        const { adminId, adminEmail } = req.body
        const users = readUsers()

        if (!isAuthorizedAdmin(users, adminId, adminEmail)) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const orders = readOrders()
        const orderIndex = orders.findIndex(order => order.id === id)

        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' })
        }

        orders.splice(orderIndex, 1)
        writeOrders(orders)

        res.status(200).json({ message: 'Order removed successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove order' })
    }
})

// Add new product (admin only)
app.post('/api/products', (req, res) => {
    try {
        const { name, category, price, image, preOrderOnly, adminId } = req.body

        if (!name || !category || !price || !image || !adminId) {
            return res.status(400).json({ error: 'All fields are required' })
        }

        const users = readUsers()
        const admin = users.find(u => u.id === adminId && isAdminUser(u))

        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const products = readProducts()
        const newProduct = {
            id: Math.max(...products.map(p => p.id), 0) + 1,
            name,
            category,
            price,
            image,
            inStock: true,
            preOrderOnly: preOrderOnly === true
        }

        products.push(newProduct)
        writeProducts(products)

        res.status(201).json({
            message: 'Product added successfully',
            product: newProduct
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to add product' })
    }
})

// Update product (admin only)
app.put('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params
        const { name, category, price, image, inStock, preOrderOnly, adminId } = req.body

        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const users = readUsers()
        const admin = users.find(u => u.id === adminId && isAdminUser(u))

        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const products = readProducts()
        const productIndex = products.findIndex(p => p.id === parseInt(id))

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' })
        }

        products[productIndex] = {
            ...products[productIndex],
            name: name || products[productIndex].name,
            category: category || products[productIndex].category,
            price: price || products[productIndex].price,
            image: image || products[productIndex].image,
            inStock: typeof inStock === 'boolean' ? inStock : products[productIndex].inStock !== false,
            preOrderOnly: typeof preOrderOnly === 'boolean' ? preOrderOnly : products[productIndex].preOrderOnly === true
        }

        writeProducts(products)

        res.status(200).json({
            message: 'Product updated successfully',
            product: products[productIndex]
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' })
    }
})

// Delete product (admin only)
app.delete('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params
        const { adminId } = req.body

        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        const users = readUsers()
        const admin = users.find(u => u.id === adminId && isAdminUser(u))

        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' })
        }

        let products = readProducts()
        products = products.filter(p => p.id !== parseInt(id))

        writeProducts(products)

        res.status(200).json({ message: 'Product deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' })
    }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' })
})

if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    })
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})

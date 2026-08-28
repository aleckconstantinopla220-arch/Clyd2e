import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice } from '../config'
import '../styles/Home.css'
import '../styles/Store.css'
import '../styles/AddProduct.css'

export default function AddProduct() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [form, setForm] = useState({ name: '', description: '', category: 'ZINE', price: '', image: '', preOrderOnly: false })
    const [products, setProducts] = useState([])
    const [activeCategory, setActiveCategory] = useState('ALL')
    const [editingId, setEditingId] = useState(null)
    const [message, setMessage] = useState('')
    const fileInputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL
    const adminId = user.id || (isAdmin ? 'admin001' : '')
    const productCategories = ['ALL', 'ZINE', 'PHOTOCARD', 'INSTAX MINI', 'ACCESSORIES', 'OTHER']
    const visibleProducts = activeCategory === 'ALL'
        ? products
        : products.filter(product => product.category === activeCategory)

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/products`).then(response => response.json()).then(setProducts).catch(() => setMessage('Unable to load products'))
    }, [])

    const selectImage = file => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setMessage('Please choose an image file.')
            return
        }

        const reader = new FileReader()
        reader.onload = () => setForm(currentForm => ({ ...currentForm, image: reader.result }))
        reader.readAsDataURL(file)
        setMessage('')
    }

    const handleSubmit = async event => {
        event.preventDefault()
        setMessage('')

        try {
            const response = await fetch(`${API_BASE_URL}/api/products${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, adminId })
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result.error || 'Unable to save product')
            setProducts(currentProducts => editingId
                ? currentProducts.map(product => product.id === editingId ? result.product : product)
                : [...currentProducts, result.product])
            setEditingId(null)
            setForm({ name: '', description: '', category: 'ZINE', price: '', image: '', preOrderOnly: false })
        } catch (error) {
            setMessage(error.message)
        }
    }

    const editProduct = product => {
        setEditingId(product.id)
        setForm({ name: product.name, description: product.description || '', category: product.category, price: product.price, image: product.image, preOrderOnly: product.preOrderOnly === true })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const toggleStock = async product => {
        const response = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...product, inStock: product.inStock === false, adminId })
        })
        if (response.ok) {
            const result = await response.json()
            setProducts(currentProducts => currentProducts.map(item => item.id === product.id ? result.product : item))
        }
    }

    const deleteProduct = async productId => {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        })
        if (response.ok) setProducts(currentProducts => currentProducts.filter(product => product.id !== productId))
    }

    if (!isAdmin) {
        navigate('/home', { replace: true })
        return null
    }

    return (
        <div className="store-container">
            <UpperTab isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} cartCount={0} onCartClick={() => navigate('/cart')} onShippingClick={() => navigate('/shipping')} isAdmin />
            <div className="store-body">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isAdmin />
                <main className="add-product-page">
                    <p className="module-page-label">Admin dashboard</p>
                    <h1 className="module-page-title">{editingId ? 'Edit product' : 'Add product'}</h1>
                    <p className="module-page-description">Create and manage store items.</p>
                    <form className="add-product-form" onSubmit={handleSubmit}>
                        <label>Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label>
                        <label>Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows="4" placeholder="Tell customers about this product" /></label>
                        <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>ZINE</option><option>PHOTOCARD</option><option>INSTAX MINI</option><option>ACCESSORIES</option><option>OTHER</option></select></label>
                        <label>Price<input value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="₱25.00" required /></label>
                        <label className="preorder-option"><input type="checkbox" checked={form.preOrderOnly} onChange={event => setForm({ ...form, preOrderOnly: event.target.checked })} /> Pre-orders only</label>
                        <div className={`image-drop-zone ${isDragging ? 'dragging' : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={event => {
                            event.preventDefault()
                            setIsDragging(true)
                        }} onDragLeave={() => setIsDragging(false)} onDrop={event => {
                            event.preventDefault()
                            setIsDragging(false)
                            selectImage(event.dataTransfer.files[0])
                        }} role="button" tabIndex="0" onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                        }}>
                            <input ref={fileInputRef} className="image-file-input" type="file" accept="image/*" onChange={event => selectImage(event.target.files[0])} />
                            {form.image ? <img className="image-preview" src={form.image} alt="Product preview" /> : <><span className="image-drop-icon">+</span><strong>Drop product image here</strong><span>or click to browse</span></>}
                        </div>
                        {message && <p className="add-product-message" role="alert">{message}</p>}
                        <div className="add-product-actions"><button type="button" className="undo-order-button" onClick={() => {
                            setEditingId(null)
                            setForm({ name: '', description: '', category: 'ZINE', price: '', image: '', preOrderOnly: false })
                            setMessage('')
                        }}>Cancel</button><button type="submit" className="complete-order-button">{editingId ? 'Save changes' : 'Add product'}</button></div>
                    </form>
                    <section className="managed-products" aria-label="Manage products">
                        <h2>Store items</h2>
                        <nav className="managed-product-tabs" aria-label="Filter products by category">
                            {productCategories.map(category => (
                                <button key={category} type="button" className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>
                                    {category}
                                </button>
                            ))}
                        </nav>
                        {visibleProducts.map(product => (
                            <article className="managed-product" key={product.id}>
                                <div><strong>{product.name}</strong><span>{product.category} · {formatPrice(product.price)}{product.preOrderOnly ? ' · Pre-order' : ''}</span></div>
                                <span className={product.inStock === false ? 'out-of-stock-label' : 'in-stock-label'}>{product.inStock === false ? 'Out of stock' : 'In stock'}</span>
                                <div className="managed-product-actions"><button type="button" onClick={() => editProduct(product)}>Edit</button><button type="button" onClick={() => toggleStock(product)}>{product.inStock === false ? 'Mark in stock' : 'Mark out of stock'}</button><button type="button" onClick={() => deleteProduct(product.id)}>Delete</button></div>
                            </article>
                        ))}
                    </section>
                </main>
            </div>
        </div>
    )
}
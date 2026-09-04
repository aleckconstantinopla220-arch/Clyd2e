import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpperTab from './UpperTab'
import initialProducts from '../../products.json'
import { ADMIN_EMAIL, API_BASE_URL, formatPrice, saveCart } from '../config'
import '../styles/Home.css'
import '../styles/Store.css'

export default function Store() {
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('ALL')
    const [quantities, setQuantities] = useState({})
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
    const [products, setProducts] = useState(initialProducts)
    const [categories, setCategories] = useState(['ZINE', 'PHOTOCARD', 'INSTAX MINI', 'ACCESSORIES', 'OTHER'])
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        fetch(`${API_BASE_URL}/api/products`)
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load products')))
            .then(setProducts)
            .catch(() => { })
        fetch(`${API_BASE_URL}/api/categories`)
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load categories')))
            .then(setCategories)
            .catch(() => { })
    }, [])

    const itemCategories = products
        .map(product => typeof product.category === 'string' ? product.category.trim() : '')
        .filter(Boolean)
    const categoryFilters = ['ALL', ...new Set([...categories, ...itemCategories])]

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    const visibleProducts = selectedCategory === 'ALL'
        ? products
        : products.filter(product => product.category?.trim().toLowerCase() === selectedCategory.toLowerCase())

    const getRemainingStock = (product, currentCart = cart) => {
        if (product.preOrderOnly) return Number.POSITIVE_INFINITY
        return Math.max(0, Number(product.stockLimit) - currentCart.filter(item => item.id === product.id).length)
    }

    const handleBuy = product => {
        setCart(currentCart => {
            const remainingStock = getRemainingStock(product, currentCart)
            const quantity = quantities[product.id] || 1
            if (quantity < 1 || quantity > remainingStock) return currentCart
            const updatedCart = [...currentCart, ...Array(quantity).fill(product)]
            saveCart(updatedCart)
            return updatedCart
        })
    }

    const adjustQuantity = (productId, amount) => {
        setQuantities(currentQuantities => ({
            ...currentQuantities,
            [productId]: Math.max(1, Math.min(
                (currentQuantities[productId] || 1) + amount,
                getRemainingStock(products.find(product => product.id === productId) || {})
            )),
        }))
    }

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                onLogout={handleLogout}
                cartCount={cart.length}
                onCartClick={() => navigate('/cart')}
                onShippingClick={() => navigate('/shipping')}
                onAdminClick={() => navigate('/admin/orders')}
                isAdmin={isAdmin}
            />

            <div className="store-body">
                <Sidebar
                    isOpen={isSidebarOpen}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                    onClose={() => setIsSidebarOpen(false)}
                    isAdmin={isAdmin}
                    onOrdersClick={() => navigate('/admin/orders')}
                />

                <div className="store-main">
                    <main className="products-page">
                        <header className="products-header">
                            <div>
                                <p className="module-page-label">Clyd2e's official store</p>
                                <h1 className="module-page-title">Store</h1>
                                <p className="module-page-description">Browse the latest products from Clyd2e.</p>
                            </div>
                            <p className="cart-status" aria-live="polite">{cart.length} item{cart.length === 1 ? '' : 's'} in cart</p>
                        </header>

                        <nav className="category-filters" aria-label="Product categories">
                            {categoryFilters.map(category => (
                                <button
                                    key={category}
                                    type="button"
                                    className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                                    aria-pressed={selectedCategory === category}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </nav>

                        <section className="product-grid" key={selectedCategory} aria-label="Products">
                            {visibleProducts.map(product => (
                                <article className="product-card" key={product.id}>
                                    <div className="product-image" aria-label={`${product.name} product image`}>
                                        {product.image?.startsWith('data:image') || product.image?.startsWith('http') || product.image?.startsWith('/')
                                            ? <img src={product.image} alt={`${product.name} product`} />
                                            : <span>{product.image}</span>}
                                    </div>
                                    <div className="product-card-details">
                                        <div>
                                            <p className="product-category">{product.category}</p>
                                            <h2 className="product-name">{product.name}</h2>
                                            {product.description && <p className="product-description">{product.description}</p>}
                                            {product.preOrderOnly && <p className="preorder-label">Pre-order only</p>}
                                            {!product.preOrderOnly && <p className="stock-label">{getRemainingStock(product)} in stock</p>}
                                        </div>
                                        <div className="product-card-footer">
                                            <label className="quantity-control">
                                                <span>Qty</span>
                                                <span className="quantity-stepper">
                                                    <button type="button" className="quantity-button" onClick={() => adjustQuantity(product.id, -1)} disabled={product.inStock === false || (quantities[product.id] || 1) === 1} aria-label={`Decrease quantity for ${product.name}`}>-</button>
                                                    <span className="quantity-value">{quantities[product.id] || 1}</span>
                                                    <button type="button" className="quantity-button" onClick={() => adjustQuantity(product.id, 1)} disabled={product.inStock === false || (!product.preOrderOnly && (quantities[product.id] || 1) >= getRemainingStock(product))} aria-label={`Increase quantity for ${product.name}`}>+</button>
                                                </span>
                                            </label>
                                            <span className="product-price">{formatPrice(product.price)}</span>
                                            <button type="button" className="buy-button" onClick={() => handleBuy(product)} disabled={product.inStock === false || (!product.preOrderOnly && getRemainingStock(product) < 1) || (quantities[product.id] || 1) > getRemainingStock(product)}>
                                                {product.inStock === false || (!product.preOrderOnly && getRemainingStock(product) < 1) || (quantities[product.id] || 1) > getRemainingStock(product) ? 'Out of stock' : 'Add to cart'}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </section>

                        <button type="button" className="back-home-button" onClick={() => navigate('/home')}>
                            Back to home
                        </button>
                    </main>
                </div>
            </div>
            <button type="button" className="store-floating-cart" onClick={() => navigate('/cart')} aria-label={`Shopping cart with ${cart.length} items`} title="Shopping cart">
                <span className="cart-icon" aria-hidden="true" />
                {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </button>
        </div>
    )
}
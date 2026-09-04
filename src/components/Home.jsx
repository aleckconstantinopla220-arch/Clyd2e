import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import CategoryCards from './CategoryCards'
import UpperTab from './UpperTab'
import { ADMIN_EMAIL, API_BASE_URL } from '../config'
import '../styles/Home.css'

export default function Home() {
    const navigate = useNavigate()
    const [products, setProducts] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('ALL')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isNavVisible, setIsNavVisible] = useState(true)
    const [tourDates, setTourDates] = useState([])
    const [eventForm, setEventForm] = useState({ city: '', date: '' })
    const [eventMessage, setEventMessage] = useState('')
    const lastScrollY = useRef(0)

    useEffect(() => {
        // Fetch products from API
        fetchProducts()
        fetch(`${API_BASE_URL}/api/events`).then(response => response.json()).then(setTourDates).catch(() => setEventMessage('Unable to load events'))
    }, [])

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products`)
            const data = await response.json()
            setProducts(data)
        } catch (err) {
            console.error('Failed to fetch products:', err)
        }
    }

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY

            // Always show navbar near the top of the page
            if (currentScrollY < 80) {
                setIsNavVisible(true)
            } else if (currentScrollY > lastScrollY.current) {
                // scrolling down
                setIsNavVisible(false)
            } else {
                // scrolling up
                setIsNavVisible(true)
            }

            lastScrollY.current = currentScrollY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/home')
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL

    const categories = ['ALL', 'ZINE', 'PHOTOCARD', 'INSTAX MINI', 'ACCESSORIES', 'OTHER']

    const filteredProducts = selectedCategory === 'ALL'
        ? products
        : products.filter(p => p.category === selectedCategory)

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev)
    }

    const handleSiteCategorySelect = (category) => {
        if (category === 'STORE') {
            setSelectedCategory('ALL')
        }
    }

    const handleAddEvent = async event => {
        event.preventDefault()
        setEventMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...eventForm, adminId: user.id })
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result.error || 'Unable to add event')
            setTourDates(currentEvents => [...currentEvents, result.event])
            setEventForm({ city: '', date: '' })
            setEventMessage('Event added.')
        } catch (error) {
            setEventMessage(error.message)
        }
    }

    return (
        <div className="store-container">
            <UpperTab
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
                onLogout={handleLogout}
                onCartClick={() => navigate('/cart')}
                onShippingClick={() => navigate('/shipping')}
                onAdminClick={() => navigate('/admin/orders')}
                isAdmin={isAdmin}
                isVisible={isNavVisible}
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

                {/* Main content */}
                <div className="store-main">
                    {/* Hero Section */}
                    <section className="hero">
                        <div className="hero-content">
                            <p className="hero-label">Cly2e's Official Store · Est. 2025</p>
                            <h2 className="hero-title">CLY2E'S<span className="hero-accent">STORE</span></h2>
                            <p className="hero-description">Mga may bitaw lng<br />ang pwedeng bumili</p>
                            <div className="hero-buttons">
                                <a href="/store" className="btn btn-primary">Store</a>
                                <a href="#social" className="btn btn-secondary">Follow my social</a>
                            </div>
                        </div>

                        <aside className="tour-box" id="tour">
                            <h3 className="tour-title">Upcoming events</h3>
                            {isAdmin && <form className="event-form" onSubmit={handleAddEvent}>
                                <input value={eventForm.city} onChange={event => setEventForm({ ...eventForm, city: event.target.value })} placeholder="Event name or city" aria-label="Event name or city" required />
                                <input type="date" value={eventForm.date} onChange={event => setEventForm({ ...eventForm, date: event.target.value })} aria-label="Event date" required />
                                <button type="submit">Add event</button>
                            </form>}
                            {eventMessage && isAdmin && <p className="event-message" role="status">{eventMessage}</p>}
                            <div className="tour-dates">
                                {tourDates.length === 0 ? (
                                    <p className="tour-empty">No dates announced yet — check back soon.</p>
                                ) : tourDates.map((tour, idx) => (
                                    <div key={idx} className="tour-item">
                                        <span className="tour-city">{tour.city}</span>
                                        <span className="tour-date">{tour.date}</span>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </section>

                    {/* Image Placeholder */}
                    <section className="image-placeholder-section" aria-label="Image placeholder">
                        <div className="image-placeholder">
                            <span>Image placeholder</span>
                        </div>
                    </section>

                    {/* Category Section */}
                    <section className="category-section" id="social">
                        <CategoryCards onSelect={handleSiteCategorySelect} />
                    </section>

                    {/* Footer */}
                    <footer className="store-footer">
                        <p>Logged in as <strong>{user.username || user.email || 'User'}</strong></p>
                    </footer>
                </div>
            </div>
        </div>
    )
}
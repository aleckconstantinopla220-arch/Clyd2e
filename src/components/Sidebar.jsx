import { useNavigate } from 'react-router-dom'

const navigationItems = [
    { label: 'HOME', path: '/home' },
    { label: 'WEBTOON', path: '/webtoon' },
    { label: 'PINYA', path: '/pinya' },
    { label: 'PATREON', path: '/patreon' },
    { label: 'MY CART', path: '/cart' },
]

export default function Sidebar({ isOpen, onClose, isAdmin = false, onOrdersClick }) {
    const navigate = useNavigate()

    const handleNavigation = path => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        navigate(path)
        onClose()
    }

    return (
        <>
            {isOpen && (
                <button
                    className="sidebar-backdrop"
                    onClick={onClose}
                    aria-label="Close menu"
                />
            )}

            <aside className={`store-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
                <div className="sidebar-scroll">
                    <div className="sidebar-section">
                        <h4 className="sidebar-heading">Navigate</h4>
                        <ul className="sidebar-list">
                            {navigationItems.map(({ label, path }) => (
                                <li key={path}>
                                    <button
                                        className="sidebar-item"
                                        onClick={() => handleNavigation(path)}
                                    >
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {isAdmin && (
                            <button className="sidebar-item admin-orders-link" onClick={() => {
                                onOrdersClick?.()
                                onClose()
                            }}>
                                ORDER
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    )
}
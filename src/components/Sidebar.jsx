import { useNavigate } from 'react-router-dom'

const navigationItems = [
    { label: 'HOME', path: '/home' },
    { label: 'WEBTOON', path: 'https://www.webtoons.com/p/community/en/u/cly2e' },
    { label: 'PINYA', path: 'https://pinya.io/cly2e' },
    { label: 'PATREON', path: 'https://www.patreon.com/join/cly2e?utm_source=webtoons&utm_medium=link&utm_campaign=cly2e&redirect_uri=http%3A%2F%2Fm.webtoons.com%2Fchallenge%2FpatreonCallback' },
    { label: 'MY CART', path: '/cart' },
]

export default function Sidebar({ isOpen, onClose, isAdmin = false, onOrdersClick }) {
    const navigate = useNavigate()

    const handleNavigation = path => {
        if (path.startsWith('http')) {
            window.location.assign(path)
            return
        }
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
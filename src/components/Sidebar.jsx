export default function Sidebar({ isOpen, categories, selectedCategory, onCategorySelect, onClose, isAdmin = false, onOrdersClick }) {
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
                        <h4 className="sidebar-heading">Shop</h4>
                        <ul className="sidebar-list">
                            {categories.map(category => (
                                <li key={category}>
                                    <button
                                        className={`sidebar-item ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => {
                                            onCategorySelect(category)
                                            onClose()
                                        }}
                                    >
                                        {category}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {isAdmin && (
                            <button className="sidebar-item admin-orders-link" onClick={() => {
                                onOrdersClick?.()
                                onClose()
                            }}>
                                Order
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    )
}
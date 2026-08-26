import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const siteCategories = ['STORE', 'WEBTOON', 'PINYA', 'PATREON']

export default function CategoryCards({ onSelect }) {
    const navigate = useNavigate()
    const sliderRef = useRef(null)

    const slide = direction => {
        sliderRef.current?.scrollBy({ left: direction * sliderRef.current.clientWidth, behavior: 'smooth' })
    }

    return (
        <div className="category-slider">
            <button type="button" className="category-slide-button" onClick={() => slide(-1)} aria-label="Previous categories">
                <span aria-hidden="true">&#8592;</span>
            </button>
            <div className="category-grid" ref={sliderRef}>
                {siteCategories.map(category => (
                    <button
                        key={category}
                        type="button"
                        className="category-card"
                        onClick={() => category === 'STORE' ? navigate('/store') : onSelect(category)}
                    >
                        <span className="category-card-image" aria-hidden="true" />
                        <span className="category-card-name">
                            {category}
                            <span className="category-card-arrow" aria-hidden="true">&#8599;</span>
                        </span>
                    </button>
                ))}
            </div>
            <button type="button" className="category-slide-button" onClick={() => slide(1)} aria-label="Next categories">
                <span aria-hidden="true">&#8594;</span>
            </button>
        </div>
    )
}
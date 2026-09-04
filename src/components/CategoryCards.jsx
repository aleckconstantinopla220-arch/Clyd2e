import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const siteCategories = ['STORE', 'INSTAGRAM', 'WEBTOON', 'PINYA', 'PATREON']
const instagramUrl = 'https://www.instagram.com/clyd2e/'
const webtoonUrl = 'https://www.webtoons.com/p/community/en/u/cly2e'
const pinyaUrl = 'https://pinya.io/cly2e'
const patreonUrl = 'https://www.patreon.com/join/cly2e?utm_source=webtoons&utm_medium=link&utm_campaign=cly2e&redirect_uri=http%3A%2F%2Fm.webtoons.com%2Fchallenge%2FpatreonCallback'
const categoryImages = {
    STORE: '/Cly2e.png',
    INSTAGRAM: '/Category/Instagram.png',
    WEBTOON: '/Category/Webtoon.png',
    PINYA: '/Category/Pinya.png',
    PATREON: '/Category/Patreon.png'
}
const categoryIcons = {
    STORE: '/Cly2e.png',
    INSTAGRAM: '/Category_Icon/Intagram_Icon.png',
    WEBTOON: '/Category_Icon/Webtoon_icon.png',
    PINYA: '/Category_Icon/Pinya_Icon.png',
    PATREON: '/Category_Icon/Patreon_Icon.png'
}
const categoryDescriptions = {
    STORE: 'Shop official Cly2e items.',
    INSTAGRAM: 'Follow Cly2e on Instagram.',
    WEBTOON: 'Read Cly2e webtoon stories.',
    PINYA: 'Support Cly2e on Pinya.',
    PATREON: 'Join Cly2e on Patreon.'
}

export default function CategoryCards({ onSelect }) {
    const navigate = useNavigate()
    const sliderRef = useRef(null)

    const handleStoreClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        navigate('/store')
    }

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
                        className={`category-card category-card-${category.toLowerCase().replace(/\s+/g, '-')}`}
                        aria-label={category}
                        onClick={() => {
                            if (category === 'INSTAGRAM') {
                                window.location.assign(instagramUrl)
                            } else if (category === 'STORE') {
                                handleStoreClick()
                            } else if (category === 'WEBTOON') {
                                window.location.assign(webtoonUrl)
                            } else if (category === 'PINYA') {
                                window.location.assign(pinyaUrl)
                            } else if (category === 'PATREON') {
                                window.location.assign(patreonUrl)
                            } else {
                                onSelect(category)
                            }
                        }}
                    >
                        {categoryImages[category] ? (
                            <img className="category-card-image" src={categoryImages[category]} alt="" />
                        ) : (
                            <span className="category-card-image" aria-hidden="true" />
                        )}
                        <span className="category-card-icon" aria-hidden="true">
                            {categoryIcons[category] ? <img src={categoryIcons[category]} alt="" /> : category}
                        </span>
                        <span className="category-card-copy">
                            <strong>{category}</strong>
                            <small>{categoryDescriptions[category]}</small>
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
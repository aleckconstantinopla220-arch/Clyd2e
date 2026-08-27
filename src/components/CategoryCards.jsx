import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const siteCategories = ['STORE', 'WEBTOON', 'PINYA', 'PATREON']
const webtoonUrl = 'https://www.webtoons.com/p/community/en/u/cly2e'
const pinyaUrl = 'https://pinya.io/cly2e'
const patreonUrl = 'https://www.patreon.com/join/cly2e?utm_source=webtoons&utm_medium=link&utm_campaign=cly2e&redirect_uri=http%3A%2F%2Fm.webtoons.com%2Fchallenge%2FpatreonCallback'

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
                        className="category-card"
                        onClick={() => {
                            if (category === 'STORE') {
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
/**
 * Main application logic for Simple AI News Hub
 * Handles fetching, rendering, sorting, and searching news articles.
 */

// ==========================================================================
// Mock Data (Used for immediate premium render, or if API fails/is absent)
// ==========================================================================
const mockNewsData = [
    {
        id: 1,
        title: "OpenAI Announces Next-Generation Language Model with Enhanced Reasoning",
        description: "The latest iteration brings significant improvements in mathematical reasoning, coding capabilities, and reduced hallucinations compared to previous models.",
        urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
        url: "#",
        source: { name: "AI Insight Daily" },
        publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        isFeatured: true
    },
    {
        id: 2,
        title: "New AI Framework Promises 50x Faster Mobile Inference",
        description: "Researchers have developed a novel quantization technique that allows complex neural networks to run locally on mid-range smartphones without battery drain.",
        urlToImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600",
        url: "#",
        source: { name: "TechCrunch AI" },
        publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        isFeatured: false
    },
    {
        id: 3,
        title: "EU Passes Comprehensive AI Regulatory Guidelines",
        description: "The European Union has officially outlined its framework for classifying AI risk, focusing heavily on biometrics, autonomous vehicles, and deepfakes.",
        urlToImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
        url: "#",
        source: { name: "Global Tech Policy" },
        publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        isFeatured: false
    },
    {
        id: 4,
        title: "Generative Video Tool Hits Cinematic Quality Milestone",
        description: "A new startup's text-to-video generator can now produce 4K videos at 60fps with consistent physics and character preservation across multiple shots.",
        urlToImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600",
        url: "#",
        source: { name: "Creative AI Mag" },
        publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        isFeatured: false
    },
    {
        id: 5,
        title: "Robotics Breakthrough: Bipedal Robot Masters Terrain Navigation",
        description: "Using reinforcement learning, engineers have trained a humanoid robot to navigate challenging natural terrain previously inaccessible to machines.",
        urlToImage: "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?auto=format&fit=crop&q=80&w=600",
        url: "#",
        source: { name: "Robotics Today" },
        publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        isFeatured: false
    },
    {
        id: 6,
        title: "Open Source Community Releases 100B Parameter Model",
        description: "A coalition of researchers has released an open-weights model that rivals proprietary counterparts, entirely trained on public hardware donations.",
        urlToImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
        url: "#",
        source: { name: "OpenAI Hub" },
        publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        isFeatured: false
    }
];

// ==========================================================================
// State Management
// ==========================================================================
let articles = [];
let currentSort = 'newest';
let currentSearch = '';

// DOM Elements
const heroSection = document.getElementById('heroSection');
const newsGrid = document.getElementById('newsGrid');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // 1. Fetch data (Using mock data for immediate premium experience but structured for real API)
    await fetchNewsData();
    
    // 2. Setup Event Listeners
    setupEventListeners();
    
    // 3. Initial Render
    renderApp();
}

// ==========================================================================
// Data Fetching
// ==========================================================================
async function fetchNewsData() {
    try {
        const apiKey = '582ceeff760a4ebbb059482e2c4e2e93';
        // Dramatically tighten filter: Require exact AI phrases, exclude all major entertainment keywords, and sort by relevance first to get true tech news
        const query = encodeURIComponent('("Artificial Intelligence" OR "Machine Learning" OR "OpenAI") AND NOT (movie OR actor OR racing OR nascar OR sports OR hollywood OR gaming)');
        // Note: Using sortBy=relevancy instead of publishedAt often drastically improves the quality of the articles returned by NewsAPI
        const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=relevancy&pageSize=30&apiKey=${apiKey}`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data && data.articles && data.articles.length > 0) {
            // Filter out removed articles
            let validArticles = data.articles.filter(article => article.title !== '[Removed]');
            
            // Remove duplicates (sometimes NewsAPI returns the same article multiple times)
            const seenUrls = new Set();
            validArticles = validArticles.filter(article => {
                if (seenUrls.has(article.url)) return false;
                seenUrls.add(article.url);
                return true;
            });
            
            articles = validArticles;
        } else {
            // Fallback to mock data if no valid articles are returned
            articles = [...mockNewsData];
        }
    } catch (error) {
        console.error("Failed to fetch from API, falling back to local data.", error);
        articles = [...mockNewsData];
    }
}

// ==========================================================================
// Rendering Logic
// ==========================================================================
function renderApp() {
    // Process articles based on current state
    let displayArticles = [...articles];
    
    // 1. Apply Search Filter
    if (currentSearch.trim() !== '') {
        const searchLower = currentSearch.toLowerCase();
        displayArticles = displayArticles.filter(article => 
            article.title.toLowerCase().includes(searchLower) || 
            (article.description && article.description.toLowerCase().includes(searchLower))
        );
    }
    
    // 2. Apply Sorting
    displayArticles.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // 3. Extract Hero (First item if sorted newest and no search, else use specifically featured or just the first)
    let heroArticle = null;
    let gridArticles = displayArticles;

    if (currentSearch === '' && currentSort === 'newest' && displayArticles.length > 0) {
        // Find featured or take first
        const featuredIndex = displayArticles.findIndex(a => a.isFeatured);
        if (featuredIndex !== -1) {
            heroArticle = displayArticles.splice(featuredIndex, 1)[0];
        } else {
            heroArticle = displayArticles.shift();
        }
    }

    // 4. Render DOM
    renderHero(heroArticle);
    renderGrid(gridArticles);
}

function renderHero(article) {
    if (!article) {
        heroSection.style.display = 'none';
        return;
    }

    heroSection.style.display = 'block';
    
    const formattedDate = formatDate(article.publishedAt);
    
    heroSection.innerHTML = `
        <article class="hero-card" onclick="window.location.href='${article.url}'">
            <img src="${article.urlToImage || 'https://images.unsplash.com/photo-1620712948343-0056ce66a147?auto=format&fit=crop&q=80&w=800'}" alt="${article.title}" class="hero-image" loading="lazy">
            <div class="hero-content">
                <span class="badge badge-breaking">Featured Insight</span>
                <h1 class="hero-title">${article.title}</h1>
                <div class="hero-meta">
                    <span class="source">${article.source.name}</span>
                    <span>&bull;</span>
                    <span class="date">${formattedDate}</span>
                </div>
            </div>
        </article>
    `;
}

function renderGrid(articlesToRender) {
    if (articlesToRender.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                <h3>No articles found</h3>
                <p>Try adjusting your search terms.</p>
            </div>
        `;
        return;
    }

    newsGrid.innerHTML = articlesToRender.map(article => {
        const formattedDate = formatDate(article.publishedAt);
        const imageUrl = article.urlToImage || 'https://images.unsplash.com/photo-1620712948343-0056ce66a147?auto=format&fit=crop&q=80&w=400';
        
        return `
            <article class="news-card">
                <a href="${article.url}" class="card-image-wrapper">
                    <img src="${imageUrl}" alt="${article.title}" class="card-image" loading="lazy">
                </a>
                <div class="card-content">
                    <div class="card-meta">
                        <span class="card-source">${article.source.name}</span>
                        <span>${formattedDate}</span>
                    </div>
                    <a href="${article.url}">
                        <h3 class="card-title">${article.title}</h3>
                    </a>
                    <p class="card-description">${article.description || ''}</p>
                    <div class="card-footer">
                        <a href="${article.url}" class="read-more">
                            Read article
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// ==========================================================================
// Event Listeners & Utilities
// ==========================================================================
function setupEventListeners() {
    // Sorting
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderApp();
    });

    // Searching with debounce
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = e.target.value;
            renderApp();
        }, 300);
    });
}

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const date = new Date(dateString);
    
    // Rough "time ago" logic for very recent items
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / 3600000);
    
    if (diffHrs < 24) {
        if (diffHrs === 0) return 'Just now';
        return `${diffHrs}h ago`;
    }
    
    return date.toLocaleDateString('en-US', options);
}

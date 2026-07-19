const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close-btn');
const favoritesBtn = document.getElementById('favoritesBtn');
const trailerModal = document.getElementById('trailerModal');
const trailerBody = document.getElementById('trailerBody');
const yearFilter = document.getElementById('yearFilter');
const typeFilter = document.getElementById('typeFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
let totalResults = 0;
let currentSearchQuery = '';

const searchHistoryDatalist = document.getElementById('searchHistory');
const trendingContainer = document.getElementById('trendingContainer');
const trendingSection = document.getElementById('trendingSection');
const themeToggle = document.getElementById('themeToggle');
const skeletonLoader = document.getElementById('skeletonLoader');
const skeletonGrid = document.querySelector('.skeleton-grid');
const similarMoviesContainer = document.getElementById('similarMoviesContainer');
const similarMoviesSection = document.getElementById('similarMoviesSection');

// Event listeners
favoritesBtn.addEventListener('click', showFavorites);
searchBtn.addEventListener('click', searchMovies);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchMovies();
    }
});
yearFilter.addEventListener('change', () => { currentPage = 1; searchMovies(); });
typeFilter.addEventListener('change', () => { currentPage = 1; searchMovies(); });
clearFiltersBtn.addEventListener('click', clearFilters);
prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; searchMovies(); } });
nextPageBtn.addEventListener('click', () => { currentPage++; searchMovies(); });
themeToggle.addEventListener('click', toggleTheme);

// Infinite scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (totalResults > 0) {
            currentPage++;
            loadMoreResults();
        }
    }
});

// Keyboard navigation
let focusedCardIndex = -1;
let currentMovieCards = [];

document.addEventListener('keydown', (e) => {
    // Close modal with Escape
    if (e.key === 'Escape') {
        closeModal();
        closeTrailerModal();
        return;
    }
    
    // Only enable keyboard navigation when not in input
    if (document.activeElement === searchInput) return;
    
    const movieCards = document.querySelectorAll('.movie-card');
    if (movieCards.length === 0) return;
    
    currentMovieCards = Array.from(movieCards);
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusedCardIndex = (focusedCardIndex + 1) % currentMovieCards.length;
        focusCard(focusedCardIndex);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusedCardIndex = (focusedCardIndex - 1 + currentMovieCards.length) % currentMovieCards.length;
        focusCard(focusedCardIndex);
    } else if (e.key === 'Enter' && focusedCardIndex >= 0) {
        e.preventDefault();
        currentMovieCards[focusedCardIndex].click();
    }
});

function focusCard(index) {
    currentMovieCards.forEach((card, i) => {
        if (i === index) {
            card.style.boxShadow = '0 0 20px rgba(233, 69, 96, 0.8)';
            card.style.transform = 'scale(1.05)';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            card.style.boxShadow = '';
            card.style.transform = '';
        }
    });
}

closeBtn.addEventListener('click', closeModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) {
        closeModal();
    }
});

// Trailer modal close button
document.querySelector('.trailer-close').addEventListener('click', closeTrailerModal);
trailerModal.addEventListener('click', (e) => {
    if (e.target === trailerModal) {
        closeTrailerModal();
    }
});

// Search movies function
async function searchMovies() {
    const query = searchInput.value.trim();
    const yearFilterValue = yearFilter.value;
    const typeFilterValue = typeFilter.value;
    
    if (!query && !yearFilterValue && !typeFilterValue) {
        showError('Please enter a movie title or select filters');
        return;
    }

    // Save to search history if there's a query
    if (query) {
        saveSearchHistory(query);
    }

    // Reset page if new search
    if (query !== currentSearchQuery) {
        currentPage = 1;
        currentSearchQuery = query;
    }

    showLoading();
    hideError();
    resultsContainer.innerHTML = '';
    trendingSection.style.display = 'none';
    document.getElementById('genreSections').style.display = 'none';

    try {
        let url = `${BASE_URL}/search/movie?api_key=${API_KEY}`;
        
        if (query) {
            url += `&query=${encodeURIComponent(query)}`;
        }
        
        if (yearFilterValue) {
            url += `&year=${yearFilterValue}`;
        }
        
        url += `&page=${currentPage}`;

        const response = await fetch(url);
        const data = await response.json();

        hideLoading();

        if (data.results && data.results.length > 0) {
            let filteredMovies = data.results;
            totalResults = data.total_results;
            
            // Apply type filter if selected (movie/tv)
            if (typeFilterValue) {
                filteredMovies = filteredMovies.filter(movie => {
                    if (typeFilterValue === 'movie') return true;
                    return false;
                });
            }
            
            if (filteredMovies.length === 0) {
                showError('No movies found matching your criteria');
                resultsContainer.innerHTML = '<p class="no-results">No movies found matching your criteria.</p>';
                updatePaginationControls(0);
            } else {
                displayMovies(filteredMovies);
                updatePaginationControls(data.total_pages);
            }
        } else {
            showError('No movies found');
            resultsContainer.innerHTML = '<p class="no-results">No movies found. Try a different search term.</p>';
            updatePaginationControls(0);
        }
    } catch (error) {
        hideLoading();
        showError('An error occurred. Please check your internet connection and API key.');
        console.error('Error:', error);
    }
}

function updatePaginationControls(totalPages) {
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;
    
    if (totalPages === 0) {
        document.getElementById('pagination').style.display = 'none';
    } else {
        document.getElementById('pagination').style.display = 'flex';
    }
}

async function loadMoreResults() {
    const query = searchInput.value.trim();
    const yearFilterValue = yearFilter.value;
    const typeFilterValue = typeFilter.value;
    
    if (!query) return;
    
    showLoading();
    
    try {
        let url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`;
        
        if (yearFilterValue) {
            url += `&year=${yearFilterValue}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        hideLoading();

        if (data.results && data.results.length > 0) {
            let filteredMovies = data.results;
            
            if (typeFilterValue) {
                filteredMovies = filteredMovies.filter(movie => {
                    if (typeFilterValue === 'movie') return true;
                    return false;
                });
            }
            
            if (filteredMovies.length > 0) {
                appendMovies(filteredMovies);
                updatePaginationControls(data.total_pages);
            }
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading more results:', error);
    }
}

function appendMovies(movies) {
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.dataset.tmdbId = movie.id;
        const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        movieCard.innerHTML = `
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="movie-poster"
            >
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            </div>
        `;
        movieCard.addEventListener('click', () => getMovieDetails(movie.id));
        resultsContainer.appendChild(movieCard);
    });
}

function filterByYear(movies, yearFilter) {
    switch(yearFilter) {
        case '2024':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2024'));
        case '2023':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2023'));
        case '2022':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2022'));
        case '2021':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2021'));
        case '2020':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2020'));
        case '2019':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2019'));
        case '2018':
            return movies.filter(movie => movie.release_date && movie.release_date.includes('2018'));
        case '2010s':
            return movies.filter(movie => {
                const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
                return year >= 2010 && year < 2020;
            });
        case '2000s':
            return movies.filter(movie => {
                const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
                return year >= 2000 && year < 2010;
            });
        case '1990s':
            return movies.filter(movie => {
                const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
                return year >= 1990 && year < 2000;
            });
        case 'older':
            return movies.filter(movie => {
                const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
                return year < 1990;
            });
        default:
            return movies;
    }
}

function clearFilters() {
    searchInput.value = '';
    yearFilter.value = '';
    typeFilter.value = '';
    currentPage = 1;
    currentSearchQuery = '';
    hideError();
    resultsContainer.innerHTML = '';
    document.getElementById('pagination').style.display = 'none';
}

// Display movies in grid
function displayMovies(movies) {
    resultsContainer.innerHTML = movies.map(movie => {
        const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        const isFavorite = isMovieFavorite(movie.id);
        return `
        <div class="movie-card" data-tmdb-id="${movie.id}">
            <div class="favorite-indicator ${isFavorite ? 'active' : ''}" data-tmdb-id="${movie.id}" data-title="${movie.title.replace(/'/g, "\\'")}" data-poster="${movie.poster_path || ''}">
                <i data-lucide="${isFavorite ? 'heart' : 'heart'}"></i>
            </div>
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="movie-poster"
            >
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            </div>
        </div>
    `}).join('');
    
    // Add event listeners to movie cards
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger movie details if clicking on favorite indicator
            if (e.target.closest('.favorite-indicator')) return;
            const tmdbId = card.dataset.tmdbId;
            getMovieDetails(tmdbId);
        });
    });
    
    // Add event listeners to favorite indicators
    document.querySelectorAll('.favorite-indicator').forEach(indicator => {
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            const tmdbId = indicator.dataset.tmdbId;
            const title = indicator.dataset.title;
            const poster = indicator.dataset.poster;
            toggleFavorite(tmdbId, title, poster);
        });
    });
    
    lucide.createIcons();
}

// Get detailed movie information
async function getMovieDetails(tmdbId) {
    showLoading();
    
    try {
        const response = await fetch(`${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits,videos,recommendations`);
        const movie = await response.json();
        
        hideLoading();
        
        if (movie.id) {
            displayMovieDetails(movie);
        } else {
            showError('Failed to fetch movie details');
        }
    } catch (error) {
        hideLoading();
        showError('An error occurred while fetching movie details');
        console.error('Error:', error);
    }
}

// Display movie details in modal
function displayMovieDetails(movie) {
    const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL_ORIGINAL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
    const isFavorite = isMovieFavorite(movie.id);
    
    // Load similar movies
    loadSimilarMovies(movie.id, movie.genre_ids);
    
    // Format genres
    const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'N/A';
    
    // Format cast
    const cast = movie.credits && movie.credits.cast ? movie.credits.cast.slice(0, 5).map(c => c.name).join(', ') : 'N/A';
    
    // Format director
    const director = movie.credits && movie.credits.crew ? movie.credits.crew.find(c => c.job === 'Director')?.name || 'N/A' : 'N/A';
    
    // Format writers
    const writers = movie.credits && movie.credits.crew ? movie.credits.crew.filter(c => c.department === 'Writing').slice(0, 3).map(c => c.name).join(', ') : 'N/A';
    
    // Format runtime
    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
    
    // Format budget and revenue
    const budget = movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A';
    const revenue = movie.revenue ? `$${movie.revenue.toLocaleString()}` : 'N/A';
    
    // Get IMDb ID if available
    const imdbId = movie.imdb_id || '';

    modalBody.innerHTML = `
        <div class="modal-body">
            <img src="${posterUrl}" alt="${movie.title}" class="modal-poster">
            <div class="modal-details">
                <h2>${movie.title}</h2>
                <p class="year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                <span class="rating">TMDB: ${movie.vote_average}/10 (${movie.vote_count} votes)</span>
                
                <div class="ratings-container">
                    <div class="rating-item">
                        <div class="rating-source">TMDB</div>
                        <div class="rating-value">${movie.vote_average}/10</div>
                    </div>
                </div>
                
                <p class="plot"><strong>Plot:</strong> ${movie.overview || 'No overview available'}</p>
                <p class="genre"><strong>Genre:</strong> ${genres}</p>
                <p class="director"><strong>Director:</strong> ${director}</p>
                <p class="actors"><strong>Actors:</strong> ${cast}</p>
                <p class="writer"><strong>Writer:</strong> ${writers}</p>
                <p class="runtime"><strong>Runtime:</strong> ${runtime}</p>
                <p><strong>Language:</strong> ${movie.original_language || 'N/A'}</p>
                <p><strong>Country:</strong> ${movie.production_countries && movie.production_countries.length > 0 ? movie.production_countries.map(c => c.name).join(', ') : 'N/A'}</p>
                <p><strong>Budget:</strong> ${budget}</p>
                <p><strong>Revenue:</strong> ${revenue}</p>
                ${imdbId ? `<a href="https://www.imdb.com/title/${imdbId}/reviews" target="_blank" class="reviews-link"><i data-lucide="file-text"></i> Read User Reviews on IMDb</a>` : ''}
                <div class="button-group">
                    <button id="favoriteBtn" class="favorite-btn" data-tmdb-id="${movie.id}" data-title="${movie.title.replace(/'/g, "\\'")}" data-poster="${movie.poster_path || ''}">
                        ${isFavorite ? '<i data-lucide="heart-off"></i> Remove from Favorites' : '<i data-lucide="heart"></i> Add to Favorites'}
                    </button>
                    <button id="trailerBtn" class="trailer-btn" data-title="${movie.title.replace(/'/g, "\\'")}">
                        <i data-lucide="film"></i> Watch Trailer
                    </button>
                    <button id="shareBtn" class="share-btn" data-tmdb-id="${movie.id}" data-title="${movie.title.replace(/'/g, "\\'")}">
                        <i data-lucide="share-2"></i> Share
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to modal buttons
    const favoriteBtn = document.getElementById('favoriteBtn');
    const trailerBtn = document.getElementById('trailerBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    favoriteBtn.addEventListener('click', () => {
        toggleFavorite(favoriteBtn.dataset.tmdbId, favoriteBtn.dataset.title, favoriteBtn.dataset.poster);
    });
    
    trailerBtn.addEventListener('click', () => {
        openTrailer(trailerBtn.dataset.title);
    });
    
    shareBtn.addEventListener('click', () => {
        shareMovie(shareBtn.dataset.tmdbId, shareBtn.dataset.title);
    });
    
    movieModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

// Close modal
function closeModal() {
    movieModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    similarMoviesContainer.innerHTML = '';
}

// UI helper functions
function showLoading() {
    skeletonLoader.style.display = 'block';
    skeletonGrid.innerHTML = '';
    // Create 6 skeleton cards
    for (let i = 0; i < 6; i++) {
        skeletonGrid.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-year"></div>
                </div>
            </div>
        `;
    }
}

function hideLoading() {
    skeletonLoader.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Favorites functions
function getFavorites() {
    const favorites = localStorage.getItem('movieFavorites');
    return favorites ? JSON.parse(favorites) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem('movieFavorites', JSON.stringify(favorites));
}

function isMovieFavorite(tmdbId) {
    const favorites = getFavorites();
    return favorites.some(movie => movie.tmdbId === tmdbId);
}

function toggleFavorite(tmdbId, title, poster) {
    const favorites = getFavorites();
    const existingIndex = favorites.findIndex(movie => movie.tmdbId === tmdbId);
    
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        const note = prompt('Add a note for this movie (optional):', '');
        favorites.push({ tmdbId, title, poster, note: note || '' });
    }
    
    saveFavorites(favorites);
    
    // Update the button in the modal
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.innerHTML = existingIndex > -1 ? '<i data-lucide="heart-off"></i> Remove from Favorites' : '<i data-lucide="heart"></i> Add to Favorites';
        lucide.createIcons();
    }
    
    // Update movie cards if they're displayed
    updateMovieCardFavoriteStatus(tmdbId);
}

function updateMovieCardFavoriteStatus(tmdbId) {
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        const cardTmdbId = card.dataset.tmdbId;
        if (cardTmdbId && cardTmdbId === tmdbId) {
            const isFavorite = isMovieFavorite(tmdbId);
            let favoriteIndicator = card.querySelector('.favorite-indicator');
            if (!favoriteIndicator) {
                favoriteIndicator = document.createElement('div');
                favoriteIndicator.className = 'favorite-indicator';
                card.querySelector('.movie-info').appendChild(favoriteIndicator);
            }
            favoriteIndicator.innerHTML = isFavorite ? '<i data-lucide="heart"></i>' : '';
            if (isFavorite) lucide.createIcons();
        }
    });
}

function showFavorites() {
    const favorites = getFavorites();
    
    if (favorites.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No favorites yet. Start adding movies to your favorites!</p>';
        return;
    }
    
    showLoading();
    hideError();
    resultsContainer.innerHTML = '';
    
    // Fetch details for each favorite
    Promise.all(favorites.map(fav => 
        fetch(`${BASE_URL}/movie/${fav.tmdbId}?api_key=${API_KEY}`)
            .then(res => res.json())
    )).then(movies => {
        hideLoading();
        const validMovies = movies.filter(movie => movie.id);
        displayMovies(validMovies);
    }).catch(error => {
        hideLoading();
        showError('Error loading favorites');
        console.error('Error:', error);
    });
}

// Search history functions
function getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
}

function saveSearchHistory(query) {
    let history = getSearchHistory();
    
    // Remove if already exists (to move it to top)
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    
    // Add new query to beginning
    history.unshift(query);
    
    // Keep only last 10 searches
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
    updateSearchHistoryDatalist();
}

function updateSearchHistoryDatalist() {
    const history = getSearchHistory();
    searchHistoryDatalist.innerHTML = history.map(query => 
        `<option value="${query}">`
    ).join('');
}

// Check if API key is set on page load
window.addEventListener('load', () => {
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Please add your TMDB API key to script.js to use this application');
    }
    updateSearchHistoryDatalist();
    loadTrendingMovies();
    loadThemePreference();
    lucide.createIcons();
    
    // Check for shared movie URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedMovieId = urlParams.get('movie');
    if (sharedMovieId) {
        getMovieDetails(sharedMovieId);
    }
});

// Theme toggle functions
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i data-lucide="sun"></i>';
        lucide.createIcons();
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Similar movies functions
async function loadSimilarMovies(movieId, genreIds) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Get first 6 similar movies
            const similarMovies = data.results.slice(0, 6);
            
            if (similarMovies.length > 0) {
                displaySimilarMovies(similarMovies);
            } else {
                similarMoviesSection.style.display = 'none';
            }
        } else {
            similarMoviesSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading similar movies:', error);
        similarMoviesSection.style.display = 'none';
    }
}

function displaySimilarMovies(movies) {
    similarMoviesSection.style.display = 'block';
    similarMoviesContainer.innerHTML = movies.map(movie => {
        const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/120x180?text=No+Poster';
        return `
        <div class="similar-movie-card" data-tmdb-id="${movie.id}">
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="similar-movie-poster"
            >
            <p class="similar-movie-title">${movie.title}</p>
        </div>
    `}).join('');
    
    // Add event listeners to similar movie cards
    document.querySelectorAll('.similar-movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const tmdbId = card.dataset.tmdbId;
            getMovieDetails(tmdbId);
        });
    });
}

// Load trending movies
async function loadTrendingMovies() {
    try {
        // TMDB genre IDs
        const genreMap = {
            'action': 28,
            'comedy': 35,
            'drama': 18,
            'romance': 10749,
            'horror': 27,
            'sci-fi': 878
        };
        
        const genres = ['action', 'comedy', 'drama', 'romance', 'horror', 'sci-fi'];
        const genreSections = document.getElementById('genreSections');
        genreSections.innerHTML = '';
        
        for (const genre of genres) {
            try {
                const genreId = genreMap[genre];
                const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    // Create genre section
                    const genreSection = document.createElement('div');
                    genreSection.className = 'genre-section';
                    genreSection.innerHTML = `
                        <h3><i data-lucide="film"></i> ${genre.charAt(0).toUpperCase() + genre.slice(1)}</h3>
                        <div class="genre-movies-container results-container"></div>
                    `;
                    genreSections.appendChild(genreSection);
                    
                    // Add movies to genre section
                    const container = genreSection.querySelector('.genre-movies-container');
                    const movies = data.results.slice(0, 5);
                    
                    movies.forEach(movie => {
                        const movieCard = document.createElement('div');
                        movieCard.className = 'movie-card';
                        movieCard.dataset.tmdbId = movie.id;
                        const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
                        movieCard.innerHTML = `
                            <img 
                                src="${posterUrl}" 
                                alt="${movie.title}" 
                                class="movie-poster"
                            >
                            <div class="movie-info">
                                <h3 class="movie-title">${movie.title}</h3>
                                <p class="movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                            </div>
                        `;
                        movieCard.addEventListener('click', () => getMovieDetails(movie.id));
                        container.appendChild(movieCard);
                    });
                }
            } catch (error) {
                console.error(`Error loading ${genre} movies:`, error);
            }
        }
        
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading trending movies:', error);
    }
}

function displayTrendingMovies(movies) {
    trendingContainer.innerHTML = movies.map(movie => {
        const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        return `
        <div class="movie-card" data-tmdb-id="${movie.id}">
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="movie-poster"
            >
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            </div>
        </div>
    `}).join('');
    
    // Add event listeners to trending movie cards
    document.querySelectorAll('#trendingContainer .movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const tmdbId = card.dataset.tmdbId;
            getMovieDetails(tmdbId);
        });
    });
}

// Trailer functions
async function openTrailer(movieTitle) {
    showLoading();
    
    try {
        // Search for trailer on YouTube
        const searchQuery = `${movieTitle} official trailer`;
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&key=YOUR_YOUTUBE_API_KEY&type=video&maxResults=1`);
        
        // Since we don't have a YouTube API key, we'll use a workaround
        // Open YouTube search in a new tab
        hideLoading();
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
    } catch (error) {
        hideLoading();
        // Fallback: open YouTube search
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movieTitle + ' trailer')}`, '_blank');
    }
}

// Share movie function
function shareMovie(tmdbId, title) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?movie=${tmdbId}`;
    
    if (navigator.share) {
        navigator.share({
            title: `Check out ${title}`,
            text: `I found this great movie: ${title}`,
            url: shareUrl
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this link:', shareUrl);
        });
    }
}

function closeTrailerModal() {
    trailerModal.style.display = 'none';
    trailerBody.innerHTML = '';
    document.body.style.overflow = 'auto';
}

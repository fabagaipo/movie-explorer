const API_KEY = process.env.OMDB_API_KEY || 'YOUR_API_KEY_HERE';
const BASE_URL = 'http://www.omdbapi.com/';

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

closeBtn.addEventListener('click', closeModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) {
        closeModal();
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

    try {
        let url = `${BASE_URL}?apikey=${API_KEY}`;
        
        if (query) {
            url += `&s=${encodeURIComponent(query)}`;
        }
        
        if (typeFilterValue) {
            url += `&type=${typeFilterValue}`;
        }
        
        url += `&page=${currentPage}`;

        const response = await fetch(url);
        const data = await response.json();

        hideLoading();

        if (data.Response === 'True') {
            let filteredMovies = data.Search;
            totalResults = parseInt(data.totalResults);
            
            // Apply year filter if selected
            if (yearFilterValue) {
                filteredMovies = filterByYear(filteredMovies, yearFilterValue);
            }
            
            if (filteredMovies.length === 0) {
                showError('No movies found matching your criteria');
                resultsContainer.innerHTML = '<p class="no-results">No movies found matching your criteria.</p>';
                updatePaginationControls(0);
            } else {
                displayMovies(filteredMovies);
                updatePaginationControls(Math.ceil(totalResults / 10));
            }
        } else {
            showError(data.Error || 'No movies found');
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

function filterByYear(movies, yearFilter) {
    switch(yearFilter) {
        case '2024':
            return movies.filter(movie => movie.Year.includes('2024'));
        case '2023':
            return movies.filter(movie => movie.Year.includes('2023'));
        case '2022':
            return movies.filter(movie => movie.Year.includes('2022'));
        case '2021':
            return movies.filter(movie => movie.Year.includes('2021'));
        case '2020':
            return movies.filter(movie => movie.Year.includes('2020'));
        case '2019':
            return movies.filter(movie => movie.Year.includes('2019'));
        case '2018':
            return movies.filter(movie => movie.Year.includes('2018'));
        case '2010s':
            return movies.filter(movie => {
                const year = parseInt(movie.Year);
                return year >= 2010 && year < 2020;
            });
        case '2000s':
            return movies.filter(movie => {
                const year = parseInt(movie.Year);
                return year >= 2000 && year < 2010;
            });
        case '1990s':
            return movies.filter(movie => {
                const year = parseInt(movie.Year);
                return year >= 1990 && year < 2000;
            });
        case 'older':
            return movies.filter(movie => {
                const year = parseInt(movie.Year);
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
    resultsContainer.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="getMovieDetails('${movie.imdbID}')">
            <img 
                src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                alt="${movie.Title}" 
                class="movie-poster"
            >
            <div class="movie-info">
                <h3 class="movie-title">${movie.Title}</h3>
                <p class="movie-year">${movie.Year}</p>
            </div>
        </div>
    `).join('');
}

// Get detailed movie information
async function getMovieDetails(imdbID) {
    showLoading();
    
    try {
        const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&i=${imdbID}&plot=full`);
        const movie = await response.json();
        
        hideLoading();
        
        if (movie.Response === 'True') {
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
    const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';
    const isFavorite = isMovieFavorite(movie.imdbID);
    
    // Load similar movies
    loadSimilarMovies(movie.Title, movie.Genre);
    
    let ratingsHTML = '';
    if (movie.Ratings && movie.Ratings.length > 0) {
        ratingsHTML = movie.Ratings.map(rating => `
            <div class="rating-item">
                <div class="rating-source">${rating.Source}</div>
                <div class="rating-value">${rating.Value}</div>
            </div>
        `).join('');
    } else {
        ratingsHTML = '<div class="rating-item"><div class="rating-source">No ratings available</div></div>';
    }

    modalBody.innerHTML = `
        <div class="modal-body">
            <img src="${posterUrl}" alt="${movie.Title}" class="modal-poster">
            <div class="modal-details">
                <h2>${movie.Title}</h2>
                <p class="year">${movie.Year}</p>
                <span class="rating">IMDb: ${movie.imdbRating}/10</span>
                
                <div class="ratings-container">
                    ${ratingsHTML}
                </div>
                
                <p class="plot"><strong>Plot:</strong> ${movie.Plot}</p>
                <p class="genre"><strong>Genre:</strong> ${movie.Genre}</p>
                <p class="director"><strong>Director:</strong> ${movie.Director}</p>
                <p class="actors"><strong>Actors:</strong> ${movie.Actors}</p>
                <p class="writer"><strong>Writer:</strong> ${movie.Writer}</p>
                <p class="runtime"><strong>Runtime:</strong> ${movie.Runtime}</p>
                <p><strong>Language:</strong> ${movie.Language}</p>
                <p><strong>Country:</strong> ${movie.Country}</p>
                <p><strong>Awards:</strong> ${movie.Awards}</p>
                <button id="favoriteBtn" class="favorite-btn" onclick="toggleFavorite('${movie.imdbID}', '${movie.Title.replace(/'/g, "\\'")}', '${movie.Poster !== 'N/A' ? movie.Poster : ''}')">
                    ${isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
                </button>
                <button id="trailerBtn" class="trailer-btn" onclick="openTrailer('${movie.Title.replace(/'/g, "\\'")}')">
                    🎬 Watch Trailer
                </button>
            </div>
        </div>
    `;
    
    movieModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
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

function isMovieFavorite(imdbID) {
    const favorites = getFavorites();
    return favorites.some(movie => movie.imdbID === imdbID);
}

function toggleFavorite(imdbID, title, poster) {
    const favorites = getFavorites();
    const existingIndex = favorites.findIndex(movie => movie.imdbID === imdbID);
    
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push({ imdbID, title, poster });
    }
    
    saveFavorites(favorites);
    
    // Update the button in the modal
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.innerHTML = existingIndex > -1 ? '🤍 Add to Favorites' : '❤️ Remove from Favorites';
    }
    
    // Update movie cards if they're displayed
    updateMovieCardFavoriteStatus(imdbID);
}

function updateMovieCardFavoriteStatus(imdbID) {
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        const onclick = card.getAttribute('onclick');
        if (onclick && onclick.includes(imdbID)) {
            const isFavorite = isMovieFavorite(imdbID);
            let favoriteIndicator = card.querySelector('.favorite-indicator');
            if (!favoriteIndicator) {
                favoriteIndicator = document.createElement('div');
                favoriteIndicator.className = 'favorite-indicator';
                card.querySelector('.movie-info').appendChild(favoriteIndicator);
            }
            favoriteIndicator.innerHTML = isFavorite ? '❤️' : '';
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
        fetch(`${BASE_URL}?apikey=${API_KEY}&i=${fav.imdbID}`)
            .then(res => res.json())
    )).then(movies => {
        hideLoading();
        const validMovies = movies.filter(movie => movie.Response === 'True');
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
    if (API_KEY === 'YOUR_OMDB_API_KEY_HERE') {
        showError('Please add your OMDb API key to script.js to use this application');
    }
    updateSearchHistoryDatalist();
    loadTrendingMovies();
    loadThemePreference();
});

// Theme toggle functions
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = '☀️';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Similar movies functions
async function loadSimilarMovies(title, genre) {
    try {
        // Use genre to find similar movies
        const mainGenre = genre.split(',')[0].trim();
        const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&s=${mainGenre}&type=movie`);
        const data = await response.json();
        
        if (data.Response === 'True') {
            // Filter out the current movie and get first 6 similar movies
            const similarMovies = data.Search
                .filter(movie => movie.Title.toLowerCase() !== title.toLowerCase())
                .slice(0, 6);
            
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
    similarMoviesContainer.innerHTML = movies.map(movie => `
        <div class="similar-movie-card" onclick="getMovieDetails('${movie.imdbID}')">
            <img 
                src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/120x180?text=No+Poster'}" 
                alt="${movie.Title}" 
                class="similar-movie-poster"
            >
            <p class="similar-movie-title">${movie.Title}</p>
        </div>
    `).join('');
}

// Load trending movies
async function loadTrendingMovies() {
    try {
        // Search for popular recent movies
        const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&s=2024&type=movie`);
        const data = await response.json();
        
        if (data.Response === 'True') {
            // Get first 6 movies for trending section
            const trendingMovies = data.Search.slice(0, 6);
            displayTrendingMovies(trendingMovies);
        }
    } catch (error) {
        console.error('Error loading trending movies:', error);
    }
}

function displayTrendingMovies(movies) {
    trendingContainer.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="getMovieDetails('${movie.imdbID}')">
            <img 
                src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                alt="${movie.Title}" 
                class="movie-poster"
            >
            <div class="movie-info">
                <h3 class="movie-title">${movie.Title}</h3>
                <p class="movie-year">${movie.Year}</p>
            </div>
        </div>
    `).join('');
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

function closeTrailerModal() {
    trailerModal.style.display = 'none';
    trailerBody.innerHTML = '';
    document.body.style.overflow = 'auto';
}

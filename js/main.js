// API
const API_KEY = "a6d149705f1845d0bc5190405250205"; 
const BASE_URL = "https://api.weatherapi.com/v1";

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const unitToggleButtons = document.querySelectorAll(".unit-toggle button");
const errorContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");
const weatherContainer = document.getElementById("weather-container");
const recentContainer = document.getElementById("recent-container");

// loading container 
let loadingContainer = document.getElementById("loading-container");
if (!loadingContainer) {
    loadingContainer = document.createElement("div");
    loadingContainer.id = "loading-container";
    loadingContainer.className = "loading-container hidden";
    loadingContainer.innerHTML = 
        "<div class=\"loader\"></div><p>Loading weather data...</p>";
    document.body.appendChild(loadingContainer);
}

// Current Weather 
const currentDateElement = document.getElementById("current-date");
const locationElement = document.getElementById("location");
const currentTempElement = document.getElementById("current-temp");
const weatherIconElement = document.getElementById("weather-icon");

// Today's Forecast 
const hourlyContainer = document.getElementById("hourly-container");

// Weather Details 
const sunriseTimeElement = document.getElementById("sunrise");
const sunsetTimeElement = document.getElementById("sunset");
const rainChanceElement = document.getElementById("rain-chance");
const windSpeedElement = document.getElementById("wind");
const uvIndexElement = document.getElementById("uv-index");
const feelsLikeElement = document.getElementById("feels-like");

// 7-Day Forecast 
const weeklyContainer = document.getElementById("weekly-container");

// State
let currentUnit = "celsius"; 
let currentWeatherData = null;
let currentCity = "Madrid"; // Default city
const RECENT_SEARCHES_KEY = "weatherAppRecentSearches";
const MAX_RECENT_SEARCHES = 5;

// Load recent searches 
let recentSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Check if all DOM elements exist
    if (!weatherContainer) {
        console.error("Weather container not found!");
        return;
    }
    
    // Set initial button in HTML
    unitToggleButtons.forEach(button => {
        if (button.classList.contains("active")) {
            currentUnit = button.id === "fahrenheit" ? "imperial" : "celsius";
        }
    });
    
    // Load last search or default city
    const lastSearch = recentSearches[0] || currentCity;
    getWeatherData(lastSearch);

    // Display recent searches
    displayRecentSearches();
});

// Search button 
if (searchButton) {
    searchButton.addEventListener("click", handleSearch);
}

// Search input 
if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    });
}

// Unit toggle 
if (unitToggleButtons.length > 0) {
    unitToggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!button.classList.contains("active")) {
                unitToggleButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                // Update unit and refresh 
                const newUnit = button.id === "fahrenheit" ? "imperial" : "celsius";
                if (newUnit !== currentUnit) {
                    currentUnit = newUnit;
                    // Update UI with current data in new unit
                    if (currentWeatherData) {
                        updateWeatherUI(currentWeatherData, currentCity);
                    } else {
                        getWeatherData(currentCity);
                    }
                }
            }
        });
    });
}

// Functions
function handleSearch() {
    if (!searchInput) return;
    const city = searchInput.value.trim();
    if (city) {
        getWeatherData(city);
        searchInput.value = "";
    } else {
        showError("Please enter a city name.");
    }
}

function getWeatherData(city) {
    // Clear any "no results" message first
    const existingNoResults = document.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    // Basic validation before making API call
    if (!city || !isValidCityName(city)) {
        showNoResultsMessage();
        return;
    }
    
    // Show loading state
    showLoading();
    currentCity = city;

    const forecastUrl = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${city}&days=7&aqi=no&alerts=no`;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", forecastUrl, true);
    xhr.timeout = 10000; // 10 second timeout

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const weatherData = JSON.parse(xhr.responseText);

                if (weatherData.error) {
                    showError(weatherData.error.message);
                    return;
                }

                // Store the fetched data
                currentWeatherData = weatherData;

                // Update UI with weather data
                updateWeatherUI(weatherData, city);

                // Add to recent searches
                const locationName = weatherData.location?.name || city;
                addToRecentSearches(locationName);
            } catch (e) {
                showError("Error parsing weather data");
            }
        } else {
            let errorMsg = "City not found or API error";
            try {
                const errData = JSON.parse(xhr.responseText);
                if (errData && errData.error && errData.error.message) {
                    errorMsg = errData.error.message;
                }
            } catch (e) { /* Ignore parsing error */ }
            showError(errorMsg);
        }
    };

    xhr.ontimeout = function() {
        showError("Request timed out. Please try again.");
    };

    xhr.onerror = function () {
        showError("Network error while fetching weather data");
    };

    xhr.send();
}

function showLoading() {
    if (!loadingContainer || !weatherContainer || !errorContainer) return;
    weatherContainer.classList.add("hidden");
    errorContainer.classList.add("hidden");
    loadingContainer.classList.remove("hidden");
}

function hideLoading() {
    if (!loadingContainer) return;
    loadingContainer.classList.add("hidden");
}

function showError(message) {
    hideLoading();
    if (!weatherContainer || !errorContainer) return;
    
    // Create or update error container on the home page
    if (!errorContainer.querySelector('.error-content')) {
        errorContainer.innerHTML = `
            <div class="error-content">
                <div class="error-icon">❌</div>
                <div class="error-message" id="error-message">${message}</div>
                <div class="error-description">Please check the city name and try again, or try searching for a different location.</div>
            </div>
        `;
    } else {
        const errorMessageElement = errorContainer.querySelector('#error-message');
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
        }
    }
    
    // Show error container and hide weather container
    errorContainer.classList.remove("hidden");
    weatherContainer.classList.add("hidden");
    
    // Position the error container in the main content area
    if (weatherContainer.parentNode) {
        if (!weatherContainer.parentNode.contains(errorContainer)) {
            weatherContainer.parentNode.insertBefore(errorContainer, weatherContainer);
        }
    }
}

function updateWeatherUI(data, city) {
    // Guard clauses for essential elements
    if (!currentDateElement || !locationElement || !currentTempElement || !weatherIconElement) {
        console.error("One or more essential UI elements are missing.");
        hideLoading();
        return;
    }

    // Format date to match design: "2nd Feb, Friday"
    const date = new Date(data.location.localtime);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    currentDateElement.textContent = `${day}${getOrdinalSuffix(day)} ${month}, ${weekday}`;
    
    // Update location
    locationElement.textContent = data.location.name;

    // Set temperature by unit
    const tempField = currentUnit === "imperial" ? "temp_f" : "temp_c";
    const minTempField = currentUnit === "imperial" ? "mintemp_f" : "mintemp_c";
    const maxTempField = currentUnit === "imperial" ? "maxtemp_f" : "maxtemp_c";
    const windField = currentUnit === "imperial" ? "wind_mph" : "wind_kph";
    const feelsLikeField = currentUnit === "imperial" ? "feelslike_f" : "feelslike_c";
    const windUnit = currentUnit === "imperial" ? "mph" : "km/h";

    // Update current temperature 
    const currentTempValue = Math.round(data.current[tempField]);
    const minTemp = Math.round(data.forecast.forecastday[0].day[minTempField]);
    currentTempElement.textContent = `${currentTempValue}°/${minTemp}°`;

    // Update weather icon
    const iconUrl = data.current.condition.icon;
    weatherIconElement.src = iconUrl.startsWith("//") ? "https:" + iconUrl : iconUrl;
    weatherIconElement.alt = data.current.condition.text;

    // Update hourly forecast
    updateHourlyForecast(data.forecast.forecastday[0].hour, tempField);

    // Update weather details
    updateWeatherDetails(data, windUnit, windField, feelsLikeField);

    // Update weekly forecast
    updateWeeklyForecast(data.forecast.forecastday, maxTempField, minTempField);

    // Show weather container
    hideLoading();
    if (errorContainer) errorContainer.classList.add("hidden");
    weatherContainer.classList.remove("hidden");
}

function updateHourlyForecast(hourlyData, tempField) {
    if (!hourlyContainer) {
        console.error("Hourly container not found");
        return;
    }

    // Clear previous hourly forecast
    hourlyContainer.innerHTML = '';

    const currentHour = new Date().getHours();
    const maxHoursToShow = 12;

    // Get future hours, supplement with next day's hours if needed
    let futureHours = hourlyData.filter(hour => {
        const hourTime = new Date(hour.time).getHours();
        return hourTime >= currentHour;
    });

    
    futureHours = futureHours.slice(0, maxHoursToShow);

    if (futureHours.length === 0) {
        hourlyContainer.innerHTML = '<p>No hourly forecast available</p>';
        return;
    }

    futureHours.forEach((hour, index) => {
        const hourTime = new Date(hour.time);
        // Format time 
        const timeString = index === 0 ? 
            "Now" : 
            hourTime.toLocaleTimeString("en-US", { 
                hour: "numeric", 
                minute: "2-digit", 
                hour12: true 
            }).replace(/^0/, '12'); 

        const temp = Math.round(hour[tempField] || 0);
        const iconUrl = hour.condition?.icon || '';
        const iconSrc = iconUrl.startsWith("//") ? "https:" + iconUrl : iconUrl;
        const conditionText = hour.condition?.text || 'Unknown';

        const hourlyItem = document.createElement("div");
        hourlyItem.className = "forecast-item";
        hourlyItem.innerHTML = `
            <div class="forecast-time">${timeString}</div>
            <img src="${iconSrc}" alt="${conditionText}" class="forecast-icon" ${!iconSrc ? 'style="display:none"' : ''}>
            <div class="forecast-temp">${temp}°</div>
        `;
        hourlyContainer.appendChild(hourlyItem);
    });
}

function updateWeatherDetails(data, windUnit, windField, feelsLikeField) {
    // Check if all required elements exist
    if (!sunriseTimeElement || !sunsetTimeElement || !rainChanceElement || 
        !windSpeedElement || !uvIndexElement || !feelsLikeElement) {
        console.error("One or more weather detail elements are missing");
        return;
    }

    
    const forecastDay = data.forecast?.forecastday?.[0] || {};
    const astro = forecastDay.astro || {};
    const current = data.current || {};
    const day = forecastDay.day || {};

    // Update sunrise/sunset 
    sunriseTimeElement.textContent = astro.sunrise || "N/A";
    sunsetTimeElement.textContent = astro.sunset || "N/A";

    // Update rain 
    const rainProbability = day.daily_chance_of_rain ?? 0;
    rainChanceElement.textContent = `${rainProbability}%`;

    // Update wind speed
    const windSpeed = Math.round(current[windField] ?? 0);
    windSpeedElement.textContent = `${windSpeed} ${windUnit}`;

    // Update UV 
    const uv = Math.round(current.uv ?? 0);
    uvIndexElement.textContent = `${uv} of 10`;

    // Update feels match temperature
    const feelsLikeTemp = Math.round(current[feelsLikeField] ?? 0);
    const tempUnit = currentUnit === "imperial" ? "°F" : "°C";
    feelsLikeElement.textContent = `${feelsLikeTemp}${tempUnit}`;
}

function updateWeeklyForecast(forecastDays, maxTempField, minTempField) {
    if (!weeklyContainer) return;
    weeklyContainer.innerHTML = "<h3>7 DAYS FORECAST</h3>";

    //  show the next 6 days to match design
    forecastDays.slice(1, 7).forEach((day) => {
        const date = new Date(day.date);
        
        
        const dayNum = date.getDate();
        const monthName = date.toLocaleDateString("en-US", { month: "long" });
        const formattedDate = `${dayNum}${getOrdinalSuffix(dayNum)} ${monthName}`;
        
        // Get day name (Saturday, Sunday, etc.)
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        
        const maxTemp = Math.round(day.day[maxTempField]);
        const minTemp = Math.round(day.day[minTempField]);
        const iconUrl = day.day.condition.icon;
        const iconSrc = iconUrl.startsWith("//") ? "https:" + iconUrl : iconUrl;
        const description = day.day.condition.text;

        const weeklyItem = document.createElement("div");
        weeklyItem.className = "day-forecast";
        weeklyItem.innerHTML = `
            <div class="day-info">
                <div class="day-date">${formattedDate}</div>
                <div class="day-name">${dayName}</div>
            </div>
            <div class="day-weather">
                <img src="${iconSrc}" alt="${description}" class="day-icon">
                <span>${description}</span>
            </div>
            <div class="day-temp">${maxTemp}°/${minTemp}°</div>
        `;
        weeklyContainer.appendChild(weeklyItem);
    });
}

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

function addToRecentSearches(city) {
    // Normalize city name
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

    // Remove exists
    recentSearches = recentSearches.filter(
        (item) => item.toLowerCase() !== normalizedCity.toLowerCase()
    );
    
    // Add to start of array
    recentSearches.unshift(normalizedCity);
    
    // Limit to max number of searches
    if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }
    
    // Save to localStorage
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    
    displayRecentSearches();
}

function displayRecentSearches() {
    if (!recentContainer) return;
    recentContainer.innerHTML = "<h3>Recent Searches</h3>";
    
    if (recentSearches.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = "No recent searches";
        recentContainer.appendChild(emptyMessage);
        return;
    }
    
    recentSearches.forEach((city) => {
        const recentItem = document.createElement("div");
        recentItem.className = "recent-item";
        recentItem.textContent = city;
        
        
        recentItem.addEventListener("click", () => {
            getWeatherData(city);
        });
        
        recentContainer.appendChild(recentItem);
    });
}


function handleSearchInput() {
    const searchTerm = searchInput.value.trim();
    
    // Clear no message
    const existingNoResults = document.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    
    if (!searchTerm) return;
    
   
    if (searchTerm.length > 2 && !isValidCityName(searchTerm)) {
        showNoResultsMessage();
    }
}


function isValidCityName(city) {
    
    return /^[a-zA-Z\s\-']+$/.test(city) && city.length > 1;
}


function showNoResultsMessage() {
   
    
    const existingNoResults = document.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    
    const noResultsMessage = document.createElement('div');
    noResultsMessage.className = 'no-results-message';
    noResultsMessage.textContent = 'No results found';
    
    
    searchInput.parentNode.appendChild(noResultsMessage);
}

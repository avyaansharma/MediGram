// Initialize variables
let map;
let markers = [];
let infoWindow;
let currentLocation = null;
let placesService;
let geocoder;
let mapInitialized = false;
let directionsService;
let directionsRenderer;
let selectedHospital = null;
let currentRoute = null;
let distanceMatrixService;
let routeOptimizer;

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check for authentication and update user name
    try {
        // Check if this is a redirect from OAuth login
        if (window.utils.handleOAuthRedirect()) {
            // If it's an OAuth redirect, the handler will take care of routing
            return;
        }
        
        const user = await window.utils.requireAuth();
        if (user) {
            const userType = window.utils.getUserType();
            
            // Ensure we're on the right dashboard type
            if (userType === 'doctor') {
                window.location.href = 'doctor-dashboard.html';
                return;
            }
            
            // Update user name in profile dropdown
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) {
                userNameEl.textContent = user.user_metadata?.full_name || user.email;
            }
        }
    } catch (error) {
        console.error('Error initializing user authentication:', error);
        window.location.href = 'login.html';
    }
    
    // Set up sidebar navigation
    setupSidebarNavigation();
    
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined') {
        console.error('Google Maps API not loaded!');
        showNotification('Google Maps failed to load. Please check your internet connection and refresh the page.', 'error');
        return;
    }

    // Try to initialize map
    try {
        initMap();
        setupEventListeners();
    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Failed to initialize map: ' + error.message, 'error');
    }
});

// Setup sidebar navigation
function setupSidebarNavigation() {
    // Check if navigation module is available
    if (window.navigation && typeof window.navigation.setActiveMenuItem === 'function') {
        // Set the active menu item using the navigation module
        window.navigation.setActiveMenuItem('find-hospitals');
        
        // Setup user profile dropdown using the navigation module
        window.navigation.setupUserProfileDropdown();
        
        console.log('Using centralized navigation system');
        return; // Navigation is already handled by navigation.js
    }
    
    // Fallback navigation if navigation.js is not loaded properly
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Don't do anything if link is already active
            if (link.classList.contains('active')) return;
            
            // Handle navigation based on link id
            if (link.id === 'ai-assistant') {
                window.location.href = 'dashboard.html';
            } else if (link.id === 'report-analysis') {
                window.location.href = 'report-analysis.html';
            } else if (link.id === 'find-hospitals') {
                // Already on map page, do nothing
                return;
            } else {
                // For other links, show a notification that they're coming soon
                const featureName = link.querySelector('span').textContent;
                showNotification(`${featureName} feature is coming soon!`, 'info');
            }
        });
    });
    
    // Setup user profile dropdown
    setupUserProfileDropdown();
}

// Handle user profile dropdown
function setupUserProfileDropdown() {
    const userProfile = document.querySelector('.user-profile');
    
    if (userProfile) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            userProfile.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                userProfile.classList.remove('active');
            }
        });
        
        // Setup logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.utils && typeof window.utils.logout === 'function') {
                    await window.utils.logout();
                } else {
                    // Fallback to redirect to login page
                    window.location.href = 'login.html';
                }
            });
        }
    }
}

// Initialize Google Maps
function initMap() {
    try {
        console.log('Initializing Google Maps...');
        
        // Check if map container exists
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('Map container not found');
        }

        // Create a new map instance
        map = new google.maps.Map(mapElement, {
            center: { lat: 20.5937, lng: 78.9629 }, // Center of India
            zoom: 5,
            styles: [
                {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{ "visibility": "off" }]
                }
            ]
        });

        // Initialize services
        placesService = new google.maps.places.PlacesService(map);
        if (!placesService) {
            throw new Error('Places service could not be initialized');
        }

        geocoder = new google.maps.Geocoder();
        if (!geocoder) {
            throw new Error('Geocoder could not be initialized');
        }

        // Initialize directions service and renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#8e24aa',
                strokeWeight: 5,
                strokeOpacity: 0.7
            }
        });
        directionsRenderer.setMap(map);

        // Initialize Distance Matrix service for route optimization
        distanceMatrixService = new google.maps.DistanceMatrixService();

        infoWindow = new google.maps.InfoWindow();
        
        console.log('Map initialized successfully');
        mapInitialized = true;

        // Try to get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('Got user location:', currentLocation);
                    map.setCenter(currentLocation);
                    map.setZoom(14);
                    addUserMarker(currentLocation);
                    
                    // Automatically search for hospitals near the user's location
                    reverseGeocode(currentLocation);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    let errorMessage = 'Could not get your location. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Location access was denied. Please enter a location manually.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable. Please enter a location manually.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'The request to get your location timed out. Please enter a location manually.';
                            break;
                        default:
                            errorMessage += 'Please enter a location manually.';
                    }
                    
                    showNotification(errorMessage, 'warning');
                },
                { timeout: 10000, maximumAge: 60000 }
            );
        } else {
            showNotification('Geolocation is not supported by this browser. Please enter a location manually.', 'warning');
        }
    } catch (error) {
        console.error('Error initializing map:', error);
        showNotification('Error initializing map: ' + error.message, 'error');
        mapInitialized = false;
    }
}

// Reverse geocode location to get address
function reverseGeocode(latlng) {
    if (!geocoder) return;
    
    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            console.log('Current location address:', address);
            
            // Set the input field with the current address
            const locationInput = document.getElementById('location-input');
            if (locationInput) {
                locationInput.value = address;
                
                // Auto search for hospitals at this location
                searchHospitals(address);
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    const searchButton = document.getElementById('search-button');
    const locationInput = document.getElementById('location-input');
    const radiusSelect = document.getElementById('radius');
    const hospitalTypeSelect = document.getElementById('hospital-type');
    const showDirectionsCheckbox = document.getElementById('show-directions');
    const travelModeSelect = document.getElementById('travel-mode');
    const closeDirectionsButton = document.getElementById('close-directions');
    const findNearestButton = document.getElementById('find-nearest');
    const toggleDirectionsButton = document.getElementById('toggle-directions');
    const optimizeRouteCheckbox = document.getElementById('optimize-route');

    if (!searchButton || !locationInput || !radiusSelect || !hospitalTypeSelect) {
        console.error('Required elements not found');
        showNotification('Error: Required elements not found', 'error');
        return;
    }

    console.log('Setting up event listeners...');

    searchButton.addEventListener('click', () => {
        if (!mapInitialized) {
            showNotification('Map is not fully initialized yet. Please wait a moment and try again.', 'warning');
            return;
        }
        
        const location = locationInput.value.trim();
        if (location) {
            searchHospitals(location);
        } else {
            showNotification('Please enter a location', 'error');
        }
    });

    // Allow search on Enter key
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });

    // Update search when filters change
    [radiusSelect, hospitalTypeSelect].forEach(select => {
        select.addEventListener('change', () => {
            const location = locationInput.value.trim();
            if (location) {
                searchHospitals(location);
            }
        });
    });

    // Handle directions checkbox
    if (showDirectionsCheckbox) {
        showDirectionsCheckbox.addEventListener('change', () => {
            if (selectedHospital) {
                if (showDirectionsCheckbox.checked) {
                    calculateAndDisplayRoute();
                    activateDirectionsMode(true);
                } else {
                    clearDirections();
                    activateDirectionsMode(false);
                }
            } else if (showDirectionsCheckbox.checked) {
                showNotification('Please select a hospital first', 'warning');
                showDirectionsCheckbox.checked = false;
            }
        });
    }

    // Handle travel mode changes
    if (travelModeSelect) {
        travelModeSelect.addEventListener('change', () => {
            if (showDirectionsCheckbox && showDirectionsCheckbox.checked && selectedHospital) {
                calculateAndDisplayRoute();
            }
        });
    }

    // Close directions panel
    if (closeDirectionsButton) {
        closeDirectionsButton.addEventListener('click', () => {
            closeDirectionsPanel();
            if (showDirectionsCheckbox) {
                showDirectionsCheckbox.checked = false;
            }
            activateDirectionsMode(false);
        });
    }

    // Find nearest hospital button
    if (findNearestButton) {
        findNearestButton.addEventListener('click', () => {
            if (!currentLocation) {
                showNotification('Your current location is needed to find the nearest hospital', 'warning');
                return;
            }
            findNearestHospital();
        });
    }
    
    // Toggle directions button (floating action button)
    if (toggleDirectionsButton) {
        toggleDirectionsButton.addEventListener('click', () => {
            const directionsPanel = document.querySelector('.directions-panel');
            if (directionsPanel) {
                const isActive = directionsPanel.classList.contains('active');
                if (isActive) {
                    directionsPanel.classList.remove('active');
                } else if (currentRoute) {
                    directionsPanel.classList.add('active');
                } else {
                    showNotification('Please select a hospital and enable directions first', 'info');
                }
            }
        });
    }

    // Update route when optimize option changes
    if (optimizeRouteCheckbox) {
        optimizeRouteCheckbox.addEventListener('change', () => {
            if (selectedHospital && showDirectionsCheckbox && showDirectionsCheckbox.checked) {
                calculateAndDisplayRoute();
            }
        });
    }
    
    console.log('Event listeners set up successfully');
}

// Activate/deactivate directions mode to optimize UI
function activateDirectionsMode(activate) {
    // Get elements that need to be modified
    const searchContainer = document.querySelector('.search-container');
    const mapElement = document.getElementById('map');
    const hospitalList = document.querySelector('.hospital-list');
    
    if (activate) {
        // Optimize UI for directions viewing
        searchContainer?.classList.add('directions-active');
        mapElement?.classList.add('directions-active');
        hospitalList?.classList.add('directions-active');
    } else {
        // Restore normal UI
        searchContainer?.classList.remove('directions-active');
        mapElement?.classList.remove('directions-active');
        hospitalList?.classList.remove('directions-active');
    }
}

// Close directions panel and clear route
function closeDirectionsPanel() {
    const directionsPanel = document.querySelector('.directions-panel');
    if (directionsPanel) {
        directionsPanel.classList.remove('active');
    }
    
    const routeInfo = document.querySelector('.route-info');
    if (routeInfo) {
        routeInfo.classList.remove('active');
    }
    
    clearDirections();
}

// Find the nearest hospital using Distance Matrix and Directions API
function findNearestHospital() {
    if (!currentLocation || markers.length === 0) {
        showNotification('No hospitals found or current location unknown', 'warning');
        return;
    }

    showLoading(true);
    
    // Collect all hospital locations
    const destinations = markers.map(marker => marker.getPosition());
    
    // Get the selected travel mode
    const travelMode = document.getElementById('travel-mode').value;
    
    // Use Distance Matrix to find the nearest hospital
    const request = {
        origins: [new google.maps.LatLng(currentLocation)],
        destinations: destinations,
        travelMode: google.maps.TravelMode[travelMode],
        unitSystem: google.maps.UnitSystem.METRIC
    };

    distanceMatrixService.getDistanceMatrix(request, (response, status) => {
        if (status !== 'OK') {
            showLoading(false);
            showNotification('Error calculating distances: ' + status, 'error');
            return;
        }

        try {
            // Get the distances from the response
            const distances = response.rows[0].elements;
            
            // Find the closest hospital
            let shortestTime = Number.MAX_VALUE;
            let nearestIndex = -1;

            distances.forEach((element, index) => {
                if (element.status === 'OK') {
                    const durationValue = element.duration.value; // duration in seconds
                    if (durationValue < shortestTime) {
                        shortestTime = durationValue;
                        nearestIndex = index;
                    }
                }
            });

            if (nearestIndex === -1) {
                showLoading(false);
                showNotification('Could not determine the nearest hospital', 'error');
                return;
            }

            // Set the nearest hospital as selected
            const nearestMarker = markers[nearestIndex];
            google.maps.event.trigger(nearestMarker, 'click');
            
            // Automatically show directions
            const showDirectionsCheckbox = document.getElementById('show-directions');
            if (showDirectionsCheckbox) {
                showDirectionsCheckbox.checked = true;
                // Calculate route will be triggered after marker click sets the selectedHospital
            }

            // Show a notification with the result
            const nearestDuration = distances[nearestIndex].duration.text;
            const nearestDistance = distances[nearestIndex].distance.text;
            showNotification(`Nearest hospital found: ${nearestDistance} away (${nearestDuration} travel time)`, 'success');
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            console.error('Error processing distance matrix:', error);
            showNotification('Error finding nearest hospital: ' + error.message, 'error');
        }
    });
}

// Calculate and display optimized route to selected hospital
function calculateAndDisplayRoute() {
    if (!selectedHospital || !currentLocation) {
        showNotification('Cannot calculate route. Please ensure your location and a hospital are selected.', 'warning');
        return;
    }

    const travelMode = document.getElementById('travel-mode').value;
    
    // Show loading state
    showLoading(true);
    
    // Check for route optimization preference
    const optimizeRoute = document.getElementById('optimize-route') ? 
                          document.getElementById('optimize-route').checked : true;
    
    // Get departure time (now for real-time traffic)
    const departureTime = new Date();
    
    // Create request with advanced options
    const request = {
        origin: currentLocation,
        destination: {
            lat: selectedHospital.geometry.location.lat(),
            lng: selectedHospital.geometry.location.lng()
        },
        travelMode: google.maps.TravelMode[travelMode],
        provideRouteAlternatives: true,             // Request alternative routes
        optimizeWaypoints: true,                    // Optimize if waypoints are added
        drivingOptions: {
            departureTime: departureTime,           // Use current time for traffic
            trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        avoidHighways: false,                       // Can be toggled via UI in future
        avoidTolls: false,                          // Can be toggled via UI in future
        unitSystem: google.maps.UnitSystem.METRIC   // Use metric
    };

    // Use Directions Service with better error handling
    try {
        directionsService.route(request, (result, status) => {
            showLoading(false);
            
            if (status === google.maps.DirectionsStatus.OK) {
                // Apply custom styling to the route
                const routeOptions = {
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: '#8e24aa',         // Primary color
                        strokeWeight: 6,                // Thicker line
                        strokeOpacity: 0.8,             // Slightly transparent
                        className: 'google-route-path'  // Custom class for further styling
                    }
                };
                
                directionsRenderer.setOptions(routeOptions);
                
                // If multiple routes available and optimization requested, find the best route
                if (optimizeRoute && result.routes.length > 1) {
                    // Try to find the fastest route considering distance and traffic
                    let bestRoute = result.routes[0];
                    let bestScore = Number.MAX_VALUE;
                    
                    result.routes.forEach((route) => {
                        if (route.legs && route.legs[0]) {
                            const duration = route.legs[0].duration.value; // seconds
                            const distance = route.legs[0].distance.value; // meters
                            const durationInTraffic = route.legs[0].duration_in_traffic ? 
                                                      route.legs[0].duration_in_traffic.value : duration;
                            
                            // Calculate score (weighted combination of factors - lower is better)
                            // We prioritize duration in traffic, but also consider total distance
                            const score = (durationInTraffic * 0.8) + (distance * 0.2 / 100);
                            
                            if (score < bestScore) {
                                bestScore = score;
                                bestRoute = route;
                            }
                        }
                    });
                    
                    // Set the optimized result
                    const optimizedResult = {
                        ...result,
                        routes: [bestRoute]
                    };
                    
                    // Display the route on the map
                    directionsRenderer.setDirections(optimizedResult);
                    currentRoute = optimizedResult;
                    
                    // Show route info
                    displayRouteInfo(optimizedResult, travelMode);
                    
                    // Display detailed directions
                    displayDirectionsPanel(optimizedResult);
                    
                    // Activate directions mode in the UI
                    activateDirectionsMode(true);
                    
                    showNotification('Showing optimized route to hospital', 'success');
                } else {
                    // Display the standard route
                    directionsRenderer.setDirections(result);
                    currentRoute = result;
                    
                    // Show route info
                    displayRouteInfo(result, travelMode);
                    
                    // Display detailed directions
                    displayDirectionsPanel(result);
                    
                    // Activate directions mode in the UI
                    activateDirectionsMode(true);
                }
            } else {
                console.error('Directions request failed:', status);
                
                // Show a more helpful error message based on the error type
                let errorMessage = 'Could not calculate directions';
                
                switch(status) {
                    case google.maps.DirectionsStatus.NOT_FOUND:
                        errorMessage = 'One of the locations could not be found';
                        break;
                    case google.maps.DirectionsStatus.ZERO_RESULTS:
                        errorMessage = 'No route could be found between these locations';
                        break;
                    case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
                        errorMessage = 'Too many waypoints were provided';
                        break;
                    case google.maps.DirectionsStatus.INVALID_REQUEST:
                        errorMessage = 'The request was invalid';
                        break;
                    case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
                        errorMessage = 'The website has gone over its request quota';
                        break;
                    case google.maps.DirectionsStatus.REQUEST_DENIED:
                        errorMessage = 'The webpage is not allowed to use the directions service';
                        break;
                    case google.maps.DirectionsStatus.UNKNOWN_ERROR:
                        errorMessage = 'A directions request could not be processed due to a server error';
                        break;
                }
                
                showNotification(`${errorMessage}. Please try again later.`, 'error');
                clearDirections();
                activateDirectionsMode(false);
            }
        });
    } catch (error) {
        showLoading(false);
        console.error('Error calculating route:', error);
        showNotification('Error calculating route: ' + error.message, 'error');
        clearDirections();
        activateDirectionsMode(false);
    }
}

// Display route information with enhanced details
function displayRouteInfo(route, travelMode) {
    if (!route || !route.routes || !route.routes[0]) return;

    const routeInfo = document.querySelector('.route-info');
    if (!routeInfo) return;

    const leg = route.routes[0].legs[0];
    
    // Show duration in traffic if available
    let durationText = leg.duration.text;
    if (leg.duration_in_traffic) {
        durationText = `${leg.duration_in_traffic.text} (in current traffic)`;
    }
    
    routeInfo.querySelector('.distance').textContent = leg.distance.text;
    routeInfo.querySelector('.duration').textContent = durationText;
    
    // Use appropriate icons based on travel mode
    let modeIcon;
    switch (travelMode) {
        case 'DRIVING':
            modeIcon = 'car';
            break;
        case 'WALKING':
            modeIcon = 'walking';
            break;
        case 'TRANSIT':
            modeIcon = 'bus';
            break;
        case 'BICYCLING':
            modeIcon = 'bicycle';
            break;
        default:
            modeIcon = 'route';
    }
    
    // Get the user-friendly mode name
    const modeName = document.getElementById('travel-mode').options[document.getElementById('travel-mode').selectedIndex].text;
    
    routeInfo.querySelector('.mode').innerHTML = `<i class="fas fa-${modeIcon}"></i> ${modeName}`;
    routeInfo.classList.add('active');
    
    // Auto-open the directions panel
    const directionsPanel = document.querySelector('.directions-panel');
    if (directionsPanel) {
        directionsPanel.classList.add('active');
    }
}

// Display directions panel with enhanced turn-by-turn directions
function displayDirectionsPanel(route) {
    if (!route || !route.routes || !route.routes[0]) return;

    const directionsPanel = document.querySelector('.directions-panel');
    const directionsContent = document.getElementById('directions-content');
    if (!directionsPanel || !directionsContent) return;

    const leg = route.routes[0].legs[0];
    
    // Add start/end address info
    let html = `
        <div class="directions-overview">
            <div class="directions-endpoint">
                <i class="fas fa-dot-circle"></i> <strong>Start:</strong> ${leg.start_address}
            </div>
            <div class="directions-endpoint">
                <i class="fas fa-map-marker-alt"></i> <strong>End:</strong> ${leg.end_address}
            </div>
        </div>
    `;
    
    html += '<div class="directions-steps">';
    
    // Add each step with enhanced formatting and icons
    leg.steps.forEach((step, index) => {
        // Determine icon based on step instructions
        let stepIcon = 'arrow-right';
        
        if (step.maneuver) {
            if (step.maneuver.includes('turn-right')) stepIcon = 'arrow-right';
            else if (step.maneuver.includes('turn-left')) stepIcon = 'arrow-left';
            else if (step.maneuver.includes('uturn')) stepIcon = 'arrow-circle-left';
            else if (step.maneuver.includes('roundabout')) stepIcon = 'sync';
            else if (step.maneuver.includes('straight')) stepIcon = 'arrow-up';
            else if (step.maneuver.includes('merge')) stepIcon = 'compress-alt';
            else if (step.maneuver.includes('exit')) stepIcon = 'sign-out-alt';
        }
        
        // Process step instructions (remove html, add accessibility)
        const cleanInstructions = step.instructions
            .replace(/<(?:.|\n)*?>/gm, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ');      // Replace &nbsp; with spaces
        
        html += `
            <div class="directions-step">
                <div class="step-icon"><i class="fas fa-${stepIcon}"></i></div>
                <div class="step-content">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-instructions">${cleanInstructions}</div>
                    <div class="step-distance">${step.distance.text}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add summary with traffic information if available
    html += `
        <div class="directions-summary">
            <div class="summary-item">
                <i class="fas fa-road"></i>
                <div>
                    <strong>Total Distance:</strong>
                    <span>${leg.distance.text}</span>
                </div>
            </div>
            <div class="summary-item">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>Estimated Time:</strong>
                    <span>${leg.duration.text}</span>
                </div>
            </div>
    `;
    
    // Add traffic info if available
    if (leg.duration_in_traffic) {
        html += `
            <div class="summary-item">
                <i class="fas fa-traffic-light"></i>
                <div>
                    <strong>Time in Traffic:</strong>
                    <span>${leg.duration_in_traffic.text}</span>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Add arrival time
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + leg.duration.value * 1000);
    const arrivalTimeString = arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    html += `
        <div class="arrival-time">
            <i class="fas fa-flag-checkered"></i> Estimated arrival: <strong>${arrivalTimeString}</strong>
        </div>
    `;
    
    directionsContent.innerHTML = html;
    directionsPanel.classList.add('active');
}

// Clear directions
function clearDirections() {
    if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
    }
    
    currentRoute = null;
    
    const routeInfo = document.querySelector('.route-info');
    if (routeInfo) {
        routeInfo.classList.remove('active');
    }
}

// Add user's current location marker
function addUserMarker(location) {
    const userMarker = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
        }
    });
}

// Search for hospitals
async function searchHospitals(location) {
    try {
        showLoading(true);
        clearMarkers();
        clearDirections();

        console.log('Searching for hospitals near:', location);

        // Geocode the location
        const geocodeResult = await geocodeLocation(location);
        if (!geocodeResult) {
            showNotification('Could not find the location', 'error');
            showLoading(false);
            return;
        }

        // Update map center
        const searchLocation = geocodeResult.geometry.location;
        map.setCenter(searchLocation);
        map.setZoom(14);

        // Add marker for the searched location
        new google.maps.Marker({
            position: searchLocation,
            map: map,
            title: 'Searched Location',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#FF4081',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2
            }
        });

        // Search for hospitals
        const radius = parseInt(document.getElementById('radius').value) * 1000; // Convert km to meters
        const type = document.getElementById('hospital-type').value;
        
        console.log('Search radius:', radius, 'meters');
        console.log('Hospital type:', type);

        const request = {
            location: searchLocation,
            radius: radius,
            type: 'hospital', // Always search for hospitals
            keyword: type === 'all' ? '' : type // Add keyword only if specific type selected
        };

        console.log('Search request:', request);

        // Use nearbySearch to find hospitals
        placesService.nearbySearch(request, (results, status) => {
            console.log('Places API status:', status);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log(`Found ${results.length} hospitals:`, results);
                displayHospitals(results);
                showNotification(`Found ${results.length} hospitals near ${location}`, 'success');
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                showNotification('No hospitals found in this area. Try increasing the search radius.', 'warning');
                console.log('No results found');
            } else {
                console.error('Places API Error:', status);
                showNotification(`Error searching hospitals: ${status}`, 'error');
            }
            showLoading(false);
        });
    } catch (error) {
        console.error('Error searching hospitals:', error);
        showNotification('Error searching hospitals: ' + error.message, 'error');
        showLoading(false);
    }
}

// Geocode location
function geocodeLocation(address) {
    return new Promise((resolve, reject) => {
        if (!geocoder) {
            reject(new Error('Geocoder not initialized'));
            return;
        }

        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                resolve(results[0]);
            } else {
                console.error('Geocoding failed:', status);
                reject(new Error('Could not find the location'));
            }
        });
    });
}

// Display hospitals on map and list
function displayHospitals(hospitals) {
    const hospitalResults = document.getElementById('hospital-results');
    if (!hospitalResults) {
        console.error('Hospital results container not found');
        return;
    }

    hospitalResults.innerHTML = '';
    
    if (hospitals.length === 0) {
        hospitalResults.innerHTML = '<p class="no-results">No hospitals found in this area. Try adjusting your search.</p>';
        return;
    }

    // Reset selected hospital
    selectedHospital = null;
    
    // Sort hospitals by distance if we have user location
    if (currentLocation) {
        hospitals.sort((a, b) => {
            const distanceA = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(currentLocation),
                a.geometry.location
            );
            const distanceB = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(currentLocation),
                b.geometry.location
            );
            return distanceA - distanceB;
        });
    }

    hospitals.forEach(hospital => {
        try {
            // Add marker
            const marker = new google.maps.Marker({
                position: hospital.geometry.location,
                map: map,
                title: hospital.name,
                animation: google.maps.Animation.DROP
            });

            markers.push(marker);

            // Calculate distance if we have user location
            let distanceText = '';
            if (currentLocation) {
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(currentLocation),
                    hospital.geometry.location
                );
                const distanceKm = (distance / 1000).toFixed(1);
                distanceText = `<p class="distance">${distanceKm} km away</p>`;
            }

            // Create status/open now indicator
            let openNowText = '';
            if (hospital.opening_hours) {
                openNowText = hospital.opening_hours.open_now ? 
                    '<span class="open-now">Open Now</span>' : 
                    '<span class="closed-now">Closed</span>';
            }

            // Create get directions button
            const directionsButton = `
                <button class="get-directions-btn" data-hospital-id="${hospital.place_id}">
                    <i class="fas fa-directions"></i> Get Directions
                </button>
            `;

            // Create info window content
            const content = `
                <div class="info-window-content">
                    <h4>${hospital.name}</h4>
                    <p>${hospital.vicinity}</p>
                    ${hospital.rating ? `<p class="rating">Rating: ${hospital.rating} ⭐ (${hospital.user_ratings_total || 0} reviews)</p>` : ''}
                    ${distanceText}
                    ${openNowText}
                    ${hospital.photos ? `<img src="${hospital.photos[0].getUrl({maxWidth: 200, maxHeight: 150})}" alt="${hospital.name}" class="hospital-photo">` : ''}
                    ${directionsButton}
                </div>
            `;

            // Add click listener to marker
            marker.addListener('click', () => {
                // Close any open info windows
                if (infoWindow) {
                    infoWindow.close();
                }
                
                // Set content and open
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
                
                // Animate marker when clicked
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                    marker.setAnimation(null);
                }, 750);
                
                // Set selected hospital
                selectedHospital = hospital;
                
                // Update UI
                updateSelectedHospitalUI(hospital);
                
                // Setup directions button in info window
                setTimeout(() => {
                    const directionsBtn = document.querySelector('.get-directions-btn');
                    if (directionsBtn) {
                        directionsBtn.addEventListener('click', () => {
                            // Enable directions checkbox
                            const showDirectionsCheckbox = document.getElementById('show-directions');
                            if (showDirectionsCheckbox) {
                                showDirectionsCheckbox.checked = true;
                                calculateAndDisplayRoute();
                            }
                        });
                    }
                }, 100);
            });

            // Create hospital card
            const card = document.createElement('div');
            card.className = 'hospital-card';
            card.innerHTML = `
                <h4>${hospital.name}</h4>
                <p>${hospital.vicinity}</p>
                ${hospital.rating ? `<p class="rating">Rating: ${hospital.rating} ⭐</p>` : ''}
                ${distanceText}
                ${openNowText}
                <button class="directions-btn">
                    <i class="fas fa-directions"></i> Directions
                </button>
            `;

            // Add click listener to card
            card.addEventListener('click', () => {
                // Pan to the hospital
                map.panTo(hospital.geometry.location);
                map.setZoom(16);
                
                // Open info window
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
                
                // Highlight the card
                document.querySelectorAll('.hospital-card').forEach(card => {
                    card.classList.remove('active');
                });
                card.classList.add('active');
                
                // Animate marker
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                    marker.setAnimation(null);
                }, 750);
                
                // Set selected hospital
                selectedHospital = hospital;
                
                // Update UI
                updateSelectedHospitalUI(hospital);
                
                // Setup directions button in info window
                setTimeout(() => {
                    const directionsBtn = document.querySelector('.get-directions-btn');
                    if (directionsBtn) {
                        directionsBtn.addEventListener('click', () => {
                            // Enable directions checkbox
                            const showDirectionsCheckbox = document.getElementById('show-directions');
                            if (showDirectionsCheckbox) {
                                showDirectionsCheckbox.checked = true;
                                calculateAndDisplayRoute();
                            }
                        });
                    }
                }, 100);
            });
            
            // Add click listener to directions button in card
            const directionsBtn = card.querySelector('.directions-btn');
            if (directionsBtn) {
                directionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click event
                    
                    // Set selected hospital
                    selectedHospital = hospital;
                    
                    // Update UI
                    updateSelectedHospitalUI(hospital);
                    
                    // Enable directions
                    const showDirectionsCheckbox = document.getElementById('show-directions');
                    if (showDirectionsCheckbox) {
                        showDirectionsCheckbox.checked = true;
                        calculateAndDisplayRoute();
                    }
                });
            }

            hospitalResults.appendChild(card);
        } catch (error) {
            console.error('Error displaying hospital:', error);
        }
    });
}

// Update UI for selected hospital
function updateSelectedHospitalUI(hospital) {
    // Highlight the selected hospital card
    document.querySelectorAll('.hospital-card').forEach(card => {
        if (card.querySelector('h4').textContent === hospital.name) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    // If directions are enabled, calculate route
    const showDirectionsCheckbox = document.getElementById('show-directions');
    if (showDirectionsCheckbox && showDirectionsCheckbox.checked) {
        calculateAndDisplayRoute();
    }
}

// Clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 
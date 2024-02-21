window.onload = function() {
    const storedCSVData = localStorage.getItem('csvData');
    if (storedCSVData) {
        parseCSV(storedCSVData, 0);
    }
}




// Function to parse CSV data
async function parseCSV(csvData, startCityIndex) {
    try {
        var lines = csvData.split('\n');
        var coordinates = [];

        // Extract latitude and longitude from the specified row (starting point)
        var firstLine = lines[startCityIndex].trim();
        var firstPoint = firstLine.split(',');
        var startLatitude = parseFloat(firstPoint[0]); // Latitude from the first column
        var startLongitude = parseFloat(firstPoint[1]); // Longitude from the second column

        if (isNaN(startLatitude) || isNaN(startLongitude)) {
            console.error("Invalid starting point format:", firstLine);
            return;
        }

        // Push the starting point coordinates
        coordinates.push({ lat: startLatitude, lng: startLongitude, name: "Starting Point" });

        // Start the loop from index 1 to ignore the first row
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();

            if (line !== '') {
                var parts = line.split(',');

                if (parts.length < 2) {
                    console.error("Invalid CSV format:", line);
                    continue;
                }
                var latitude = parseFloat(parts[0]); // Latitude from column 1
                var longitude = parseFloat(parts[1]); // Longitude from column 2

                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error("Invalid latitude or longitude:", line);
                    continue;
                }
                var locationName = await getLocationName(latitude, longitude);
                coordinates.push({ lat: latitude, lng: longitude, name: locationName });
            }
        }

        // Once coordinates are extracted, continue with route optimization
        calculateAndOptimizeRoute(coordinates);
    } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV. Please contact the developer');
    }
}
  
function showLoadingSpinner() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'block';
}
  
async function optimizeRoute() {
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];
    if (!file) {
        alert("Please select a file. File must be CSV");
        return;
    }
    var reader = new FileReader();
  
    reader.onload = function (event) {
        showLoadingSpinner();
        var csvData = event.target.result;
        try {
            localStorage.setItem('csvData', csvData); // Store CSV data in local storage
            parseCSV(csvData, 0); // Pass 0 as the starting city index
        } catch (error) {
            hideLoadingSpinner();
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV. Please check the console for details.');
        }
    };
  
    reader.onerror = function (event) {
        alert("Error reading the csv file.");
        console.error('FileReader error:', event.target.error);
    };
  
    reader.readAsText(file);
}
  
  
async function getLocationName(latitude, longitude) {
    try {
        var apiKey = 'ab74cccccb994cc49a70f85fcc54b79d';
        var apiUrl = `https://api.opencagedata.com/geocode/v1/json?key=${apiKey}&q=${latitude}+${longitude}&pretty=1`;
  
        var response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        var data = await response.json();
        var locationName = data.results[0]?.formatted || 'Failed To Fetch The Location Name, Contact Developer!';
  
        return locationName;
    } catch (error) {
        console.error('Error fetching location name:', error);
        return 'Failed To Fetch The Location Name, Contact Developer!';
    }
}
  
function optimizeRouteWithACO(coordinates, distanceMatrix) {
    const numCities = coordinates.length;
    const numAnts = 10;
    const maxIterations = 100;
    const evaporationRate = 0.5;
    const alpha = 1;
    const beta = 2;
    const initialPheromone = 1;
  
    let pheromoneMatrix = initializePheromones(numCities, initialPheromone);
  
    let bestRoute;
    let bestDistance = Infinity;
  
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const ants = initializeAnts(numAnts, numCities);
  
        for (let ant = 0; ant < numAnts; ant++) {
            ants[ant].path = constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, 0); // Pass 0 as the starting city index
            ants[ant].distance = calculateRouteDistance(ants[ant].path, distanceMatrix);
  
            if (ants[ant].distance < bestDistance) {
                bestDistance = ants[ant].distance;
                bestRoute = ants[ant].path.slice();
            }
        }
  
        updatePheromones(pheromoneMatrix, ants, evaporationRate, distanceMatrix);
    }
  
    hideLoadingSpinner();
  
    displayOptimizedRoute(bestRoute, coordinates);
  
    addMarkersToMap(coordinates, bestRoute);
  }
  
  function calculateAndOptimizeRoute(coordinates) {
    var distanceMatrix = calculateDistanceMatrix(coordinates);
    optimizeRouteWithACO(coordinates, distanceMatrix);
  }
  
  function initializeAnts(numAnts, numCities) {
    const ants = new Array(numAnts).fill(null).map(() => ({
        path: [],
        distance: 0,
        visited: new Array(numCities).fill(false)
    }));
    return ants;
  }
  
  function initializePheromones(numCities, initialValue) {
    const pheromoneMatrix = new Array(numCities).fill(null).map(() => new Array(numCities).fill(initialValue));
    return pheromoneMatrix;
  }
  
  function constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, startCityIndex) {
    const numCities = coordinates.length;
    const visited = new Array(numCities).fill(false);
    const route = [];
    const startCity = startCityIndex;
    let currentCity = startCity;
    visited[currentCity] = true;
    route.push(currentCity);
  
    for (let i = 1; i < numCities; i++) {
        const probabilities = calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta);
        const nextCity = selectNextCity(probabilities);
        visited[nextCity] = true;
        route.push(nextCity);
        currentCity = nextCity;
    }
  
    return route;
  }
  
  function calculateRouteDistance(route, distanceMatrix) {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        distance += distanceMatrix[from][to];
    }
    // Add the distance from the last city back to the starting city
    const lastCity = route[route.length - 1];
    const startingCity = route[0];
    distance += distanceMatrix[lastCity][startingCity];
    return distance;
  }
  
  function updatePheromones(pheromoneMatrix, ants, evaporationRate, distanceMatrix) {
    const numCities = pheromoneMatrix.length;
  
    // Evaporate pheromones
    for (let i = 0; i < numCities; i++) {
        for (let j = 0; j < numCities; j++) {
            pheromoneMatrix[i][j] *= (1 - evaporationRate);
        }
    }
  
    // Update pheromones based on ant routes
    for (let k = 0; k < ants.length; k++) {
        const route = ants[k].path;
        const routeLength = calculateRouteDistance(route, distanceMatrix);
        const pheromoneToAdd = 1 / routeLength;
        for (let m = 0; m < route.length - 1; m++) {
            const cityA = route[m];
            const cityB = route[m + 1];
            pheromoneMatrix[cityA][cityB] += pheromoneToAdd;
            pheromoneMatrix[cityB][cityA] += pheromoneToAdd; // Assuming symmetric pheromone updating
        }
    }
  }
  
  function calculateDistanceMatrix(coordinates) {
    const numCities = coordinates.length;
    const distanceMatrix = new Array(numCities).fill(null).map(() => new Array(numCities));
  
    for (let i = 0; i < numCities; i++) {
        for (let j = 0; j < numCities; j++) {
            distanceMatrix[i][j] = calculateDistance(coordinates[i], coordinates[j]);
        }
    }
  
    return distanceMatrix;
  }
  
  function hideLoadingSpinner() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'none';
  }
  
  function calculateDistance(coord1, coord2) {
    const dx = coord1.lat - coord2.lat;
    const dy = coord1.lng - coord2.lng;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta) {
    try {
        const numCities = coordinates.length;
        const probabilities = [];
        let total = 0;
  
        for (let i = 0; i < numCities; i++) {
            if (!visited[i]) {
                const pheromone = pheromoneMatrix[currentCity][i];
                const distance = calculateDistance(coordinates[currentCity], coordinates[i]);
                const probability = Math.pow(pheromone, alpha) * Math.pow(1 / distance, beta);
                probabilities.push({ city: i, probability: probability });
                total += probability;
            } else {
                probabilities.push({ city: i, probability: 0 });
            }
        }
  
        for (let j = 0; j < numCities; j++) {
            probabilities[j].probability /= total;
        }
  
        return probabilities;
    } catch (error) {
        throw new Error('Error calculating probabilities: ' + error.message);
    }
  }
  
  function selectNextCity(probabilities) {
    try {
        const randomNumber = Math.random();
        let cumulativeProbability = 0;
  
        for (let i = 0; i < probabilities.length; i++) {
            cumulativeProbability += probabilities[i].probability;
            if (randomNumber <= cumulativeProbability) {
                return probabilities[i].city;
            }
        }
  
        // If no city is selected, return the last city
        return probabilities[probabilities.length - 1].city;
    } catch (error) {
        throw new Error('Error selecting next city: ' + error.message);
    }
  }
  
  function displayOptimizedRoute(route, coordinates) {
    let optimizedRoutesHTML = "<h2>Optimized Route</h2><table id='optimizedRouteTable'><tr><th>Index</th><th>Latitude</th><th>Longitude</th><th>Location Name</th></tr>";
  
    for (let j = 0; j < route.length; j++) {
        const index = route[j];
        optimizedRoutesHTML += `<tr><td>${j + 1}</td><td>${coordinates[index].lat}</td><td>${coordinates[index].lng}</td><td>${coordinates[index].name}</td></tr>`;
    }
  
    optimizedRoutesHTML += "</table>";
  
    const optimizedRoutesDiv = document.getElementById('optimizedRoutes');
    optimizedRoutesDiv.innerHTML = optimizedRoutesHTML;
    optimizedRoutesDiv.classList.remove('hidden');
  }
  
  function addMarkersToMap(coordinates, route) {
    var map = L.map('map').setView([coordinates[0].lat, coordinates[0].lng], 10);
  
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  
    var routeLatLng = [];
  
    for (var i = 0; i < route.length; i++) {
        var index = route[i];
        var latLng = L.latLng(coordinates[index].lat, coordinates[index].lng);
  
        var markerIcon = L.divIcon({
            className: 'custom-marker-icon',
            html: (i + 1).toString(),
            iconSize: [25, 25],
            iconAnchor: [-2, 12]
        });
  
        var marker = L.marker(latLng, {
            icon: markerIcon
        }).addTo(map);
  
        routeLatLng.push(latLng);
    }
  
    // Add custom CSS to hide or prevent interaction with the marker icon
    var customCss = document.createElement('style');
    customCss.innerHTML = '.leaflet-marker-icon { display: none; pointer-events: none; }';
    document.head.appendChild(customCss);
  
    L.Routing.control({
        waypoints: routeLatLng,
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#006cbf', opacity: 1, weight: 5 }]
        }
    }).addTo(map);
  }
  

window.onload = function() {
    const storedCSVData = localStorage.getItem('csvData');
    if (storedCSVData) {
        parseCSV(storedCSVData, 0);
    }
}


// Function to display the list of points with checkboxes
function displayPointList(coordinates) {
    const pointListDiv = document.getElementById('pointList');
    let listHTML = '<h3>Select Prioritized Points</h3>';

    for (let i = 0; i < coordinates.length; i++) {
        listHTML += `<input type="checkbox" id="point${i}" name="point${i}">
                     <label for="point${i}">${coordinates[i].name}</label><br>`;
    }

    pointListDiv.innerHTML = listHTML;
}

function getPrioritizedPoints(coordinates) {
    const prioritizedPoints = [];
    const numPoints = coordinates.length;

    for (let i = 0; i < numPoints; i++) {
        const checkbox = document.getElementById(`point${i}`);
        if (checkbox && checkbox.checked) {
            prioritizedPoints.push(i);
        }
    }

    return prioritizedPoints;
}


async function parseCSV(csvData, startCityIndex) {
    try {
        var lines = csvData.split('\n');
        var coordinates = [];
        var prioritizedPoints = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            if (line !== '') {
                var parts = line.split(',');

                if (parts.length < 4) {
                    console.error("Invalid CSV format:", line);
                    continue;
                }
                var latitude = parseFloat(parts[0]); // Latitude from column 1
                var longitude = parseFloat(parts[1]); // Longitude from column 2
                var locationName = parts[2]; // Location name from column 3
                var isPriority = parts[3].toLowerCase() === 'yes'; // Priority from column 4

                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error("Invalid latitude or longitude:", line);
                    continue;
                }

                coordinates.push({ lat: latitude, lng: longitude, name: locationName, priority: isPriority });

                if (isPriority) {
                    prioritizedPoints.push(coordinates.length - 1); // Index of the prioritized point
                }
            }
        }

        if (coordinates.length === 0) {
            console.error("No valid coordinates found in the CSV data.");
            return;
        }

        // Once coordinates are extracted, continue with route optimization
        calculateAndOptimizeRoute(coordinates, prioritizedPoints);
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

async function optimizeRouteWithACO(coordinates, distanceMatrix, prioritizedPoints) {
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
            ants[ant].path = constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, 0, prioritizedPoints);
            ants[ant].distance = calculateRouteDistance(ants[ant].path, distanceMatrix);

            if (ants[ant].distance < bestDistance) {
                bestDistance = ants[ant].distance;
                bestRoute = ants[ant].path.slice();
            }
        }

        updatePheromones(pheromoneMatrix, ants, evaporationRate, distanceMatrix, prioritizedPoints);
    }

    hideLoadingSpinner();

    displayOptimizedRoute(bestRoute, coordinates);

    addMarkersToMap(coordinates, bestRoute, prioritizedPoints);
}



function constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, startCityIndex, prioritizedPoints) {
    const numCities = coordinates.length;
    const visited = new Array(numCities).fill(false);
    const route = [];
    let currentCity = startCityIndex;

    // Add prioritized points to the route first
    prioritizedPoints.forEach(point => {
        if (!visited[point]) {
            route.push(point);
            visited[point] = true;
        }
    });

    // Continue adding non-prioritized points to the route
    while (route.length < numCities) {
        const probabilities = calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta, prioritizedPoints);
        const nextCity = selectNextCity(probabilities);
        visited[nextCity] = true;
        route.push(nextCity);
        currentCity = nextCity;
    }

    return route;
}


async function optimizeRouteWithPriorities(coordinates) {
    const distanceMatrix = calculateDistanceMatrix(coordinates);
    const prioritizedPoints = extractPrioritizedPoints(coordinates);

    // Calculate the distances between the starting point and priority locations
    const startDistances = [];
    for (const point of prioritizedPoints) {
        startDistances.push(distanceMatrix[0][point]);
    }

    // Find the nearest priority location to the starting point
    const nearestPriorityIndex = startDistances.indexOf(Math.min(...startDistances));

    // Create a route with the starting point and the nearest priority location
    const initialRoute = [0, ...prioritizedPoints.slice(nearestPriorityIndex, nearestPriorityIndex + 1)];

    // Calculate the distances between the nearest priority location and the remaining priority locations
    const remainingDistances = [];
    for (let i = 1; i < prioritizedPoints.length; i++) {
        if (i !== nearestPriorityIndex) {
            remainingDistances.push(distanceMatrix[prioritizedPoints[nearestPriorityIndex]][prioritizedPoints[i]]);
        }
    }

    // Find the nearest priority location to the nearest priority location
    const nearestRemainingIndex = remainingDistances.indexOf(Math.min(...remainingDistances));

    // Add the nearest priority location to the route
    initialRoute.push(prioritizedPoints[nearestRemainingIndex + 1]);

    // Calculate the distances between the nearest remaining priority location and the standard locations
    const standardDistances = [];
    for (let i = 0; i < coordinates.length; i++) {
        if (!prioritizedPoints.includes(i)) {
            standardDistances.push(distanceMatrix[prioritizedPoints[nearestRemainingIndex + 1]][i]);
        }
    }

    // Find the nearest standard location to the nearest remaining priority location
    const nearestStandardIndex = standardDistances.indexOf(Math.min(...standardDistances));

    // Add the nearest standard location to the route
    initialRoute.push(nearestStandardIndex);

    // Calculate the distances between the nearest standard location and the remaining priority locations
    const finalDistances = [];
    for (let i = 0; i < prioritizedPoints.length; i++) {
        if (!initialRoute.includes(prioritizedPoints[i])) {
            finalDistances.push(distanceMatrix[nearestStandardIndex][prioritizedPoints[i]]);
        }
    }

    // Find the nearest priority location to the nearest standard location
    const nearestFinalIndex = finalDistances.indexOf(Math.min(...finalDistances));

    // Add the remaining priority locations to the route in order
    for (let i = 0; i < prioritizedPoints.length; i++) {
        if (i !== nearestFinalIndex && !initialRoute.includes(prioritizedPoints[i])) {
            initialRoute.push(prioritizedPoints[i]);
        }
    }

    // Add the starting point to the end of the route to close the loop
    initialRoute.push(0);

    optimizeRouteWithACO(coordinates, distanceMatrix, initialRoute);
}








async function calculateAndOptimizeRoute(coordinates) {
    var distanceMatrix = calculateDistanceMatrix(coordinates);
    const prioritizedPoints = extractPrioritizedPoints(coordinates);
    optimizeRouteWithPriorities(coordinates, distanceMatrix, prioritizedPoints);
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

function constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, startCityIndex, prioritizedPoints) {
    const numCities = coordinates.length;
    const visited = new Array(numCities).fill(false);
    const route = [];
    let currentCity = startCityIndex;

    // Add the starting city to the route
    route.push(startCityIndex);
    visited[startCityIndex] = true;

    // Main loop to construct the rest of the route
    while (route.length < numCities) {
        const probabilities = calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta, prioritizedPoints);
        
        // Sort probabilities array to prioritize prioritized points
        probabilities.sort((a, b) => {
            if (prioritizedPoints.includes(a.city) && !prioritizedPoints.includes(b.city)) {
                return -1;
            } else if (!prioritizedPoints.includes(a.city) && prioritizedPoints.includes(b.city)) {
                return 1;
            } else {
                return 0;
            }
        });

        // Select the next city based on probabilities
        const nextCity = selectNextCity(probabilities);
        route.push(nextCity);
        visited[nextCity] = true;
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

function updatePheromones(pheromoneMatrix, ants, evaporationRate, distanceMatrix, prioritizedPoints) {
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

        // Check if the route passes through a prioritized point
        const hasPriority = route.some(city => prioritizedPoints.includes(city));

        const pheromoneToAdd = hasPriority ? 2 / routeLength : 1 / routeLength; // Increase pheromone for routes passing through prioritized points

        for (let m = 0; m < route.length - 1; m++) {
            const cityA = route[m];
            const cityB = route[m + 1];
            pheromoneMatrix[cityA][cityB] += pheromoneToAdd;
            pheromoneMatrix[cityB][cityA] += pheromoneToAdd; // Assuming symmetric pheromone updating
        }
    }
}

function extractPrioritizedPoints(coordinates) {
    const prioritizedPoints = [];
    for (let i = 0; i < coordinates.length; i++) {
        if (coordinates[i].priority) {
            prioritizedPoints.push(i);
        }
    }
    return prioritizedPoints;
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

function calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta, prioritizedPoints) {
    const numCities = coordinates.length;
    const probabilities = [];
    let total = 0;

    for (let i = 0; i < numCities; i++) {
        if (!visited[i]) {
            let pheromone = pheromoneMatrix[currentCity][i];
            const distance = calculateDistance(coordinates[currentCity], coordinates[i]);

            // Check if the current city is one of the prioritized points
            if (prioritizedPoints && prioritizedPoints.includes(i)) {
                // Increase the pheromone level to prioritize this point
                pheromone *= 2; // You can adjust this factor based on the level of prioritization
            }

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
    let optimizedRoutesHTML = "<h2>Optimized Route</h2><table id='optimizedRouteTable'><tr><th>Index</th><th>Latitude</th><th>Longitude</th><th>Location Name</th><th>Priority</th></tr>";

    // Store the prioritized coordinates
    const prioritizedCoordinates = [];

    for (let j = 0; j < route.length; j++) {
        const index = route[j];
        const coordinate = coordinates[index];
        const priority = coordinate.priority ? 'Yes' : 'No'; // Check if the coordinate is prioritized

        // If priority is set to yes, add it to the prioritizedCoordinates array
        if (coordinate.priority) {
            prioritizedCoordinates.push({ index: j, coordinate: coordinate });
        } else {
            optimizedRoutesHTML += `<tr><td>${j + 1}</td><td>${coordinate.lat}</td><td>${coordinate.lng}</td><td>${coordinate.name}</td><td>${priority}</td></tr>`;
        }
    }

    // Add prioritized coordinates after the starting point
    for (const prioritizedCoordinate of prioritizedCoordinates) {
        optimizedRoutesHTML = optimizedRoutesHTML.replace('</tr>', `<tr><td>${prioritizedCoordinate.index + 1}</td><td>${prioritizedCoordinate.coordinate.lat}</td><td>${prioritizedCoordinate.coordinate.lng}</td><td>${prioritizedCoordinate.coordinate.name}</td><td>Yes</td></tr></tr>`);
    }

    optimizedRoutesHTML += "</table>";

    const optimizedRoutesDiv = document.getElementById('optimizedRoutes');
    optimizedRoutesDiv.innerHTML = optimizedRoutesHTML;
    optimizedRoutesDiv.classList.remove('hidden');
}






function addMarkersToMap(coordinates, route, prioritizedPoints) {
    var map = L.map('map').setView([coordinates[0].lat, coordinates[0].lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var routeLatLng = [];
    var prioritizedRouteLatLng = [];

    for (var i = 0; i < route.length; i++) {
        var index = route[i];
        var latLng = L.latLng(coordinates[index].lat, coordinates[index].lng);

        // Check if the current point is a prioritized point
        if (prioritizedPoints.includes(index)) {
            var markerIcon = L.divIcon({
                className: 'custom-marker-icon',
                html: (i + 1).toString(),
                iconSize: [25, 25],
                iconAnchor: [-2, 12],
                iconUrl: 'red_marker.png'
            });
            prioritizedRouteLatLng.push(latLng);
        } else {
            var markerIcon = L.divIcon({
                className: 'custom-marker-icon',
                html: (i + 1).toString(),
                iconSize: [25, 25],
                iconAnchor: [-2, 12],
                iconUrl: 'blue_marker.png'
            });
            routeLatLng.push(latLng); // Store non-prioritized points for blue route
        }
        
        var marker = L.marker(latLng, {
            icon: markerIcon
        }).addTo(map);
    }

    // Add custom CSS to hide or prevent interaction with the marker icon
    var customCss = document.createElement('style');
    customCss.innerHTML = '.leaflet-marker-icon { display: none; pointer-events: none; }';
    document.head.appendChild(customCss);

    // Create separate routes for prioritized and non-prioritized points
    var prioritizedRoute = L.Routing.control({
        waypoints: prioritizedRouteLatLng,
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#910200', opacity: 1, weight: 8 }]
        }
    }).addTo(map);

    var routeControl = L.Routing.control({
        waypoints: routeLatLng,
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#008ee6', opacity: 1, weight: 5 }]
        }
    }).addTo(map);
}









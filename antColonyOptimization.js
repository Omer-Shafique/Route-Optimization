class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(item) {
        this.queue.push(item);
        this.queue.sort((a, b) => a.priority - b.priority); // Sort by priority
    }

    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        return this.queue.shift();
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}


function optimizePointOrder(points, distanceMatrix, startingPoint) {
    // Sort points based on their priority and distance from the starting point
    points.sort((a, b) => {
        // Prioritize the starting point to always be first
        if (a === startingPoint) return -1;
        if (b === startingPoint) return 1;
        
        // Prioritize prioritized points over non-prioritized points
        const isAPrioritized = points[a].priority;
        const isBPrioritized = points[b].priority;
        if (isAPrioritized && !isBPrioritized) return -1;
        if (!isAPrioritized && isBPrioritized) return 1;
        
        // If both points are prioritized or both are not, sort by index
        return a - b;
    });

    return points;
}





window.onload = function() {
    const storedCSVData = localStorage.getItem('csvData');
    if (storedCSVData) {
        parseCSV(storedCSVData, 0);
    }
}

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


async function parseCSV(csvData) {
    try {
        var lines = csvData.split('\n');
        var coordinates = [];
        var prioritizedPoints = [];

        // Process each line of the CSV
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            if (line !== '') {
                var parts = line.split(',');

                if (parts.length < 3) {
                    console.error("Invalid CSV format:", line);
                    continue;
                }

                var latitude = parseFloat(parts[0]); // Latitude from column 1
                var longitude = parseFloat(parts[1]); // Longitude from column 2
                var locationName = parts[2]; // Location name from column 3
                var isPriority = parts.length >= 4 && parts[3].toLowerCase() === 'yes'; // Priority from column 4

                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error("Invalid latitude or longitude:", line);
                    continue;
                }

                // Mark the first row as the starting point
                var priority = i === 0 ? true : isPriority;

                coordinates.push({ lat: latitude, lng: longitude, name: locationName, priority: priority, rowIndex: i });

                if (priority) {
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

    // Display the filename
    var fileNameDisplay = document.getElementById('fileNameDisplay');
    fileNameDisplay.textContent = "File selected: " + file.name;

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

async function optimizeRouteWithACO(coordinates, distanceMatrix, prioritizedRoute, lastPriorityIndex) {
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
            ants[ant].path = constructAntRoute(pheromoneMatrix, coordinates, alpha, beta, lastPriorityIndex, prioritizedRoute);
            ants[ant].distance = calculateRouteDistance(ants[ant].path, distanceMatrix);

            if (ants[ant].distance < bestDistance) {
                bestDistance = ants[ant].distance;
                bestRoute = ants[ant].path.slice();
            }
        }

        updatePheromones(pheromoneMatrix, ants, evaporationRate, distanceMatrix, prioritizedRoute);
    }

    // Find the index of the starting point in the optimized route
    const startingPointIndex = bestRoute.indexOf(0);

    // Rearrange the optimized route so that it ends on the starting point
    const optimizedRouteEndingOnStartingPoint = [
        ...bestRoute.slice(startingPointIndex), // From starting point to end
        ...bestRoute.slice(0, startingPointIndex + 1).reverse() // From beginning to starting point (reversed)
    ];

    hideLoadingSpinner();

    displayOptimizedRoute(optimizedRouteEndingOnStartingPoint, coordinates);

    addMarkersToMap(coordinates, optimizedRouteEndingOnStartingPoint, prioritizedRoute);
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
    while (route.length < numCities - 1) { // Adjusted to leave space for the starting point
        const probabilities = calculateProbabilities(pheromoneMatrix, coordinates, visited, currentCity, alpha, beta, prioritizedPoints);
        const nextCity = selectNextCity(probabilities);
        visited[nextCity] = true;
        route.push(nextCity);
        currentCity = nextCity;
    }

    // Add the starting point (first city) to the end of the route
    route.push(startCityIndex);
    visited[startCityIndex] = true;

    return route;
}




async function optimizeRouteWithPriorities(coordinates) {
    // Calculate distance matrix
    const distanceMatrix = calculateDistanceMatrix(coordinates);

    // Extract prioritized points
    const prioritizedPoints = extractPrioritizedPoints(coordinates);

    // Check if there are prioritized points
    if (prioritizedPoints.length === 0) {
        console.error("No prioritized points found.");
        return;
    }

    // Sort prioritized points by index
    prioritizedPoints.sort((a, b) => a - b);

    // Determine the last priority location
    const lastPriorityIndex = prioritizedPoints[prioritizedPoints.length - 1];

    // Construct initial route starting from the beginning for the prioritized route
    const initialPrioritizedRoute = [0, ...prioritizedPoints.filter(point => point !== 0)];

    // Optimize route using ACO with the initial route starting from the last priority location
    optimizeRouteWithACO(coordinates, distanceMatrix, initialPrioritizedRoute, lastPriorityIndex);
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
    // let optimizedRoutesHTML = "<h2>Optimized Route</h2><table id='optimizedRouteTable'><tr><th>Index</th><th>Latitude</th><th>Longitude</th><th>Location Name</th></tr>";

    // // Find the starting point index
    // const startingPointIndex = route[0];

    // // Sort the route array based on priority, excluding the starting point
    // const sortedRoute = route.slice(1).sort((a, b) => {
    //     const coordA = coordinates[a];
    //     const coordB = coordinates[b];

    //     if (coordA.prioritized && !coordB.prioritized) {
    //         return -1;
    //     } else if (!coordA.prioritized && coordB.prioritized) {
    //         return 1;
    //     } else {
    //         return 0;
    //     }
    // });

    // // Add the starting point at the beginning of the sorted array
    // sortedRoute.unshift(startingPointIndex);

    // for (let j = 0; j < sortedRoute.length; j++) {
    //     const index = sortedRoute[j];
    //     optimizedRoutesHTML += `<tr><td>${j + 1}</td><td>${coordinates[index].lat}</td><td>${coordinates[index].lng}</td><td>${coordinates[index].name}</td></tr>`;
    // }
    
    // optimizedRoutesHTML += "</table>";

    // const optimizedRoutesDiv = document.getElementById('optimizedRoutes');
    // optimizedRoutesDiv.innerHTML = optimizedRoutesHTML;
    // optimizedRoutesDiv.classList.remove('hidden');
}

// function addMarkersToMap(coordinates, route, prioritizedPoints) {
//     var map = L.map('map').setView([coordinates[0].lat, coordinates[0].lng], 10);

//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//     }).addTo(map);

//     var prioritizedMarkers = [];
//     var routeMarkers = [];
//     var routeLatLng = [];
//     var prioritizedRouteLatLng = [];
//     var markerCount = 1;

//     for (var i = 0; i < route.length; i++) {
//         var index = route[i];
//         var latLng = L.latLng(coordinates[index].lat, coordinates[index].lng);

//         // Check if the current point is a prioritized point
//         if (prioritizedPoints.includes(index)) {
//             var markerIcon = L.divIcon({
//                 className: 'custom-marker-icon',
//                 html: markerCount.toString(),
//                 iconSize: [25, 25],
//                 iconAnchor: [-2, 12],
//                 iconUrl: 'red_marker.png'
//             });
//             var marker = L.marker(latLng, { icon: markerIcon });
//             prioritizedMarkers.push(marker);
//             prioritizedRouteLatLng.push(latLng);
//         } else {
//             var markerIcon = L.divIcon({
//                 className: 'custom-marker-icon',
//                 html: markerCount.toString(),
//                 iconSize: [25, 25],
//                 iconAnchor: [-2, 12],
//                 iconUrl: 'blue_marker.png'
//             });
//             var marker = L.marker(latLng, { icon: markerIcon });
//             routeMarkers.push(marker); // Store non-prioritized points for blue route
//             routeLatLng.push(latLng);
//         }

//         markerCount++;
//     }

//     // Add all markers to the map
//     for (var i = 0; i < prioritizedMarkers.length; i++) {
//         prioritizedMarkers[i].addTo(map);
//     }

//     for (var i = 0; i < routeMarkers.length; i++) {
//         routeMarkers[i].addTo(map);
//     }

//     // Add routing controls for both types of points
//     var prioritizedRouteControl = L.Routing.control({
//         waypoints: prioritizedRouteLatLng,
//         routeWhileDragging: true,
//         lineOptions: {
//             styles: [{ color: '#F42E17', opacity: 1, weight: 5 }]
//         }
//     }).addTo(map);

//     var routeControl = L.Routing.control({
//         waypoints: routeLatLng,
//         routeWhileDragging: true,
//         lineOptions: {
//             styles: [{ color: '#008ee6', opacity: 1, weight: 5 }]
//         }
//     }).addTo(map);
// }

function addMarkersToMap(coordinates, route, prioritizedPoints) {
    var map = L.map('map').setView([coordinates[0].lat, coordinates[0].lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var routeLatLng = [];
    var prioritizedRouteLatLng = [];
    var routeSequence = 1;
    var prioritizedRouteSequence = 1;

    // Initialize the sequence for the prioritized route
    prioritizedRouteSequence = 0;

    // Loop through the route to add markers
    for (var i = 0; i < route.length; i++) {
        var index = route[i];
        var latLng = L.latLng(coordinates[index].lat, coordinates[index].lng);

        // Check if the current point is a prioritized point
        if (prioritizedPoints.includes(index)) {
            prioritizedRouteLatLng.push(latLng);
            // Add marker with sequence number for prioritized points
            L.marker(latLng, { icon: L.divIcon({className: 'custom-div-icon', html: '<div class="marker-text blue-route-labels">' + prioritizedRouteSequence++ + '</div>'})}).addTo(map);
        } else {
            routeLatLng.push(latLng);
            // Add marker with sequence number for non-prioritized points
            L.marker(latLng, { icon: L.divIcon({className: 'custom-div-icon', html: '<div class="marker-text">' + routeSequence++ + '</div>'})}).addTo(map);
        }
    }

    // Add routing controls for the red route
    var prioritizedRouteControl = L.Routing.control({
        waypoints: prioritizedRouteLatLng,
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#F42E17', opacity: 1, weight: 7 }]
        }
    }).addTo(map);

    // Add routing controls for the blue route
    var routeControl = L.Routing.control({
        waypoints: routeLatLng, // Use routeLatLng for the blue route
        routeWhileDragging: true,
        lineOptions: {
            styles: [{ color: '#008ee6', opacity: 1, weight: 5 }]
        }
    }).addTo(map);

    // Reverse the route and update the map
    reverseRouteAndSetWaypoints(routeControl, routeLatLng);
}



// Function to reverse the route and update the Leaflet routing control
var routeSequence = 1; // Initialize route sequence outside the function

function reverseRouteAndSetWaypoints(routeControl, routeLatLng) {
    // Reverse the order of the routeLatLng array
    routeLatLng.reverse();

    // Update the Leaflet routing control with the new routeLatLng array
    routeControl.setWaypoints(routeLatLng);

    // Add markers with sequence numbers to the reversed route
    for (var i = 0; i < routeLatLng.length; i++) {
        var latLng = routeLatLng[i];
        L.marker(latLng, { icon: L.divIcon({className: 'custom-div-icon', html: '<div class="marker-text">' + routeSequence++ + '</div>'})}).addTo(routeControl._map);
    }
}
// Get the share button element
const shareButton = document.getElementById('shareButton');

// Add event listener for click event
shareButton.addEventListener('click', shareMap);

// Function to handle the share button click event
// Function to handle the share button click event
function shareMap() {
    // Construct the URL for the map with its current state
    const mapURL = constructMapURL();

    // Use the Web Share API to share the map URL
    if (navigator.share) {
        navigator.share({
            title: 'Share Map',
            text: 'Check out this map!',
            url: mapURL,
        })
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.error('Error sharing:', error));
    } else {
        // Fallback for browsers that do not support Web Share API
        alert('Sharing is not supported in this browser.');
    }
}

// Function to construct the URL for the map with its current state
function constructMapURL() {
    // Construct the URL based on the map state
    // For example, you can include coordinates, markers, and routes as query parameters
    const mapState = {
        // Add relevant map state parameters here
    };

    // Construct the map URL with the map state as query parameters
    const mapURL = 'https://tick-route-optimizater.vercel.app/map?' + new URLSearchParams(mapState).toString();

    return mapURL;
}


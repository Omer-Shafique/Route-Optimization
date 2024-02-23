function optimizeRoute() {
  var fileInput = document.getElementById('fileInput');
  var file = fileInput.files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }
  var reader = new FileReader();

  reader.onload = function(event) {
    showLoadingSpinner();
    var csvData = event.target.result;
    try {
      parseCSV(csvData);
    } catch (error) {
      hideLoadingSpinner();
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV. Please check the console for details.');
    }
  };

  reader.onerror = function(event) {
    alert("Error reading the file.");
    console.error('FileReader error:', event.target.error);
  };

  reader.readAsText(file);
}

function showLoadingSpinner() {
  var loadingSpinner = document.getElementById('loadingSpinner');
  loadingSpinner.style.display = 'block';
}

displayOptimizedRoute

async function parseCSV(csvData) {
  try {
    var lines = csvData.split('\n');
    var coordinates = [];

    // Start the loop from index 1 to ignore the first row
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line !== '') {
        var parts = line.split(',');
        if (parts.length < 3) {
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
    alert('Error parsing CSV. Please check the console for details.');
  }
}

async function getLocationName(latitude, longitude) {
  try {
    var apiKey = 'ab74cccccb994cc49a70f85fcc54b79d'; // Replace with your OpenCage API key
    var apiUrl = `https://api.opencagedata.com/geocode/v1/json?key=${apiKey}&q=${latitude}+${longitude}&pretty=1`;

    var response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    var data = await response.json();
    // Extract the location name from the response
    var locationName = data.results[0]?.formatted || 'Unknown';
    return locationName;
  } catch (error) {
    console.error('Error fetching location name:', error);
    return 'Unknown'; // Default value if location name cannot be fetched
  }
}

function calculateAndOptimizeRoute(coordinates) {
  // Calculate distance matrix using coordinates
  var distanceMatrix = calculateDistanceMatrix(coordinates);

  // Perform route optimization using greedy algorithm
  var optimizedRoute = calculateGreedyRoute(distanceMatrix);

  // Hide loading spinner
  hideLoadingSpinner();

  // Display optimized route in a table
  displayOptimizedRoute(optimizedRoute, coordinates);

  // Add markers to the map
  addMarkersToMap(coordinates, optimizedRoute);
}

function calculateDistanceMatrix(coordinates) {
  var numAddresses = coordinates.length;
  var distanceMatrix = [];
  
  for (var i = 0; i < numAddresses; i++) {
    distanceMatrix.push([]);
    for (var j = 0; j < numAddresses; j++) {
      if (i === j) {
        distanceMatrix[i][j] = 0; 
      } else {
        // For simplicity, let's assume the distance is the absolute difference in latitude
        distanceMatrix[i][j] = Math.abs(coordinates[i].lat - coordinates[j].lat);
      }
    }
  }
  
  return distanceMatrix;
}

function calculateGreedyRoute(distanceMatrix) {
  var numAddresses = distanceMatrix.length;
  var visited = new Array(numAddresses).fill(false);
  var optimizedRoute = [0]; // Start with the first address as the starting point
  visited[0] = true;

  while (optimizedRoute.length < numAddresses) {
    var currentAddress = optimizedRoute[optimizedRoute.length - 1];
    var nearestNeighbor = findNearestNeighbor(currentAddress, visited, distanceMatrix);
    optimizedRoute.push(nearestNeighbor);
    visited[nearestNeighbor] = true;
  }

  return optimizedRoute;
}

function findNearestNeighbor(current, visited, distances) {
  var nearest = -1;
  var minDistance = Number.MAX_SAFE_INTEGER;
  for (var i = 0; i < visited.length; i++) {
    if (!visited[i] && distances[current][i] < minDistance) {
      minDistance = distances[current][i];
      nearest = i;
    }
  }
  return nearest;
}

function displayOptimizedRoute(route, coordinates) {
  var optimizedRoutesHTML = "<h2>Optimized Route</h2><table id='optimizedRouteTable'>";
  optimizedRoutesHTML += "<tr><th>Index</th><th>Latitude</th><th>Longitude</th><th>Location Name</th></tr>";
  for (var j = 0; j < route.length; j++) {
    var index = route[j];
    optimizedRoutesHTML += "<tr><td>" + (j + 1) + "</td><td>" + coordinates[index].lat + "</td><td>" + coordinates[index].lng + "</td><td>" + coordinates[index].name + "</td></tr>";
  }
  optimizedRoutesHTML += "</table>";

  var optimizedRoutesDiv = document.getElementById('optimizedRoutes');
  optimizedRoutesDiv.innerHTML = optimizedRoutesHTML;
  optimizedRoutesDiv.classList.remove('hidden');
}





function addMarkersToMap(coordinates, route) {
  var map = L.map('map').setView([coordinates[0].lat, coordinates[0].lng], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var routeLatLng = [];

  // Add markers to the map
  for (var i = 0; i < route.length; i++) {
    var index = route[i];
    var latLng = L.latLng(coordinates[index].lat, coordinates[index].lng);

    var markerIcon = L.divIcon({
      className: 'custom-marker-icon',
      html: (i + 1).toString(), // Display the number inside the marker icon
      iconSize: [25, 25], // Set the icon size
      iconAnchor: [-2, 12] // Adjust the icon anchor to move the marker to the left
    });

    var marker = L.marker(latLng, { icon: markerIcon }).addTo(map);
    
    routeLatLng.push(latLng); // Add LatLng object to the routeLatLng array
  }

  // Create a routing control and add it to the map
  L.Routing.control({
    waypoints: routeLatLng,
    routeWhileDragging: true,
    lineOptions: {
      styles: [{color: '#006cbf', opacity: 1, weight: 5}]
    }
  }).addTo(map);
}









function updateRoute(oldIndex, newIndex) {
  // Update the route array
  var route = Array.from(document.querySelectorAll('#optimizedRouteTable tr[data-index]')).map(row => parseInt(row.getAttribute('data-index')));
  
  // Move the item
  route.splice(newIndex, 0, route.splice(oldIndex, 1)[0]);
  
  // Update the table row numbers
  var tableRows = document.querySelectorAll('#optimizedRouteTable tr');
  for (var i = 0; i < tableRows.length; i++) {
    tableRows[i].querySelector('td:first-child').textContent = i + 1;
  }
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.getAttribute('data-index'));
}

function drop(ev) {
  ev.preventDefault();
  var data = ev.dataTransfer.getData("text");
  var newIndex = ev.target.closest('tr').rowIndex - 1;
  var oldIndex = parseInt(data);
  updateRoute(oldIndex, newIndex);
}
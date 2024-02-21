"use strict";

function calculateDistanceMatrix(coordinates) {
    var numAddresses = coordinates.length;
    var distanceMatrix = [];

    for (var i = 0; i < numAddresses; i++) {
        distanceMatrix.push([]);
        for (var j = 0; j < numAddresses; j++) {
            if (i === j) {
                distanceMatrix[i][j] = 0;
            } else {
                // Calculate the distance between two coordinates
                distanceMatrix[i][j] = calculateDistance(coordinates[i], coordinates[j]);
            }
        }
    }

    return distanceMatrix;
}

function calculateDistance(coord1, coord2) {
    // Calculate the distance between two coordinates using Euclidean distance formula
    var dx = coord1.lat - coord2.lat;
    var dy = coord1.lng - coord2.lng;
    return Math.sqrt(dx * dx + dy * dy);
}


function performGeneticAlgorithm(coordinates) {
    // Implement the genetic algorithm for route optimization here
    var initialPopulation = initializePopulation(100, coordinates); // Adjust population size as needed
    var optimizedRoute = geneticAlgorithm(initialPopulation, coordinates);
    return optimizedRoute;
}


function initializePopulation(populationSize, coordinates) {
    var population = [];
    for (var i = 0; i < populationSize; i++) {
        var chromosome = getRandomChromosome(coordinates.length);
        population.push(chromosome);
    }
    return population;
}

function optimizeRoute() {
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];
    if (!file) {
        alert("Please select a file.");
        return;
    }
    var reader = new FileReader();

    reader.onload = function (event) {
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

    reader.onerror = function (event) {
        alert("Error reading the file.");
        console.error('FileReader error:', event.target.error);
    };

    reader.readAsText(file);
}

function showLoadingSpinner() {
    var loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'block';
}

function hideLoadingSpinner() {
    var loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'none';
}

async function parseCSV(csvData) {
    try {
        const lines = csvData.split('\n');
        const coordinates = [];

        for (const [i, line] of lines.entries()) {
            line.trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length < 3) {
                console.error("Invalid CSV format:", line);
                continue;
            }

            const latitude = parseFloat(parts[0]);
            const longitude = parseFloat(parts[1]);

            if (isNaN(latitude) || isNaN(longitude)) {
                console.error("Invalid latitude or longitude:", line);
                continue;
            }

            const locationName = await getLocationName(latitude, longitude);
            coordinates.push({ lat: latitude, lng: longitude, name: locationName });
        }

        calculateAndOptimizeRoute(coordinates);
    } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV. Please check the console for details.');
    }
}

async function getLocationName(latitude, longitude) {
    try {
        var apiKey = '4dcbdbdd1de34f21bb5592bbdbbc9da7'; 
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

    // Perform route optimization using genetic algorithm
    var optimizedRoute = performGeneticAlgorithm(coordinates);

    // Hide loading spinner
    hideLoadingSpinner();

    // Display optimized route in a table
    displayOptimizedRoute(optimizedRoute, coordinates);

    // Add markers to the map
    addMarkersToMap(coordinates, optimizedRoute);
}


function getRandomChromosome(length) {
    var chromosome = [];
    for (var i = 0; i < length; i++) {
        chromosome.push(i);
    }
    return shuffleArray(chromosome);
}

function displayOptimizedRoute(route, coordinates) {
    var optimizedRoutesHTML = "<h2>Optimized Route</h2><table id='optimizedRouteTable'>";
    optimizedRoutesHTML += "<tr><th>Index</th><th>Latitude</th><th>Longitude</th><th>Location Name</th></tr>";
    for (var j = 0; j < route.length; j++) {
        var index = route[j];
        optimizedRoutesHTML += "<tr draggable='true' data-index='" + index + "' ondragstart='drag(event)'><td>" + (j + 1) + "</td><td>" + coordinates[index].lat + "</td><td>" + coordinates[index].lng + "</td><td>" + coordinates[index].name + "</td></tr>";
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
        var markerIcon = L.divIcon({
            className: 'custom-marker-icon',
            html: (i + 1)
        });

        markerIcon.options.iconSize = [25, 25];

        var marker = L.marker([coordinates[route[i]].lat, coordinates[route[i]].lng], { icon: markerIcon }).addTo(map);

        routeLatLng.push(L.latLng(coordinates[route[i]].lat, coordinates[route[i]].lng)); // Add LatLng object to the routeLatLng array
    }

    // Create a routing control and add it to the map
    L.Routing.control({
        waypoints: routeLatLng,
        routeWhileDragging: true
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

// function drop(ev) {
//     ev.preventDefault();
//     var data = ev.dataTransfer.getData("text");
//     var newIndex = ev.target.closest('tr').rowIndex - 1;
//     var oldIndex = parseInt(data);
//     updateRoute(oldIndex, newIndex);
// }


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function geneticAlgorithm(initialPopulation, coordinates) {
    var population = initialPopulation;
    var generation = 1;
    var maxGenerations = 100; // Adjust as needed
    var mutationRate = 0.1; // Adjust as needed

    while (generation <= maxGenerations) {
        // Evaluate the fitness of each chromosome in the population
        var fitnessScores = evaluateFitness(population, coordinates);

        // Select parents for reproduction using selection methods (e.g., tournament selection, roulette wheel selection)
        var parents = selectParents(population, fitnessScores);

        // Perform crossover to create offspring
        var offspring = crossover(parents);

        // Apply mutation to the offspring
        mutate(offspring, mutationRate);

        // Combine parents and offspring to form the next generation
        population = parents.concat(offspring);

        // Select the best chromosomes for the next generation (e.g., elitism)
        population = selectNextGeneration(population, coordinates);

        // Increment generation counter
        generation++;
    }

    // Return the best chromosome (route) found in the final population
    return getBestChromosome(population, coordinates);
}

function evaluateFitness(population, coordinates) {
    var fitnessScores = [];

    for (var i = 0; i < population.length; i++) {
        var route = population[i];
        var totalDistance = calculateRouteDistance(route, coordinates);
        var fitness = 1 / totalDistance; // Inverse of total distance as fitness
        fitnessScores.push(fitness);
    }

    return fitnessScores;
}
function calculateRouteDistance(route, coordinates) {
    var totalDistance = 0;
    for (var i = 0; i < route.length - 1; i++) {
        var fromIndex = route[i];
        var toIndex = route[i + 1];
        var fromCoord = coordinates[fromIndex];
        var toCoord = coordinates[toIndex];
        totalDistance += calculateDistance(fromCoord, toCoord);
    }
    // Add distance from the last point back to the starting point (assuming it's a closed loop)
    var lastIndex = route[route.length - 1];
    var firstIndex = route[0];
    var lastCoord = coordinates[lastIndex];
    var firstCoord = coordinates[firstIndex];
    totalDistance += calculateDistance(lastCoord, firstCoord);
    return totalDistance;
}

function selectParents(population, fitnessScores) {
    // Tournament selection: Randomly select two individuals from the population,
    // and return the one with the higher fitness score.
    var parents = [];
    for (var i = 0; i < population.length; i++) {
        var randomIndex1 = getRandomInt(0, population.length);
        var randomIndex2 = getRandomInt(0, population.length);
        var parent1 = population[randomIndex1];
        var parent2 = population[randomIndex2];
        parents.push(fitnessScores[randomIndex1] > fitnessScores[randomIndex2] ? parent1 : parent2);
    }
    return parents;
}

function crossover(parents) {
    // One-point crossover: Randomly select a crossover point and exchange genetic material
    // between two parents to create offspring.
    var offspring = [];
    for (var i = 0; i < parents.length; i += 2) {
        var parent1 = parents[i];
        var parent2 = parents[i + 1];
        var crossoverPoint = getRandomInt(0, parent1.length);
        var child1 = parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint));
        var child2 = parent2.slice(0, crossoverPoint).concat(parent1.slice(crossoverPoint));
        offspring.push(child1);
        offspring.push(child2);
    }
    return offspring;
}

function mutate(offspring, mutationRate) {
    // Mutation: Randomly select genes in the offspring and change them with a certain probability (mutation rate).
    for (var i = 0; i < offspring.length; i++) {
        for (var j = 0; j < offspring[i].length; j++) {
            if (Math.random() < mutationRate) {
                // Swap gene with a randomly selected gene in the chromosome
                var randomIndex = getRandomInt(0, offspring[i].length);
                var temp = offspring[i][j];
                offspring[i][j] = offspring[i][randomIndex];
                offspring[i][randomIndex] = temp;
            }
        }
    }
}

function selectNextGeneration(population, coordinates) {
    // Elitism: Select a fraction of the best individuals from the current population
    // and replace the rest with offspring.
    var eliteSize = Math.ceil(population.length * 0.1); // Select top 10% as elite
    var sortedPopulation = population.slice().sort(function (a, b) {
        return calculateRouteDistance(a, coordinates) - calculateRouteDistance(b, coordinates);
    });
    var elite = sortedPopulation.slice(0, eliteSize);
    return elite.concat(population.slice(eliteSize)); // Combine elite and remaining population
}

function calculateRouteDistance(route, coordinates) {
    // Calculate the total distance traveled for a given route (chromosome).
    var totalDistance = 0;
    for (var i = 0; i < route.length - 1; i++) {
        var index1 = route[i];
        var index2 = route[i + 1];
        totalDistance += calculateDistance(coordinates[index1], coordinates[index2]);
    }
    // Add distance from the last city back to the starting city (round trip)
    totalDistance += calculateDistance(coordinates[route[route.length - 1]], coordinates[route[0]]);
    return totalDistance;
}

function getBestChromosome(population, coordinates) {
    // Find the chromosome (route) with the shortest total distance traveled.
    var bestChromosome = population[0];
    var shortestDistance = calculateRouteDistance(bestChromosome, coordinates);
    for (var i = 1; i < population.length; i++) {
        var distance = calculateRouteDistance(population[i], coordinates);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            bestChromosome = population[i];
        }
    }
    return bestChromosome;
}

function getRandomInt(min, max) {
    // Generate a random integer between min (inclusive) and max (exclusive).
    return Math.floor(Math.random() * (max - min)) + min;
}

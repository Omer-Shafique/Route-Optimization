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

// Get the map element
const map = document.getElementById('map');

// Add event listener for click event
map.addEventListener('click', openMapInNewPage);

// Function to handle opening the map in a new page
function openMapInNewPage() {
    // Define the URL of the map
    const mapURL = 'https://tick-route-optimizater.vercel.app/map';

    // Open the map URL in a new tab
    window.open(mapURL, '_blank');
}
// static/js/map.js

// 1. Initialize Map centered on India
var map = L.map('map', {
    center: [22.3511148, 78.6677428], // India
    zoom: 5,
    zoomControl: true
});

// 2. Base Layers (Backgrounds)
// Satellite View
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
});

// Dark View (Better for visualizing heat)
var darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB'
});

// Add default layer
darkMap.addTo(map);

// ----------------------------------------------------------
// 3. DATA LAYER: HEATMAP (Temperature)
// ----------------------------------------------------------
// You need an API Key from OpenWeatherMap (Free tier available)
var apiKey = 'a2d79564fffb09a7bfd5c937b01fdd2c'; 

var tempLayer = L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=' + apiKey, {
    attribution: 'OpenWeatherMap',
    opacity: 0.6
});

// ----------------------------------------------------------
// 4. DATA LAYER: NASA FIRE DETECTION (MODIS)
// ----------------------------------------------------------
// Dynamically get today's date for the API URL
const today = new Date().toISOString().split('T')[0];

var fireLayer = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Thermal_Anomalies_All/default/${today}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, {
    attribution: 'NASA GIBS',
    opacity: 1.0
});

// ----------------------------------------------------------
// 5. DATA LAYER: WIND ANIMATION
// ----------------------------------------------------------
// Fetch sample wind data (In production, your Python backend would serve this)
fetch('https://onaci.github.io/leaflet-velocity/wind-global.json')
    .then(response => response.json())
    .then(data => {
        var velocityLayer = L.velocityLayer({
            displayValues: true,
            displayOptions: {
                velocityType: 'Global Wind',
                position: 'bottomleft',
                emptyString: 'No wind data'
            },
            data: data, // The JSON data required for animation
            maxVelocity: 15,
            velocityScale: 0.005 // Adjust particle speed
        });

        // 6. Add Layer Control (The Switcher)
        var baseMaps = {
            "Dark Mode": darkMap,
            "Satellite": satellite
        };

        var overlayMaps = {
            "Wind Animation": velocityLayer,
            "Temperature Heatmap": tempLayer,
            "Active Fires (NASA)": fireLayer
        };

        L.control.layers(baseMaps, overlayMaps).addTo(map);
    })
    .catch(err => console.error('Error loading wind data:', err));
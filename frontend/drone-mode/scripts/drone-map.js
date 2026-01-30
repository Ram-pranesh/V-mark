// Drone Map Initialization

const CONFIG = {
    DEFAULT_CENTER: [73.5, 4.2], // Maldives as per main app? Or default
    DEFAULT_ZOOM: 16 // Higher zoom for drone view
};

// Initialize Map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
            'satellite': {
                'type': 'raster',
                'tiles': [
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                'tileSize': 256,
                'attribution': 'Esri, Maxar, Earthstar Geographics'
            }
        },
        layers: [
            {
                'id': 'satellite',
                'type': 'raster',
                'source': 'satellite',
                'paint': {}
            }
        ]
    },
    center: CONFIG.DEFAULT_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    pitch: 45, // Drone view usually has pitch
    bearing: 0,
    attributionControl: false
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.FullscreenControl(), 'top-right');

window.map = map;

// Drone Animation Logic (Optional: Make it drift slightly to simulate hovering)
let time = 0;
function animate() {
    time += 0.05;
    // const center = map.getCenter();
    // map.easeTo({
    //     pitch: 45 + Math.sin(time) * 2,
    //     bearing: Math.cos(time * 0.5) * 2,
    //     duration: 0,
    //     easing: t => t
    // });
    requestAnimationFrame(animate);
}
// animate();

console.log("Drone Mode Initialized");

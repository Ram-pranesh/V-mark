// Drone Map Initialization
// Using a darker style or satellite for the base, consistent with user request

const CONFIG = {
    // Centering near Central India for better overview of new dataset
    DEFAULT_CENTER: [79.0, 21.0],
    DEFAULT_ZOOM: 5
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
            },
            'borders': {
                'type': 'raster',
                'tiles': [
                    'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
                ],
                'tileSize': 256,
                'attribution': 'CartoDB'
            },
            'mapbox-dem': {
                'type': 'raster-dem',
                'url': 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                'tileSize': 256
            }
        },
        layers: [
            {
                'id': 'satellite',
                'type': 'raster',
                'source': 'satellite',
                'paint': {}
            },
            {
                'id': 'admin-borders',
                'type': 'raster',
                'source': 'borders',
                'paint': { 'raster-opacity': 0.7 }
            }
        ],
        terrain: {
            source: 'mapbox-dem',
            exaggeration: 1.5
        }
    },
    center: CONFIG.DEFAULT_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    pitch: 0, // Top-down view as requested
    bearing: 0,
    attributionControl: false
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), 'top-right');

// Home Button Control
class HomeButtonControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this._container.innerHTML = `
            <button class="maplibregl-ctrl-icon" type="button" title="Home View (India)" aria-label="Home">
                <span class="material-icons-round" style="font-size:18px; line-height:29px; color:#333;">home</span>
            </button>
        `;
        this._container.onclick = () => {
            // 1. Fly to India
            this._map.flyTo({ center: [78.9629, 20.5937], zoom: 4.5, pitch: 0 });

            // 2. Ensure Borders are Visible (Toggle logic can be added if needed)
            if (this._map.getLayer('admin-borders')) {
                this._map.setLayoutProperty('admin-borders', 'visibility', 'visible');
            }
        };
        return this._container;
    }
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}
map.addControl(new HomeButtonControl(), 'top-right');
// map.addControl(new maplibregl.FullscreenControl(), 'top-right'); // Removed full screen to keep in widget

window.map = map;

// Resize Observer to handle flex layout changes
const resizeObserver = new ResizeObserver(() => {
    map.resize();
});
resizeObserver.observe(document.getElementById('map'));

// --- Forest Logic ---

map.on('load', () => {
    // 1. Construct GeoJSON from DRONE_DB
    const forestFeatures = [];

    if (window.DRONE_DB && window.DRONE_DB.forests) {
        Object.keys(window.DRONE_DB.forests).forEach(key => {
            const forest = window.DRONE_DB.forests[key];
            if (forest.coordinates) {
                forestFeatures.push({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [forest.coordinates]
                    },
                    properties: {
                        id: key,
                        name: forest.name,
                        loc: forest.location
                    }
                });
            }
        });
    }

    // 2. Add Source
    map.addSource('forest-zones', {
        type: 'geojson',
        data: {
            type: "FeatureCollection",
            features: forestFeatures
        }
    });

    // 3. Add Layers
    // Fill Layer
    map.addLayer({
        'id': 'forest-fill',
        'type': 'fill',
        'source': 'forest-zones',
        'paint': {
            'fill-color': '#ff6b35', // matching theme
            'fill-opacity': 0.15
        }
    });

    // Outline Layer
    map.addLayer({
        'id': 'forest-line',
        'type': 'line',
        'source': 'forest-zones',
        'paint': {
            'line-color': '#ff6b35',
            'line-width': 2
        }
    });

    // 4. Interaction
    map.on('click', 'forest-fill', (e) => {
        const feature = e.features[0];
        const id = feature.properties.id;

        if (window.DroneUI && id) {
            window.DroneUI.openForestPanel(id);
        }
    });

    // Cursor
    map.on('mouseenter', 'forest-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'forest-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Fit Bounds Top-Down
    if (forestFeatures.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        forestFeatures.forEach(f => {
            f.geometry.coordinates[0].forEach(c => bounds.extend(c));
        });
        map.fitBounds(bounds, { padding: 60, pitch: 0 }); // Force pitch 0
    }
});

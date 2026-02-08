// COMMUNICATION NODES SYSTEM
// Generates 9-12 nodes along forest boundaries
// Each node covers 15km radius
// Nodes are interconnected in a mesh network

const COMM_NODES_SYSTEM = {
    nodes: {},
    links: [],
    coverageRadius: 15, // km

    // Generate nodes for all forests
    generateNodes: function () {
        if (typeof turf === 'undefined') {
            console.error("Turf.js required for node generation");
            return;
        }

        Object.keys(DRONE_DB.forests).forEach(forestKey => {
            const forest = DRONE_DB.forests[forestKey];
            if (!forest.coordinates) return;

            // Create polygon
            let polyCoords = [...forest.coordinates];
            const first = polyCoords[0];
            const last = polyCoords[polyCoords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                polyCoords.push(first);
            }
            const forestPoly = turf.polygon([polyCoords]);

            // Calculate number of nodes (9-12 based on perimeter)
            const perimeter = turf.length(turf.polygonToLine(forestPoly), { units: 'kilometers' });
            const nodeCount = Math.min(12, Math.max(9, Math.floor(perimeter / 20)));

            // Generate nodes along the boundary
            const forestNodes = this.generateBoundaryNodes(polyCoords, nodeCount, forestKey);
            this.nodes[forestKey] = forestNodes;

            // Generate links between nodes (mesh network)
            this.generateMeshLinks(forestNodes, forestKey);
        });

        console.log(`Communication Nodes System: ${Object.keys(this.nodes).length} forests equipped with mesh network`);
    },

    // Generate nodes inside polygon boundary (not on the edge)
    generateBoundaryNodes: function (coords, count, forestKey) {
        const nodes = [];
        const line = turf.lineString(coords);
        const totalLength = turf.length(line, { units: 'kilometers' });
        const spacing = totalLength / count;

        // Create polygon for boundary checking
        const polygon = turf.polygon([coords]);

        for (let i = 0; i < count; i++) {
            const distance = i * spacing;
            const edgePoint = turf.along(line, distance, { units: 'kilometers' });
            const [edgeLng, edgeLat] = edgePoint.geometry.coordinates; // Track edge anchor

            // Calculate centroid of the polygon
            const centroid = turf.centroid(polygon);
            const [centLng, centLat] = centroid.geometry.coordinates;
            // Move point inward (10-25% from edge towards center) to keep them near boundary
            // Retry logic to ensure point is inside polygon
            let validPoint = false;
            let finalLng = edgeLng;
            let finalLat = edgeLat;

            for (let attempt = 0; attempt < 10; attempt++) {
                // Hug the boundary: 0.02 to 0.08, slight grow per attempt
                const inwardFactor = 0.02 + (Math.random() * 0.06) + (attempt * 0.03);
                const lng = edgeLng + (centLng - edgeLng) * inwardFactor;
                const lat = edgeLat + (centLat - edgeLat) * inwardFactor;

                const pt = turf.point([lng, lat]);
                if (turf.booleanPointInPolygon(pt, polygon)) {
                    finalLng = lng;
                    finalLat = lat;
                    validPoint = true;
                    break;
                }
            }

            // Fallback: If still outside (complex shape), keep closer (15%)
            if (!validPoint) {
                const inwardFactor = 0.15;
                finalLng = edgeLng + (centLng - edgeLng) * inwardFactor;
                finalLat = edgeLat + (centLat - edgeLat) * inwardFactor;
            }

            nodes.push({
                id: `${forestKey.toUpperCase()}-NODE-${String(i + 1).padStart(2, '0')}`,
                forestKey: forestKey,
                lat: finalLat,
                lng: finalLng,
                radius: this.coverageRadius,
                status: 'active',
                connections: []
            });
        }

        return nodes;
    },

    // Generate complete mesh links (each node connects to every other)
    generateMeshLinks: function (nodes, forestKey) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];

                this.links.push({
                    id: `LINK-${a.id}-${b.id}`,
                    from: a.id,
                    to: b.id,
                    fromCoords: [a.lng, a.lat],
                    toCoords: [b.lng, b.lat],
                    forestKey: forestKey,
                    type: 'primary'
                });

                a.connections.push(b.id);
                b.connections.push(a.id);
            }
        }
    },

    // Add nodes to map
    addNodesToMap: function (map) {
        if (!map) return;

        // Create GeoJSON for nodes
        const nodeFeatures = [];
        Object.values(this.nodes).forEach(forestNodes => {
            forestNodes.forEach(node => {
                nodeFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [node.lng, node.lat]
                    },
                    properties: {
                        id: node.id,
                        forestKey: node.forestKey,
                        status: node.status,
                        radius: node.radius
                    }
                });
            });
        });

        if (!map.getSource('comm-nodes')) {
            map.addSource('comm-nodes', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: nodeFeatures }
            });

            // Add node layer (hidden by default)
            map.addLayer({
                id: 'comm-nodes-layer',
                type: 'symbol',
                source: 'comm-nodes',
                layout: {
                    'icon-image': 'node-icon',
                    'icon-size': 0.7,
                    'icon-allow-overlap': true,
                    'visibility': 'none'
                },
                paint: {
                    'icon-opacity': 0.9
                }
            });
        }
    },

    // Add links to map
    addLinksToMap: function (map) {
        if (!map) return;

        // Create GeoJSON for links
        const linkFeatures = this.links.map(link => ({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [link.fromCoords, link.toCoords]
            },
            properties: {
                id: link.id,
                from: link.from,
                to: link.to,
                forestKey: link.forestKey,
                type: link.type
            }
        }));

        if (!map.getSource('comm-links')) {
            map.addSource('comm-links', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: linkFeatures }
            });

            // Add links layer (hidden by default)
            map.addLayer({
                id: 'comm-links-layer',
                type: 'line',
                source: 'comm-links',
                paint: {
                    'line-color': '#3fb36a',
                    'line-width': 1.5,
                    'line-opacity': 0.8,
                    'line-dasharray': ['literal', [1, 0]]
                },
                layout: {
                    'visibility': 'none'
                }
            }, 'comm-nodes-layer'); // Add below nodes
        }
    },

    // Add coverage circles to map
    addCoverageToMap: function (map) {
        if (!map) return;

        // Create GeoJSON for coverage circles
        const coverageFeatures = [];
        Object.values(this.nodes).forEach(forestNodes => {
            forestNodes.forEach(node => {
                const center = turf.point([node.lng, node.lat]);
                const circle = turf.circle(center, node.radius, { units: 'kilometers', steps: 64 });

                coverageFeatures.push({
                    type: 'Feature',
                    geometry: circle.geometry,
                    properties: {
                        id: node.id,
                        forestKey: node.forestKey
                    }
                });
            });
        });

        if (!map.getSource('comm-coverage')) {
            map.addSource('comm-coverage', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: coverageFeatures }
            });

            // Add coverage layer (hidden by default)
            map.addLayer({
                id: 'comm-coverage-layer',
                type: 'fill',
                source: 'comm-coverage',
                paint: {
                    'fill-color': '#3fb36a',
                    'fill-opacity': 0.22
                },
                layout: {
                    'visibility': 'none'
                }
            }, 'comm-links-layer'); // Add below links

            // Add coverage outline
            map.addLayer({
                id: 'comm-coverage-outline',
                type: 'line',
                source: 'comm-coverage',
                paint: {
                    'line-color': '#2d8b52',
                    'line-width': 1.5,
                    'line-opacity': 0.7,
                    'line-dasharray': [2, 2]
                },
                layout: {
                    'visibility': 'none'
                }
            }, 'comm-links-layer');
        }
    },

    // Toggle visibility
    toggleLinks: function (map, visible) {
        if (!map) return;
        const visibility = visible ? 'visible' : 'none';

        if (map.getLayer('comm-links-layer')) {
            map.setLayoutProperty('comm-links-layer', 'visibility', visibility);
        }
        if (map.getLayer('comm-nodes-layer')) {
            map.setLayoutProperty('comm-nodes-layer', 'visibility', visibility);
        }
    },

    toggleCoverage: function (map, visible) {
        if (!map) return;
        const visibility = visible ? 'visible' : 'none';

        if (map.getLayer('comm-coverage-layer')) {
            map.setLayoutProperty('comm-coverage-layer', 'visibility', visibility);
        }
        if (map.getLayer('comm-coverage-outline')) {
            map.setLayoutProperty('comm-coverage-outline', 'visibility', visibility);
        }
    },

    // Initialize nodes for forest (Show Nodes, Hide Links by default)
    initializeForestNodes: function (map, forestKey) {
        if (!map) return;

        // 1. Filter Data
        const forestNodes = this.nodes[forestKey] || [];
        const forestLinks = this.links.filter(link => link.forestKey === forestKey);

        const nodeFeatures = forestNodes.map(node => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [node.lng, node.lat] },
            properties: { id: node.id, forestKey: node.forestKey, status: node.status, radius: node.radius }
        }));

        const linkFeatures = forestLinks.map(link => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [link.fromCoords, link.toCoords] },
            properties: { id: link.id, from: link.from, to: link.to, forestKey: link.forestKey, type: link.type }
        }));

        // 2. Update Sources
        if (map.getSource('comm-nodes')) map.getSource('comm-nodes').setData({ type: 'FeatureCollection', features: nodeFeatures });
        if (map.getSource('comm-links')) map.getSource('comm-links').setData({ type: 'FeatureCollection', features: linkFeatures });

        // 3. Show Nodes Only
        if (map.getLayer('comm-links-layer')) map.setLayoutProperty('comm-links-layer', 'visibility', 'none');
        if (map.getLayer('comm-nodes-layer')) map.setLayoutProperty('comm-nodes-layer', 'visibility', 'visible');
    },

    // Toggle Link Lines Visibility Only
    toggleLinkLayer: function (map, visible) {
        if (!map) return;
        const visibility = visible ? 'visible' : 'none';
        if (map.getLayer('comm-links-layer')) map.setLayoutProperty('comm-links-layer', 'visibility', visibility);
    },

    toggleCoverageForForest: function (map, forestKey, visible) {
        if (!map) return;

        // First hide all
        this.toggleCoverage(map, false);

        if (!visible) return;

        // Filter and show only this forest's coverage
        const forestNodes = this.nodes[forestKey] || [];

        const coverageFeatures = [];
        forestNodes.forEach(node => {
            const center = turf.point([node.lng, node.lat]);
            const circle = turf.circle(center, node.radius, { units: 'kilometers', steps: 64 });

            coverageFeatures.push({
                type: 'Feature',
                geometry: circle.geometry,
                properties: {
                    id: node.id,
                    forestKey: node.forestKey
                }
            });
        });

        // Update source
        if (map.getSource('comm-coverage')) {
            map.getSource('comm-coverage').setData({ type: 'FeatureCollection', features: coverageFeatures });
        }

        // Show layers
        if (map.getLayer('comm-coverage-layer')) {
            map.setLayoutProperty('comm-coverage-layer', 'visibility', 'visible');
        }
        if (map.getLayer('comm-coverage-outline')) {
            map.setLayoutProperty('comm-coverage-outline', 'visibility', 'visible');
        }

        // Also ensure nodes are visible
        if (map.getLayer('comm-nodes-layer')) {
            map.setLayoutProperty('comm-nodes-layer', 'visibility', 'visible');
        }
    }
};

// Initialize when ready
if (typeof window !== 'undefined') {
    window.COMM_NODES_SYSTEM = COMM_NODES_SYSTEM;
}

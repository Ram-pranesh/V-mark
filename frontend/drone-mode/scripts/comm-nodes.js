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

            // Calculate centroid of the polygon
            const centroid = turf.centroid(polygon);
            const [centLng, centLat] = centroid.geometry.coordinates;
            const [edgeLng, edgeLat] = edgePoint.geometry.coordinates;

            // Move point inward (70-85% from edge towards center)
            const inwardFactor = 0.70 + Math.random() * 0.15;
            const lng = edgeLng + (centLng - edgeLng) * inwardFactor;
            const lat = edgeLat + (centLat - edgeLat) * inwardFactor;

            nodes.push({
                id: `${forestKey.toUpperCase()}-NODE-${String(i + 1).padStart(2, '0')}`,
                forestKey: forestKey,
                lat: lat,
                lng: lng,
                radius: this.coverageRadius,
                status: 'active',
                connections: []
            });
        }

        return nodes;
    },

    // Generate mesh network links
    generateMeshLinks: function (nodes, forestKey) {
        // Connect each node to its neighbors and create a mesh
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            // Connect to next node (circular)
            const nextIdx = (i + 1) % nodes.length;
            const nextNode = nodes[nextIdx];

            this.links.push({
                id: `LINK-${node.id}-${nextNode.id}`,
                from: node.id,
                to: nextNode.id,
                fromCoords: [node.lng, node.lat],
                toCoords: [nextNode.lng, nextNode.lat],
                forestKey: forestKey,
                type: 'primary'
            });

            node.connections.push(nextNode.id);

            // Also connect to node across (for mesh redundancy)
            if (nodes.length >= 6) {
                const acrossIdx = (i + Math.floor(nodes.length / 2)) % nodes.length;
                const acrossNode = nodes[acrossIdx];

                // Only add if distance is reasonable (< 50km)
                const dist = turf.distance(
                    turf.point([node.lng, node.lat]),
                    turf.point([acrossNode.lng, acrossNode.lat]),
                    { units: 'kilometers' }
                );

                if (dist < 50 && !node.connections.includes(acrossNode.id)) {
                    this.links.push({
                        id: `LINK-${node.id}-${acrossNode.id}`,
                        from: node.id,
                        to: acrossNode.id,
                        fromCoords: [node.lng, node.lat],
                        toCoords: [acrossNode.lng, acrossNode.lat],
                        forestKey: forestKey,
                        type: 'secondary'
                    });

                    node.connections.push(acrossNode.id);
                }
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
                type: 'circle',
                source: 'comm-nodes',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#4aa8ff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.9
                },
                layout: {
                    'visibility': 'none'
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
                    'line-color': [
                        'match',
                        ['get', 'type'],
                        'primary', '#4aa8ff',
                        'secondary', '#ff6b35',
                        '#888888'
                    ],
                    'line-width': [
                        'match',
                        ['get', 'type'],
                        'primary', 2,
                        'secondary', 1.5,
                        1
                    ],
                    'line-opacity': 0.6,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'primary', ['literal', [1, 0]],
                        'secondary', ['literal', [2, 2]],
                        ['literal', [1, 0]]
                    ]
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
                    'fill-color': '#4aa8ff',
                    'fill-opacity': 0.1
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
                    'line-color': '#4aa8ff',
                    'line-width': 1,
                    'line-opacity': 0.4,
                    'line-dasharray': [3, 3]
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

    // Forest-specific toggles
    toggleLinksForForest: function (map, forestKey, visible) {
        if (!map) return;

        // First hide all
        this.toggleLinks(map, false);

        if (!visible) return;

        // Filter and show only this forest's nodes and links
        const forestNodes = this.nodes[forestKey] || [];
        const forestLinks = this.links.filter(link => link.forestKey === forestKey);

        // Create filtered GeoJSON
        const nodeFeatures = forestNodes.map(node => ({
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
        }));

        const linkFeatures = forestLinks.map(link => ({
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

        // Update sources
        if (map.getSource('comm-nodes')) {
            map.getSource('comm-nodes').setData({ type: 'FeatureCollection', features: nodeFeatures });
        }
        if (map.getSource('comm-links')) {
            map.getSource('comm-links').setData({ type: 'FeatureCollection', features: linkFeatures });
        }

        // Show layers
        if (map.getLayer('comm-links-layer')) {
            map.setLayoutProperty('comm-links-layer', 'visibility', 'visible');
        }
        if (map.getLayer('comm-nodes-layer')) {
            map.setLayoutProperty('comm-nodes-layer', 'visibility', 'visible');
        }
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

        // Also show nodes
        this.toggleLinksForForest(map, forestKey, true);
    }
};

// Initialize when ready
if (typeof window !== 'undefined') {
    window.COMM_NODES_SYSTEM = COMM_NODES_SYSTEM;
}

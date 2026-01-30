(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  function setMapView(mode) {
    const overlays = [
      "osm-roads",
      "contours-layer",
      "terrain-hillshade",
      "contours",
      "contour-text",
      "hills", // New hillshade layer
      "country-borders",
      "state-borders",
      "state-fills",
      "state-labels"
    ];

    overlays.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    });

    if (mode === "roadmap") {
      map.setLayoutProperty("osm-roads", "visibility", "visible");
      map.setTerrain(null); // Flatten for roadmap
    } else if (mode === "contours") {
      // Restore original colorful raster contours (OpenTopoMap)
      map.setLayoutProperty("contours-layer", "visibility", "visible");
      // Enable 3D terrain for "globe" feel
      map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });

    } else if (mode === "satellite") {
      // Restore satellite base and 3D terrain
      if (map.getLayer("satellite")) map.setLayoutProperty("satellite", "visibility", "visible");
      map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });

      // Re-enable boundaries if Sentinel-2 is active
      const sentinel = document.getElementById('sat-sentinel');
      if (sentinel && sentinel.checked) {
        // Ensure Sentinel is visible
        if (map.getLayer("sentinel-2")) map.setLayoutProperty("sentinel-2", "visibility", "visible");
        if (map.getLayer("satellite")) map.setLayoutProperty("satellite", "visibility", "none");

        ['country-borders', 'state-borders', 'state-fills', 'state-labels'].forEach(id => {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
        });
      } else {
        // Default arcgis/satellite
        if (map.getLayer("sentinel-2")) map.setLayoutProperty("sentinel-2", "visibility", "none");
      }
    }

    // --- CRITICAL FIX: Ensure Fire API Layers stay on top ---
    // Raster overlays (Roadmap/Contours) can occlude points if they are higher in the stack.
    // We force the fire points to the very top after every switch.
    if (map.getLayer('fire-glow')) map.moveLayer('fire-glow');
    if (map.getLayer('fire-points')) map.moveLayer('fire-points');
  }

  window.setMapView = setMapView;

  const mapSelectorContainer = document.createElement("div");
  mapSelectorContainer.className = "floating-map-selector";
  Object.assign(mapSelectorContainer.style, {
    position: "absolute",
    top: "15px",
    right: "180px",
    zIndex: 10,
    background: "#ffffff",
    border: "1px solid #ffffff",
    borderRadius: "20px",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    color: "#000000"
  });
  // Enforce 3D Globe mode
  map.setProjection({ type: "globe" });
  map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });
  map.easeTo({ pitch: 0 });
  document.body.appendChild(mapSelectorContainer);

  /* Removed mapIcon image code */
  const mapIcon = document.createElement("span");
  mapIcon.className = "material-symbols-rounded";
  mapIcon.textContent = "layers"; // Google "Stacks" icon equivalent
  Object.assign(mapIcon.style, {
    fontSize: "24px",
    color: "#ff6b35",
    marginRight: "6px"
  });
  mapSelectorContainer.appendChild(mapIcon);

  const labelSpan = document.createElement("span");
  labelSpan.textContent = "Layers";
  labelSpan.style.marginRight = "8px";
  labelSpan.style.fontSize = "13px";
  labelSpan.style.fontWeight = "600";
  mapSelectorContainer.appendChild(labelSpan);

  const mapSelect = document.createElement("select");
  Object.assign(mapSelect.style, {
    border: "1px solid #ff6b35",
    outline: "none",
    fontSize: "13px",
    cursor: "pointer",
    background: "#222",
    color: "#fff",
    padding: "4px",
    borderRadius: "4px",
    width: "auto", // Auto width to fit content
    minWidth: "100px"
  });

  // Apply container styles for the theme
  Object.assign(mapSelectorContainer.style, {
    background: "#222",
    border: "1px solid #444",
    color: "#fff"
  });

  const options = [
    { val: "satellite", text: "Satellite" },
    { val: "roadmap", text: "Roadmap" },
    { val: "contours", text: "Terrain" },
    // "below that there are all three layers" - Listing them clearly
  ];

  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = opt.val;
    el.innerText = opt.text;
    mapSelect.appendChild(el);
  });

  mapSelectorContainer.appendChild(mapSelect);

  mapSelect.onchange = () => {
    setMapView(mapSelect.value);
    if (window.syncFireVisibility) window.syncFireVisibility();
  };

  window.mapSelect = mapSelect;

  setMapView("satellite");
})();

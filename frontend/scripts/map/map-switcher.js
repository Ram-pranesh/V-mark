(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  function setMapView(mode) {
    const overlays = ["osm-roads", "contours-layer", "terrain-hillshade"];
    overlays.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    });

    if (mode === "roadmap") {
      map.setLayoutProperty("osm-roads", "visibility", "visible");
    } else if (mode === "contours") {
      map.setLayoutProperty("contours-layer", "visibility", "visible");
    }
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

  const mapIcon = document.createElement("img");
  mapIcon.src = "./assets/img/image.png"; // User provided transparent image
  mapIcon.style.width = "24px";
  mapIcon.style.height = "24px";
  mapIcon.style.objectFit = "cover";
  mapIcon.style.borderRadius = "4px";
  mapIcon.style.marginRight = "6px";
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

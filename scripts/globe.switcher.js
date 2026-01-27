(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  function setMapView(mode) {
    const overlays = ["osm-roads", "contours-layer"];
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
  document.body.appendChild(mapSelectorContainer);

  const mapIcon = document.createElement("img");
  mapIcon.src = "map icon.png";
  mapIcon.style.width = "24px";
  mapIcon.style.height = "24px";
  mapIcon.style.objectFit = "cover";
  mapIcon.style.borderRadius = "4px";
  mapIcon.style.marginRight = "10px";
  mapSelectorContainer.appendChild(mapIcon);

  const mapSelect = document.createElement("select");
  Object.assign(mapSelect.style, {
    border: "none",
    outline: "none",
    fontSize: "13px",
    cursor: "pointer",
    background: "transparent",
    color: "black"
  });

  const options = [
    { val: "satellite", text: "Satellite" },
    { val: "roadmap", text: "Roadmap Overlay" },
    { val: "contours", text: "Terrain Contours" },
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
  };

  window.mapSelect = mapSelect;

  setMapView("satellite");
})();

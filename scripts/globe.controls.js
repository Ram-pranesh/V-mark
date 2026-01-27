(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");
  // 2D/3D Toggle

  let is3D = true;

  const toggleContainer = document.createElement("div");
  toggleContainer.className = "floating-terrain-toggle";
  Object.assign(toggleContainer.style, {
    position: "absolute",
    top: "15px",
    right: "90px",
    zIndex: 10,
    padding: "6px 10px",
    background: "blshite",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  });

  const toggleSwitch = document.createElement("label");
  toggleSwitch.className = "toggle-switch";

  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.checked = true;
  toggleInput.setAttribute("aria-label", "Toggle 2D/3D");

  const toggleSlider = document.createElement("span");
  toggleSlider.className = "toggle-slider";
  toggleSlider.dataset.label = "3D";

  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);

  toggleContainer.appendChild(toggleSwitch);
  document.body.appendChild(toggleContainer);

  const setMode = (enable3D) => {
    if (enable3D) {
      map.setProjection({ type: "globe" });
      map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });
      map.easeTo({ pitch: 0 });
    } else {
      map.setTerrain(null);
      map.setProjection({ type: "mercator" });
      map.easeTo({ pitch: 0, bearing: 0 });
    }
    is3D = enable3D;
  };

  setMode(true);

  toggleInput.addEventListener("change", () => {
    setMode(toggleInput.checked);
    toggleSlider.dataset.label = toggleInput.checked ? "3D" : "2D";
  });
})();

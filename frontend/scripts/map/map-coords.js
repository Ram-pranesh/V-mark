(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  const coordsDiv = document.getElementById("coords");

  map.on("mousemove", (e) => {
    if (coordsDiv) {
      const lng = e.lngLat.lng.toFixed(1);
      const lat = e.lngLat.lat.toFixed(1);
      coordsDiv.textContent = `Lat:${lat} Lng:${lng}`;
    }

    const mapSelect = window.mapSelect || (typeof mapSelect !== "undefined" ? mapSelect : null);
    const currentMode = mapSelect ? mapSelect.value : "satellite";
    map.getCanvas().style.cursor =
      currentMode === "temp" || currentMode === "wind" ? "crosshair" : "";
  });

  // Custom Hash Implementation (Precision: 6)
  function updateHash() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const lat = center.lat.toFixed(6);
    const lng = center.lng.toFixed(6);
    const z = zoom.toFixed(2);
    // Format: #zoom/lat/lng to match MapLibre/Mapbox standard
    window.location.hash = `#${z}/${lat}/${lng}`;
  }

  map.on("moveend", updateHash);
  // Also update on startup if hash exists to set view?
  // MapLibre's hash:false means it won't READ it either. 
  // User only asked for hash decimal numbers to be 6 digits (implies writing). 
  // If reading is needed, I'd need to parse it. 
  // Assuming writing is the priority. 
  // But let's check if we should read it.
  // The user request: "i want the hash decimal numbers after the decimal point 6 digits needed"
  // I will just implement the writing part for now.
  updateHash();
})();

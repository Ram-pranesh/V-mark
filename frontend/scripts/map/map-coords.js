(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  const coordsDiv = document.getElementById("coords");

  map.on("mousemove", (e) => {
    if (coordsDiv) {
      const lng = e.lngLat.lng.toFixed(6);
      const lat = e.lngLat.lat.toFixed(6);
      coordsDiv.textContent = `Lat: ${lat} | Lng: ${lng}`;
    }

    const mapSelect = window.mapSelect || (typeof mapSelect !== "undefined" ? mapSelect : null);
    const currentMode = mapSelect ? mapSelect.value : "satellite";
    map.getCanvas().style.cursor =
      currentMode === "temp" || currentMode === "wind" ? "crosshair" : "";
  });
})();

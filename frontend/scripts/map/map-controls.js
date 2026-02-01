(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  // Add standard controls
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");

  // Sidebar tool integration
  const measureBtn = document.getElementById("sidebar-measure-btn");
  const routeBtn = document.getElementById("sidebar-route-btn");
  const resetBtn = document.getElementById("sidebar-reset-btn");
  const measureInfo = document.getElementById("sidebar-measure-info");
  const routeInfo = document.getElementById("sidebar-route-info");

  // Sources/layers setup
  if (!map.getSource("measure-geo")) {
    map.addSource("measure-geo", { type: "geojson", data: emptyFeatureCollection() });
    map.addLayer({ id: "measure-fill", type: "fill", source: "measure-geo", paint: { "fill-color": "#00ffc3", "fill-opacity": 0.18 }, layout: { visibility: "none" } });
    map.addLayer({ id: "measure-outline", type: "line", source: "measure-geo", paint: { "line-color": "#00ffc3", "line-width": 2.5 }, layout: { visibility: "none" } });
    map.addLayer({ id: "measure-points", type: "circle", source: "measure-geo", paint: { "circle-radius": 4, "circle-color": "#00ffc3", "circle-stroke-color": "#002c24", "circle-stroke-width": 1.5 }, layout: { visibility: "none" } });
  }
  if (!map.getSource("route-geo")) {
    map.addSource("route-geo", { type: "geojson", data: emptyFeatureCollection() });
    map.addLayer({ id: "route-line", type: "line", source: "route-geo", paint: { "line-color": "#4aa8ff", "line-width": 4, "line-opacity": 0.9 }, layout: { visibility: "none" } });
  }

  // --- RESET LOGIC (Now correctly inside the scope) ---
  let currentPopup = null;
  function removePopup() {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  }

  function resetMeasure() {
    measurePts = [];
    updateMeasure(false);
    removePopup();
    ["measure-fill", "measure-outline", "measure-points"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    });
    // Sidebar info removal - element logic kept minimal or removed as requested
    if (measureInfo) measureInfo.style.display = "none";
  }

  function resetRoute() {
    routePts = [];
    clearRouteMarkers();
    closeGhost();
    removePopup();
    if (map.getSource("route-geo")) {
      map.getSource("route-geo").setData(emptyFeatureCollection());
    }
    if (map.getLayer("route-line")) {
      map.setLayoutProperty("route-line", "visibility", "none");
    }
    if (routeInfo) routeInfo.style.display = "none";
  }

  function resetAllDrawings() {
    // Stop tools first so they don't try to add points after reset
    stopMeasure();
    stopRoute();

    // Clear the data and layers
    resetMeasure();
    resetRoute();
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllDrawings);
  }
  // --- END RESET LOGIC ---


  // Measure logic
  let measuring = false;
  let measurePts = [];
  let measureClosed = false;
  const closeThreshPx = 18;
  const onMeasureClick = (e) => {
    const pt = [e.lngLat.lng, e.lngLat.lat];
    if (measurePts.length >= 2) {
      const first = measurePts[0];
      const distPx = pointDistancePx(first, pt, map);
      if (distPx <= closeThreshPx) {
        measurePts.push(first); // Close the loop
        measureClosed = true;
        updateMeasure(true);
        stopMeasure();
        return;
      }
    }
    measurePts.push(pt);
    measureClosed = false;
    updateMeasure(false);
  };

  function updateMeasure(closed) {
    const fc = emptyFeatureCollection();

    // Logic: First point red, rest green.
    // If closed, first point becomes green (loop closed).

    // Add points
    measurePts.forEach((p, i) => {
      let color = "#00ff00"; // Default green
      if (i === 0 && !closed) {
        color = "#ff3333"; // First point red until closed
      }
      fc.features.push({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: { color } });
    });

    // Add lines
    if (measurePts.length >= 2) {
      const lineCoords = measurePts.slice();
      fc.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: lineCoords }, properties: {} });

      // If closed, add polygon fill
      if (closed && lineCoords.length >= 4) { // 3 points + closing point = 4
        fc.features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [lineCoords] }, properties: {} });
      }
    }

    let labelText = "";
    let isPolygon = false;
    let distOrArea = "";

    // Calculate Data
    if (measurePts.length >= 2) {
      if (closed && measurePts.length >= 4) {
        isPolygon = true;
        const areaSqM = polygonAreaSqMeters(measurePts);
        distOrArea = areaSqM > 1e6 ? `${(areaSqM / 1e6).toFixed(2)} km²` : `${areaSqM.toFixed(0)} m²`;
        labelText = `Area: <b>${distOrArea}</b>`;
      } else {
        // For line (2 points or more but not closed) - User said "when there are only two points don't mention it as area mention it as distance"
        // actually calculate distance for open line too
        const distM = lineLengthMeters(measurePts);
        distOrArea = distM > 1000 ? `${(distM / 1000).toFixed(2)} km` : `${distM.toFixed(0)} m`;
        labelText = `Distance: <b>${distOrArea}</b>`;
      }
    }

    // Show Popup if we have meaningful data (Line > 0 length or Polygon)
    if (measurePts.length >= 2) {
      // Fetch Weather
      const lastPt = measurePts[measurePts.length - 1];

      // Calculate Active Hotspots
      let multiplier = 1;
      let activeHotspots = 0;
      if (closed && measurePts.length >= 4) {
        // Check fires in polygon
        const fireSource = map.getSource('fire-source');
        if (fireSource && fireSource._data && fireSource._data.features) {
          const poly = measurePts; // Loop coords
          activeHotspots = fireSource._data.features.filter(f => {
            return isPointInPolygon(f.geometry.coordinates, poly);
          }).length;
        }
      }

      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lastPt[1]}&longitude=${lastPt[0]}&current=temperature_2m`)
        .then(r => r.json())
        .then(d => {
          const temp = (d.current && d.current.temperature_2m !== undefined) ? Math.round(d.current.temperature_2m) : "--";

          let content = `<div style="font-family:'Segoe UI',sans-serif; color:#111; padding:6px; min-width:140px;">`;
          content += `<div style="font-size:14px; font-weight:bold; margin-bottom:4px; border-bottom:1px solid #ccc; padding-bottom:4px;">Measurement</div>`;
          content += `<div style="font-size:13px; margin-bottom:2px;">${labelText}</div>`;
          content += `<div style="font-size:13px; color:#333; margin-bottom:2px;">Avg Temp: <b>${temp}°C</b></div>`;
          if (closed) {
            content += `<div style="font-size:13px; color:#d83b3b;">Active Hotspots: <b>${activeHotspots}</b></div>`;
          }
          content += `</div>`;

          // Only recreate popup if it doesn't exist or content changed significantly? 
          // Actually, just updating it is safer to avoid flicker.
          if (currentPopup) {
            currentPopup.setLngLat(lastPt).setHTML(content);
          } else {
            currentPopup = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: false,
              className: 'tool-popup',
              anchor: 'bottom', // Show above the point
              offset: [0, -10]
            })
              .setLngLat(lastPt)
              .setHTML(content)
              .addTo(map);
            currentPopup.on('close', () => { currentPopup = null; });
          }
        })
        .catch(e => {
          console.error("Weather fetch failed", e);
          // Show popup without weather if it fails
          let content = `<div style="font-family:'Segoe UI',sans-serif; color:#111; padding:6px; min-width:140px;">` +
            `<div style="font-size:14px; font-weight:bold; margin-bottom:4px; border-bottom:1px solid #ccc; padding-bottom:4px;">Measurement</div>` +
            `<div style="font-size:13px; margin-bottom:2px;">${labelText}</div>` +
            `<div style="font-size:13px; color:#333; margin-bottom:2px;">Avg Temp: <b>--</b></div>` +
            (closed ? `<div style="font-size:13px; color:#d83b3b;">Active Hotspots: <b>${activeHotspots}</b></div>` : "") +
            `</div>`;
          if (currentPopup) {
            currentPopup.setLngLat(lastPt).setHTML(content);
          } else {
            currentPopup = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: false,
              className: 'tool-popup',
              anchor: 'bottom', // Show above the point
              offset: [0, -10]
            })
              .setLngLat(lastPt)
              .setHTML(content)
              .addTo(map);
            currentPopup.on('close', () => { currentPopup = null; });
          }
        });
    } else {
      removePopup();
    }

    // Sidebar clear (keep hidden)
    if (measureInfo) measureInfo.style.display = "none";

    // Style points by color property
    map.getSource("measure-geo").setData(fc);

    // Ensure paint property uses data-driven color
    if (map.getLayer("measure-points")) {
      map.setPaintProperty("measure-points", "circle-color", ["get", "color"]);
      map.setPaintProperty("measure-points", "circle-stroke-color", "#ffffff"); // White stroke for visibility
    }
    const visibility = measurePts.length ? "visible" : "none";
    ["measure-fill", "measure-outline", "measure-points"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    });
  }

  // Helper: Point in Polygon
  function isPointInPolygon(pt, polygon) {
    let x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i][0], yi = polygon[i][1];
      let xj = polygon[j][0], yj = polygon[j][1];
      let intersect = ((yi > y) != (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function stopMeasure() {
    measuring = false;
    if (measureBtn) measureBtn.classList.remove("active");
    // Do NOT clear data here, just stop interaction
    map.getCanvas().style.cursor = "";
    map.off("click", onMeasureClick);
  }


  function toggleMeasure() {
    if (measuring) {
      resetMeasure(); // Reset if clicked while active? User said "when it is cllicked ... it should show like it is on". 
      // Usually toggle off means cancel. But "Reset" button exists now.
      // Let's stick to toggle behavior but clear previous if starting new.
      return;
    }
    // If we have old data, clear it when starting new
    if (measurePts.length > 0) resetMeasure();

    measuring = true;
    window.measuring = true;
    if (measureBtn) measureBtn.classList.add("active");
    map.getCanvas().style.cursor = "crosshair";
    map.on("click", onMeasureClick);
    stopRoute();
  }

  // Sidebar measure button: hover shows tooltip, click toggles
  if (measureBtn) {
    let tooltipDiv;
    measureBtn.addEventListener("mouseenter", () => {
      tooltipDiv = document.createElement("div");
      tooltipDiv.textContent = "Measure area";
      tooltipDiv.className = "sidebar-measure-tooltip";
      tooltipDiv.style.position = "absolute";
      tooltipDiv.style.left = measureBtn.getBoundingClientRect().right + 8 + "px";
      tooltipDiv.style.top = measureBtn.getBoundingClientRect().top + "px";
      tooltipDiv.style.background = "#222";
      tooltipDiv.style.color = "#fff";
      tooltipDiv.style.padding = "6px 12px";
      tooltipDiv.style.borderRadius = "8px";
      tooltipDiv.style.fontSize = "13px";
      tooltipDiv.style.zIndex = 99999;
      tooltipDiv.style.pointerEvents = "none";
      document.body.appendChild(tooltipDiv);
    });
    measureBtn.addEventListener("mouseleave", () => {
      if (tooltipDiv) { tooltipDiv.remove(); tooltipDiv = null; }
    });
    measureBtn.addEventListener("click", toggleMeasure);
  }

  // Route logic
  let routing = false;
  let routePts = [];
  let ghostMarker = null;
  let startMarker = null;
  let endMarker = null;
  const closeGhost = () => { if (ghostMarker) { ghostMarker.remove(); ghostMarker = null; } };
  const clearRouteMarkers = () => { if (startMarker) startMarker.remove(); if (endMarker) endMarker.remove(); startMarker = endMarker = null; };

  const onRouteMove = (e) => {
    if (!routing) return;
    const stage = routePts.length === 0 ? "Start" : "End";
    const color = stage === "Start" ? "#0fa958" : "#d83b3b";
    if (!ghostMarker) ghostMarker = markerBadge(stage, color);
    updateBadge(ghostMarker, stage, color);
    ghostMarker.setLngLat(e.lngLat).addTo(map);
  };

  const onRouteClick = (e) => {
    if (!routing) return;
    const pt = [e.lngLat.lng, e.lngLat.lat];
    if (routePts.length === 0) {
      routePts.push(pt);
      if (startMarker) startMarker.remove();
      startMarker = markerBadge("Start", "#0fa958");
      startMarker.setLngLat(pt).addTo(map);
      // User said "dont want any text to appear" for measure, assume same for route info until done or minimal?
      // But route needs instructions "Pick end point". 
      // User said: "then the data needs to appear... and dist between two points".
      // Let's keep minimal or no text until done.
      if (routeInfo) {
        routeInfo.style.display = "none";
      }
      closeGhost();
      ghostMarker = markerBadge("End", "#d83b3b");
      ghostMarker.setLngLat(e.lngLat).addTo(map);
    } else if (routePts.length === 1) {
      routePts.push(pt);
      if (endMarker) endMarker.remove();
      endMarker = markerBadge("End", "#d83b3b");
      endMarker.setLngLat(pt).addTo(map);
      routing = false;
      if (routeBtn) routeBtn.classList.remove("active");
      map.getCanvas().style.cursor = "";
      map.off("mousemove", onRouteMove);
      map.off("click", onRouteClick);
      closeGhost();
      fetchRoute(routePts[0], routePts[1]);
    }
  };

  function fetchRoute(start, end) {
    if (routeInfo) {
      routeInfo.style.display = "none"; // Ensure sidebar is hidden
    }

    // Update marker badges
    updateBadge(startMarker, `Start: ${start[1].toFixed(4)}, ${start[0].toFixed(4)}`, "#0fa958");
    updateBadge(endMarker, `End: ${end[1].toFixed(4)}, ${end[0].toFixed(4)}`, "#d83b3b");

    map.setLayoutProperty("route-line", "visibility", "none");
    map.getSource("route-geo").setData(emptyFeatureCollection());

    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes || !data.routes.length) throw new Error("No route");

        const route = data.routes[0];
        const coords = route.geometry.coordinates;
        map.getSource("route-geo").setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] });
        map.setLayoutProperty("route-line", "visibility", "visible");

        // Calculate metrics
        const distKm = (route.distance / 1000).toFixed(2);
        const durMin = (route.duration / 60).toFixed(0);

        // Show Popup on Map
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];

        const content = `
             <div style="font-family:'Segoe UI',sans-serif; color:#111; padding:6px; min-width:160px;">
               <div style="font-size:14px; font-weight:bold; margin-bottom:4px; border-bottom:1px solid #ccc; padding-bottom:4px; text-align:center;">Route Details</div>
               <div style="font-size:12px; margin-bottom:2px;"><b>Start:</b> ${start[1].toFixed(5)}, ${start[0].toFixed(5)}</div>
               <div style="font-size:12px; margin-bottom:2px;"><b>End:</b> ${end[1].toFixed(5)}, ${end[0].toFixed(5)}</div>
               <hr style="margin:4px 0; border:0; border-top:1px solid #ddd;">
               <div style="font-size:13px;">Distance: <b>${distKm} km</b></div>
             </div>
           `;

        removePopup();
        currentPopup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'tool-popup',
          anchor: 'bottom', // Show above the point
          offset: [0, -10]
        })
          .setLngLat(midPt)
          .setHTML(content)
          .addTo(map);

        currentPopup.on('close', () => { currentPopup = null; });

        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 80 });
      })
      .catch(() => {
        // Show error on map
        removePopup();
        currentPopup = new maplibregl.Popup({
          closeButton: true,
          className: 'tool-popup',
          anchor: 'bottom', // Show above the point
          offset: [0, -10]
        })
          .setLngLat(end) // Show at end point
          .setHTML(`<div style="color:red; padding:5px;"><b>Route Unavailable</b><br>Could not calculate path in this area.</div>`)
          .addTo(map);
      });
  }

  function toggleRoute() {
    if (routing) {
      resetRoute();
      return;
    }
    // Clear old if starting new
    if (routePts.length > 0 || map.getSource("route-geo")._data.features.length > 0) resetRoute();

    routing = true;
    window.routing = true;
    if (routeBtn) routeBtn.classList.add("active");
    map.getCanvas().style.cursor = "crosshair";
    stopMeasure();
    map.on("mousemove", onRouteMove);
    map.on("click", onRouteClick);
  }

  if (routeBtn) routeBtn.addEventListener("click", toggleRoute);

  function stopRoute() {
    routing = false;
    routePts = [];
    clearRouteMarkers();
    closeGhost();
    if (routeBtn) routeBtn.classList.remove("active");

    map.getCanvas().style.cursor = "";
    map.off("mousemove", onRouteMove);
    map.off("click", onRouteClick);

    // Note: We do NOT clear the route line here, so users can see the result.
    // The line is only cleared on 'resetRoute' or 'resetAllDrawings'.
  }

  function styleBtn(btn) {
    btn.style.background = "linear-gradient(135deg, #10131c, #0c0f17)";
    btn.style.color = "#f5f7fb";
    btn.style.border = "1px solid #2c3342";
    btn.style.borderRadius = "12px";
    btn.style.width = "46px";
    btn.style.height = "46px";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0";
    btn.style.fontSize = "22px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
    btn.style.transition = "background 0.15s, border 0.15s, transform 0.1s";
    btn.onmouseenter = () => { btn.style.transform = "translateY(-1px)"; btn.style.borderColor = "#4aa8ff"; };
    btn.onmouseleave = () => { btn.style.transform = ""; btn.style.borderColor = btn.dataset.active === "1" ? "#4aa8ff" : "#2c3342"; };
  }

  function setActive(btn, active) {
    btn.dataset.active = active ? "1" : "0";
    btn.style.background = active ? "linear-gradient(135deg, #182235, #0f1829)" : "linear-gradient(135deg, #10131c, #0c0f17)";
    btn.style.borderColor = active ? "#4aa8ff" : "#2c3342";
  }

  function createIconButton(iconName, defaultTooltip) {
    const holder = document.createElement("div");
    holder.style.position = "relative";
    holder.style.display = "inline-flex";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<span class="material-symbols-rounded">${iconName}</span>`;
    btn.setAttribute("aria-label", defaultTooltip);
    styleBtn(btn);

    const tooltip = document.createElement("div");
    tooltip.className = "ctrl-tooltip";
    tooltip.textContent = defaultTooltip;
    Object.assign(tooltip.style, {
      position: "absolute",
      top: "100%",
      right: "0",
      marginTop: "6px",
      background: "rgba(12,15,23,0.95)",
      color: "#f5f7fb",
      padding: "8px 10px",
      border: "1px solid #2c3342",
      borderRadius: "10px",
      fontSize: "11px",
      lineHeight: "1.4",
      boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
      maxWidth: "220px",
      opacity: "0",
      pointerEvents: "none",
      transform: "translateY(6px)",
      transition: "opacity 0.15s ease, transform 0.15s ease"
    });

    holder.appendChild(btn);
    holder.appendChild(tooltip);

    holder.addEventListener("mouseenter", () => showTooltip(tooltip));
    holder.addEventListener("mouseleave", () => hideTooltip(tooltip));

    return { wrap: holder, btn, tooltip };
  }

  function showTooltip(el) {
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
    el.style.transform = "translateY(0)";
  }

  function hideTooltip(el) {
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.transform = "translateY(6px)";
  }

  function emptyFeatureCollection() {
    return { type: "FeatureCollection", features: [] };
  }

  function pointFeature(pt) {
    return { type: "Feature", geometry: { type: "Point", coordinates: pt }, properties: {} };
  }

  function pointDistancePx(a, b, mapInstance) {
    const pa = mapInstance.project(new maplibregl.LngLat(a[0], a[1]));
    const pb = mapInstance.project(new maplibregl.LngLat(b[0], b[1]));
    const dx = pa.x - pb.x;
    const dy = pa.y - pb.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function lineLengthMeters(coords) {
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      total += haversine(coords[i], coords[i + 1]);
    }
    return total;
  }

  function haversine(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6378137;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function markerBadge(text, color) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.background = color;
    el.style.color = "#fff";
    el.style.padding = "3px 6px";
    el.style.borderRadius = "6px";
    el.style.fontSize = "11px";
    el.style.fontWeight = "700";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
    return new maplibregl.Marker({ element: el, anchor: "bottom" });
  }

  function updateBadge(marker, text, color) {
    if (!marker) return;
    const el = marker.getElement();
    el.textContent = text;
    el.style.background = color;
  }

  // Spherical polygon area (GeoJSON ring in lon/lat)
  function polygonAreaSqMeters(coords) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6378137;
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
    }
    return Math.abs((area * R * R) / 2);
  }

  // Search Bar with Enhanced Autocomplete
  const searchContainer = document.createElement("div");
  Object.assign(searchContainer.style, {
    position: "absolute",
    top: "15px",
    right: "390px",
    zIndex: 10,
    background: "#222",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    height: "32px",
    border: "1px solid #ff6b35",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
  });

  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search location, fire station, forest office...";
  Object.assign(searchInput.style, {
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "13px",
    width: "200px",
    outline: "none",
    fontFamily: "inherit"
  });

  const searchBtn = document.createElement("span");
  searchBtn.className = "material-icons-round";
  searchBtn.textContent = "search";
  Object.assign(searchBtn.style, {
    color: "#ff6b35",
    cursor: "pointer",
    fontSize: "18px",
    marginLeft: "4px"
  });

  // Autocomplete dropdown
  const suggestionsDropdown = document.createElement("div");
  Object.assign(suggestionsDropdown.style, {
    position: "absolute",
    top: "38px",
    left: "0",
    width: "300px",
    maxHeight: "300px",
    overflowY: "auto",
    background: "#1a1a1a",
    border: "1px solid #ff6b35",
    borderRadius: "8px",
    display: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    zIndex: 1000
  });

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchBtn);
  searchContainer.appendChild(suggestionsDropdown);
  document.body.appendChild(searchContainer);

  // Fire Stations and Forest Offices Database (India - Comprehensive)
  const fireStations = [
    // Major Cities
    { name: "Mumbai Fire Brigade HQ", state: "Maharashtra", lat: 18.9388, lon: 72.8354, type: "Fire Station" },
    { name: "Delhi Fire Service HQ", state: "Delhi", lat: 28.6139, lon: 77.2090, type: "Fire Station" },
    { name: "Bangalore Fire & Emergency Services", state: "Karnataka", lat: 12.9716, lon: 77.5946, type: "Fire Station" },
    { name: "Chennai Fire Service", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, type: "Fire Station" },
    { name: "Kolkata Fire Brigade", state: "West Bengal", lat: 22.5726, lon: 88.3639, type: "Fire Station" },
    { name: "Hyderabad Fire Department", state: "Telangana", lat: 17.3850, lon: 78.4867, type: "Fire Station" },
    { name: "Pune Fire Brigade", state: "Maharashtra", lat: 18.5204, lon: 73.8567, type: "Fire Station" },
    { name: "Ahmedabad Fire & Emergency Services", state: "Gujarat", lat: 23.0225, lon: 72.5714, type: "Fire Station" },

    // Near Forest Areas
    { name: "Hasanur Fire Station", state: "Tamil Nadu", lat: 11.55, lon: 77.08, type: "Fire Station" },
    { name: "Ooty Fire Station", state: "Tamil Nadu", lat: 11.50, lon: 76.65, type: "Fire Station" },
    { name: "Gundlupet Fire Station", state: "Karnataka", lat: 11.68, lon: 76.35, type: "Fire Station" },
    { name: "Virajpet Fire Station", state: "Karnataka", lat: 12.10, lon: 75.80, type: "Fire Station" },
    { name: "Chalakudy Fire Station", state: "Kerala", lat: 10.30, lon: 76.55, type: "Fire Station" },
    { name: "Nagarjunsagar Fire Station", state: "Andhra Pradesh", lat: 16.30, lon: 79.35, type: "Fire Station" },
    { name: "Achampet Fire Station", state: "Telangana", lat: 16.05, lon: 78.60, type: "Fire Station" },
    { name: "Chandrapur Fire Station", state: "Maharashtra", lat: 20.22, lon: 79.30, type: "Fire Station" },
    { name: "Mandla Fire Station", state: "Madhya Pradesh", lat: 22.30, lon: 80.65, type: "Fire Station" },
    { name: "Bijapur Fire Station", state: "Chhattisgarh", lat: 18.90, lon: 80.40, type: "Fire Station" },
    { name: "Junagadh Fire Station", state: "Gujarat", lat: 21.12, lon: 70.80, type: "Fire Station" },
    { name: "Sawai Madhopur Fire Station", state: "Rajasthan", lat: 26.01, lon: 76.50, type: "Fire Station" },
    { name: "Baripada Fire Station", state: "Odisha", lat: 21.90, lon: 86.35, type: "Fire Station" },
    { name: "Canning Fire Station", state: "West Bengal", lat: 21.85, lon: 88.75, type: "Fire Station" },
    { name: "Bokakhat Fire Station", state: "Assam", lat: 26.58, lon: 93.17, type: "Fire Station" },
    { name: "Ramnagar Fire Station", state: "Uttarakhand", lat: 29.40, lon: 79.10, type: "Fire Station" }
  ];

  const forestOffices = [
    // State HQs
    { name: "Maharashtra Forest Department", state: "Maharashtra", lat: 18.9220, lon: 72.8347, type: "Forest Office" },
    { name: "Karnataka Forest Department", state: "Karnataka", lat: 12.9716, lon: 77.5946, type: "Forest Office" },
    { name: "Tamil Nadu Forest Department", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, type: "Forest Office" },
    { name: "Uttarakhand Forest Department", state: "Uttarakhand", lat: 30.0668, lon: 79.0193, type: "Forest Office" },
    { name: "Madhya Pradesh Forest Department", state: "Madhya Pradesh", lat: 23.2599, lon: 77.4126, type: "Forest Office" },
    { name: "Kerala Forest Department", state: "Kerala", lat: 10.8505, lon: 76.2711, type: "Forest Office" },
    { name: "Himachal Pradesh Forest Department", state: "Himachal Pradesh", lat: 31.1048, lon: 77.1734, type: "Forest Office" },
    { name: "Assam Forest Department", state: "Assam", lat: 26.2006, lon: 92.9376, type: "Forest Office" },
    { name: "West Bengal Forest Department", state: "West Bengal", lat: 22.5726, lon: 88.3639, type: "Forest Office" },
    { name: "Odisha Forest Department", state: "Odisha", lat: 20.9517, lon: 85.0985, type: "Forest Office" },

    // All 16 Forest Divisions from Drone Data
    { name: "Satyamangalam Forest Division", state: "Tamil Nadu", lat: 11.55, lon: 77.08, type: "Forest Office" },
    { name: "Nilgiris North Forest Division", state: "Tamil Nadu", lat: 11.50, lon: 76.65, type: "Forest Office" },
    { name: "Bandipur Forest Division", state: "Karnataka", lat: 11.68, lon: 76.35, type: "Forest Office" },
    { name: "Virajpet Forest Division", state: "Karnataka", lat: 12.10, lon: 75.80, type: "Forest Office" },
    { name: "Vazhachal Forest Division", state: "Kerala", lat: 10.30, lon: 76.55, type: "Forest Office" },
    { name: "Nagarjunsagar Forest Division", state: "Andhra Pradesh", lat: 16.30, lon: 79.35, type: "Forest Office" },
    { name: "Amrabad Forest Division", state: "Telangana", lat: 16.05, lon: 78.60, type: "Forest Office" },
    { name: "Tadoba Forest Division", state: "Maharashtra", lat: 20.22, lon: 79.30, type: "Forest Office" },
    { name: "Kanha Forest Division", state: "Madhya Pradesh", lat: 22.30, lon: 80.65, type: "Forest Office" },
    { name: "Indravati Forest Division", state: "Chhattisgarh", lat: 18.90, lon: 80.40, type: "Forest Office" },
    { name: "Junagadh Forest Division", state: "Gujarat", lat: 21.12, lon: 70.80, type: "Forest Office" },
    { name: "Sawai Madhopur Forest Division", state: "Rajasthan", lat: 26.01, lon: 76.50, type: "Forest Office" },
    { name: "Simlipal Forest Division", state: "Odisha", lat: 21.90, lon: 86.35, type: "Forest Office" },
    { name: "24 Parganas (South) Division", state: "West Bengal", lat: 21.85, lon: 88.75, type: "Forest Office" },
    { name: "Golaghat Forest Division", state: "Assam", lat: 26.58, lon: 93.17, type: "Forest Office" },
    { name: "Ramnagar Forest Division", state: "Uttarakhand", lat: 29.40, lon: 79.10, type: "Forest Office" }
  ];

  let searchTimeout;
  const fetchSuggestions = (query) => {
    if (!query || query.length < 2) {
      suggestionsDropdown.style.display = "none";
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      suggestionsDropdown.innerHTML = "";
      const lowerQuery = query.toLowerCase();
      let hasResults = false;

      // Search Fire Stations
      const matchingFireStations = fireStations.filter(station =>
        station.name.toLowerCase().includes(lowerQuery) ||
        station.state.toLowerCase().includes(lowerQuery)
      );

      // Search Forest Offices
      const matchingForestOffices = forestOffices.filter(office =>
        office.name.toLowerCase().includes(lowerQuery) ||
        office.state.toLowerCase().includes(lowerQuery)
      );

      // Add Fire Stations
      if (matchingFireStations.length > 0) {
        const categoryHeader = document.createElement("div");
        categoryHeader.innerHTML = '<span class="material-icons-round" style="font-size: 14px; margin-right: 6px; vertical-align: middle;">fire_truck</span>Fire Stations';
        Object.assign(categoryHeader.style, {
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: "700",
          color: "#ff6b35",
          background: "#0f0f0f",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center"
        });
        suggestionsDropdown.appendChild(categoryHeader);

        matchingFireStations.slice(0, 3).forEach(station => {
          const item = createSuggestionItem(station.name, station.state, station.type, station.lat, station.lon);
          suggestionsDropdown.appendChild(item);
        });
        hasResults = true;
      }

      // Add Forest Offices
      if (matchingForestOffices.length > 0) {
        const categoryHeader = document.createElement("div");
        categoryHeader.innerHTML = '<span style="margin-right: 6px; display: flex; align-items: center;"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="#00C851"><path d="M200-80v-80h240v-160h-80q-83 0-141.5-58.5T160-520q0-60 33-110.5t89-73.5q9-75 65.5-125.5T480-880q76 0 132.5 50.5T678-704q56 23 89 73.5T800-520q0 83-58.5 141.5T600-320h-80v160h240v80H200Zm160-320h240q50 0 85-35t35-85q0-36-20.5-66T646-630l-42-18-6-46q-6-45-39.5-75.5T480-800q-45 0-78.5 30.5T362-694l-6 46-42 18q-33 14-53.5 44T240-520q0 50 35 85t85 35Zm120-200Z"/></svg></span>Forest Offices';
        Object.assign(categoryHeader.style, {
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: "700",
          color: "#00C851",
          background: "#0f0f0f",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center"
        });
        suggestionsDropdown.appendChild(categoryHeader);

        matchingForestOffices.slice(0, 3).forEach(office => {
          const item = createSuggestionItem(office.name, office.state, office.type, office.lat, office.lon);
          suggestionsDropdown.appendChild(item);
        });
        hasResults = true;
      }

      // Fetch general locations from Nominatim with more details
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            if (hasResults) {
              const categoryHeader = document.createElement("div");
              categoryHeader.innerHTML = '<span style="margin-right: 6px; display: flex; align-items: center;"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="#4aa8ff"><path d="M480-80q-106 0-173-33.5T240-200q0-24 14.5-44.5T295-280l63 59q-9 4-19.5 9T322-200q13 16 60 28t98 12q51 0 98.5-12t60.5-28q-7-8-18-13t-21-9l62-60q28 16 43 36.5t15 45.5q0 53-67 86.5T480-80Zm1-220q99-73 149-146.5T680-594q0-102-65-154t-135-52q-70 0-135 52t-65 154q0 67 49 139.5T481-300Zm-1 100Q339-304 269.5-402T200-594q0-71 25.5-124.5T291-808q40-36 90-54t99-18q49 0 99 18t90 54q40 36 65.5 89.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520Zm0-80Z"/></svg></span>Locations';
              Object.assign(categoryHeader.style, {
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#4aa8ff",
                background: "#0f0f0f",
                borderBottom: "1px solid #333",
                display: "flex",
                alignItems: "center"
              });
              suggestionsDropdown.appendChild(categoryHeader);
            }

            data.forEach(location => {
              const address = location.address || {};
              const state = address.state || "";
              const district = address.state_district || address.county || "";
              const city = address.city || address.town || address.village || "";

              let displayName = location.display_name;
              // Create more specific display with state info
              if (state) {
                const parts = [city, district, state].filter(p => p);
                if (parts.length > 0) {
                  displayName = parts.join(", ");
                }
              }

              const item = createSuggestionItem(
                displayName,
                state || "India",
                location.type || "Location",
                parseFloat(location.lat),
                parseFloat(location.lon)
              );
              suggestionsDropdown.appendChild(item);
            });
            hasResults = true;
          }

          if (hasResults) {
            suggestionsDropdown.style.display = "block";
          } else {
            suggestionsDropdown.style.display = "none";
          }
        })
        .catch(e => {
          console.error(e);
          if (hasResults) {
            suggestionsDropdown.style.display = "block";
          } else {
            suggestionsDropdown.style.display = "none";
          }
        });

      // Show local results immediately if available
      if (hasResults) {
        suggestionsDropdown.style.display = "block";
      }
    }, 300);
  };

  function createSuggestionItem(name, location, type, lat, lon) {
    const suggestionItem = document.createElement("div");
    Object.assign(suggestionItem.style, {
      padding: "8px 12px",
      cursor: "pointer",
      fontSize: "12px",
      color: "#ccc",
      borderBottom: "1px solid #2a2a2a",
      transition: "background 0.2s",
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    });

    const nameDiv = document.createElement("div");
    nameDiv.textContent = name;
    nameDiv.style.fontWeight = "500";
    nameDiv.style.color = "#fff";

    const detailsDiv = document.createElement("div");
    detailsDiv.textContent = `${location} • ${type}`;
    detailsDiv.style.fontSize = "10px";
    detailsDiv.style.color = "#888";

    suggestionItem.appendChild(nameDiv);
    suggestionItem.appendChild(detailsDiv);

    suggestionItem.onmouseenter = () => {
      suggestionItem.style.background = "#2a2a2a";
    };
    suggestionItem.onmouseleave = () => {
      suggestionItem.style.background = "transparent";
    };

    suggestionItem.onclick = () => {
      searchInput.value = name;
      suggestionsDropdown.style.display = "none";
      map.flyTo({
        center: [lon, lat],
        zoom: 14
      });
    };

    return suggestionItem;
  }

  searchInput.oninput = (e) => {
    fetchSuggestions(e.target.value);
  };

  searchInput.onfocus = () => {
    if (searchInput.value.length >= 2) {
      fetchSuggestions(searchInput.value);
    }
  };

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchContainer.contains(e.target)) {
      suggestionsDropdown.style.display = "none";
    }
  });

  const doSearch = () => {
    const q = searchInput.value;
    if (!q) return;
    suggestionsDropdown.style.display = "none";

    // Check local database first
    const allLocations = [...fireStations, ...forestOffices];
    const localMatch = allLocations.find(loc =>
      loc.name.toLowerCase().includes(q.toLowerCase())
    );

    if (localMatch) {
      map.flyTo({
        center: [localMatch.lon, localMatch.lat],
        zoom: 14
      });
      return;
    }

    // Fall back to Nominatim
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          const res = data[0];
          map.flyTo({
            center: [parseFloat(res.lon), parseFloat(res.lat)],
            zoom: 12
          });
        }
      })
      .catch(e => console.error(e));
  };

  searchBtn.onclick = doSearch;
  searchInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      doSearch();
    } else if (e.key === "Escape") {
      suggestionsDropdown.style.display = "none";
    }
  };

  if (typeof StackControl !== 'undefined') {
    map.addControl(new StackControl(), "top-right");
  }

  // 2D/3D Terrain Toggle Slider (Redesigned)
  let is3D = true;

  const toggleContainer = document.createElement("div");
  Object.assign(toggleContainer.style, {
    position: "absolute",
    top: "20px",
    right: "90px", // Between Nav (0-50px) and Sat (180px)
    zIndex: 10,
    background: "#222",
    borderRadius: "20px",
    width: "58px",
    height: "32px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    border: "1px solid #444",
    transition: "background 0.2s"
  });

  const sliderKnob = document.createElement("div");
  Object.assign(sliderKnob.style, {
    width: "20px",
    height: "20px",
    background: "#ff6b35",
    borderRadius: "50%",
    position: "absolute",
    left: "26px", // Default 3D position
    top: "4.5px",
    transition: "left 0.2s ease, background 0.2s ease, transform 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "800",
    color: "#000",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
  });
  sliderKnob.textContent = "3D";

  toggleContainer.appendChild(sliderKnob);

  const setMode = (enable3D) => {
    is3D = enable3D;
    if (enable3D) {
      map.setProjection({ type: "globe" });
      if (map.getSource('terrainSource')) {
        map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });
      }
      map.easeTo({ pitch: 0 }); // Pitch 0 as requested

      // UI Update
      sliderKnob.style.left = "32px";
      sliderKnob.style.background = "#ff6b35";
      sliderKnob.style.color = "#000";
      sliderKnob.textContent = "3D";
      toggleContainer.style.background = "#222";
    } else {
      map.setTerrain(null);
      map.setProjection({ type: "mercator" });
      map.easeTo({ pitch: 0, bearing: 0 });

      // UI Update
      sliderKnob.style.left = "4px";
      sliderKnob.style.background = "#ccc";
      sliderKnob.style.color = "#333";
      sliderKnob.textContent = "2D";
      toggleContainer.style.background = "#111";
    }
  };

  setMode(true); // Init

  toggleContainer.addEventListener("click", () => {
    setMode(!is3D);
  });

  document.body.appendChild(toggleContainer);
})();
(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  // Add standard controls
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");

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
    if (typeof clearRouteArrows === 'function') clearRouteArrows();
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

    // Update marker badges - DISABLE for auto-route to keep clean pins
    // updateBadge(startMarker, `Start: ${start[1].toFixed(4)}, ${start[0].toFixed(4)}`, "#0fa958");
    // updateBadge(endMarker, `End: ${end[1].toFixed(4)}, ${end[0].toFixed(4)}`, "#d83b3b");

    map.setLayoutProperty("route-line", "visibility", "none");
    map.getSource("route-geo").setData(emptyFeatureCollection());

    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes || !data.routes.length) throw new Error("No route");

        const route = data.routes[0];
        const coords = route.geometry.coordinates;
        const steps = route.legs[0].steps;
        
        // Store route data for navigation
        window.routeData = { route, steps, coords, start, end };
        
        map.getSource("route-geo").setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] });
        map.setLayoutProperty("route-line", "visibility", "visible");
        
        // Add direction arrows along the route
        addRouteArrows(coords);

        // Calculate metrics
        const distKm = (route.distance / 1000).toFixed(2);
        const durMin = (route.duration / 60).toFixed(0);
        const durHours = Math.floor(route.duration / 3600);
        const durMins = Math.floor((route.duration % 3600) / 60);
        const timeDisplay = durHours > 0 ? `${durHours}h ${durMins}m` : `${durMins} min`;

        // Show Enhanced Popup on Map
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];

        const content = `
             <div style="font-family:'Inter','Segoe UI',sans-serif; background: linear-gradient(135deg, rgba(15,15,15,0.98), rgba(25,25,35,0.98)); color:#fff; padding:0; min-width:280px; border-radius:12px; overflow:hidden;">
               <div style="background: linear-gradient(135deg, #ff6b35, #ff8c42); padding:16px 20px; display:flex; align-items:center; gap:12px;">
                 <span class="material-icons-round" style="font-size:28px; color:#fff;">navigation</span>
                 <div>
                   <div style="font-size:16px; font-weight:700; color:#fff;">Route Found</div>
                   <div style="font-size:12px; color:rgba(255,255,255,0.9);">${steps.length} steps</div>
                 </div>
               </div>
               
               <div style="padding:16px 20px;">
                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                   <div style="background:rgba(255,107,53,0.1); padding:12px; border-radius:8px; border:1px solid rgba(255,107,53,0.3);">
                     <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Distance</div>
                     <div style="font-size:20px; font-weight:700; color:#ff6b35;">${distKm}<span style="font-size:12px; font-weight:500;"> km</span></div>
                   </div>
                   <div style="background:rgba(74,168,255,0.1); padding:12px; border-radius:8px; border:1px solid rgba(74,168,255,0.3);">
                     <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Duration</div>
                     <div style="font-size:20px; font-weight:700; color:#4aa8ff;">${timeDisplay}</div>
                   </div>
                 </div>
                 
                 <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; margin-bottom:16px;">
                   <div style="font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:6px;">FROM</div>
                   <div style="font-size:12px; color:rgba(255,255,255,0.9); margin-bottom:8px;">${start[1].toFixed(4)}, ${start[0].toFixed(4)}</div>
                   <div style="height:1px; background:rgba(255,255,255,0.1); margin:8px 0;"></div>
                   <div style="font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:6px;">TO</div>
                   <div style="font-size:12px; color:rgba(255,255,255,0.9);">${end[1].toFixed(4)}, ${end[0].toFixed(4)}</div>
                 </div>
                 
                 <button onclick="startNavigation()" style="width:100%; background:linear-gradient(135deg, #0fa958, #0c8a47); color:#fff; border:none; padding:16px; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; box-shadow:0 4px 12px rgba(15,169,88,0.3); font-family:'Inter','Segoe UI',sans-serif;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(15,169,88,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(15,169,88,0.3)';">
                   <span class="material-icons-round" style="font-size:22px;">directions</span>
                   <span>Start Navigation</span>
                 </button>
               </div>
             </div>
           `;

        removePopup();
        currentPopup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'tool-popup route-popup',
          anchor: 'bottom',
          offset: [0, -10],
          maxWidth: '320px'
        })
          .setLngLat(midPt)
          .setHTML(content)
          .addTo(map);

        currentPopup.on('close', () => { currentPopup = null; });

        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 80 });
      })
      .catch((err) => {
        console.error('Route calculation failed:', err);
        
        // Calculate straight-line distance for fallback
        const dx = (end[0] - start[0]) * 111.32 * Math.cos((start[1] * Math.PI) / 180);
        const dy = (end[1] - start[1]) * 111.32;
        const straightDist = Math.sqrt(dx * dx + dy * dy).toFixed(2);
        
        // Show enhanced error with options
        removePopup();
        currentPopup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'tool-popup route-popup',
          anchor: 'bottom',
          offset: [0, -10],
          maxWidth: '340px'
        })
          .setLngLat(end)
          .setHTML(`
            <div style="font-family:'Inter','Segoe UI',sans-serif; background: linear-gradient(135deg, rgba(25,15,15,0.98), rgba(40,20,20,0.98)); color:#fff; padding:0; border-radius:12px; overflow:hidden;">
              <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding:18px 20px; display:flex; align-items:center; gap:12px;">
                <span class="material-icons-round" style="font-size:32px; color:#fff;">error_outline</span>
                <div>
                  <div style="font-size:16px; font-weight:700; color:#fff;">Route Unavailable</div>
                  <div style="font-size:12px; color:rgba(255,255,255,0.9);">No roads found in this area</div>
                </div>
              </div>
              
              <div style="padding:20px;">
                <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; margin-bottom:16px;">
                  <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-bottom:8px;">This might be due to:</div>
                  <div style="font-size:13px; color:#fff; line-height:1.6;">
                    • Remote area with no mapped roads<br>
                    • Ocean or water crossing<br>
                    • Protected wilderness zone
                  </div>
                </div>
                
                <div style="background:rgba(74,168,255,0.1); padding:12px; border-radius:8px; margin-bottom:16px; border:1px solid rgba(74,168,255,0.3);">
                  <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Straight-Line Distance</div>
                  <div style="font-size:20px; font-weight:700; color:#4aa8ff;">${straightDist}<span style="font-size:12px; font-weight:500;"> km</span></div>
                </div>
                
                <button onclick="openGoogleMapsRoute()" style="width:100%; background:linear-gradient(135deg, #4285f4, #3367d6); color:#fff; border:none; padding:14px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; box-shadow:0 4px 12px rgba(66,133,244,0.3); font-family:'Inter','Segoe UI',sans-serif; margin-bottom:10px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(66,133,244,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(66,133,244,0.3)';">
                  <span class="material-icons-round" style="font-size:20px;">map</span>
                  <span>Open in Google Maps</span>
                </button>
                
                <div style="text-align:center; font-size:11px; color:rgba(255,255,255,0.5);">Use external navigation for this route</div>
              </div>
            </div>
          `)
          .addTo(map);
      });
  }

  // Expose for external calls (e.g. from Alert Center)
  // Expose for external calls (e.g. from Alert Center)
  window.calculateRoute = function (start, end) {
    console.log("Calculating Route:", start, end);

    // Ensure start/end are valid arrays
    if (!start || !end || start.length < 2 || end.length < 2) {
      console.error("Invalid route coordinates", start, end);
      return;
    }

    // Reset existing route visual
    resetRoute();

    // Use markerBadge for visible labels
    try {
      if (startMarker) startMarker.remove();
      startMarker = markerBadge("Start", "#0fa958");
      startMarker.setLngLat(start).addTo(map);

      if (endMarker) endMarker.remove();
      endMarker = markerBadge("End", "#d83b3b");
      endMarker.setLngLat(end).addTo(map);

      // Fit bounds immediately so user sees points even if route fails
      const bounds = new maplibregl.LngLatBounds(start, start);
      bounds.extend(end);
      map.fitBounds(bounds, { padding: 100, maxZoom: 14 });
    } catch (err) {
      console.error("Error adding route markers:", err);
    }

    fetchRoute(start, end);
  };

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

  // Add directional arrows along the route
  let routeArrowMarkers = [];
  
  function addRouteArrows(coords) {
    // Clear existing arrows
    routeArrowMarkers.forEach(marker => marker.remove());
    routeArrowMarkers = [];

    // Create animated arrow layer using MapLibre symbols
    if (map.getSource('route-arrows')) {
      map.removeLayer('route-arrows-layer');
      map.removeSource('route-arrows');
    }

    // Create points along the route every 50 coords for animation
    const arrowPoints = [];
    const step = Math.max(10, Math.floor(coords.length / 20)); // About 20 arrows
    
    for (let i = 0; i < coords.length - step; i += step) {
      const start = coords[i];
      const end = coords[i + step];
      
      // Calculate bearing
      const bearing = Math.atan2(end[0] - start[0], end[1] - start[1]) * (180 / Math.PI);
      
      arrowPoints.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: start
        },
        properties: {
          bearing: bearing
        }
      });
    }

    // Add source and layer for animated arrows
    map.addSource('route-arrows', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: arrowPoints
      }
    });

    map.addLayer({
      id: 'route-arrows-layer',
      type: 'symbol',
      source: 'route-arrows',
      layout: {
        'icon-image': 'arrow', // We'll create this programmatically
        'icon-size': 0.6,
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: {
        'icon-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0.6,
          15, 0.9
        ]
      }
    });

    // Animate arrows by updating their positions
    let animationOffset = 0;
    const animateArrows = () => {
      animationOffset = (animationOffset + 1) % step;
      
      const updatedPoints = [];
      for (let i = 0; i < coords.length - step; i += step) {
        const idx = Math.min(i + animationOffset, coords.length - step);
        const start = coords[idx];
        const end = coords[Math.min(idx + step, coords.length - 1)];
        
        const bearing = Math.atan2(end[0] - start[0], end[1] - start[1]) * (180 / Math.PI);
        
        updatedPoints.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: start
          },
          properties: {
            bearing: bearing
          }
        });
      }
      
      if (map.getSource('route-arrows')) {
        map.getSource('route-arrows').setData({
          type: 'FeatureCollection',
          features: updatedPoints
        });
      }
      
      if (window.routeAnimationActive) {
        requestAnimationFrame(animateArrows);
      }
    };
    
    // Create arrow SVG icon
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw arrow
    ctx.fillStyle = '#4aa8ff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.2);
    ctx.lineTo(size * 0.7, size * 0.5);
    ctx.lineTo(size * 0.6, size * 0.5);
    ctx.lineTo(size * 0.6, size * 0.8);
    ctx.lineTo(size * 0.4, size * 0.8);
    ctx.lineTo(size * 0.4, size * 0.5);
    ctx.lineTo(size * 0.3, size * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Add to map as icon
    if (!map.hasImage('arrow')) {
      map.addImage('arrow', canvas);
    }
    
    // Start animation
    window.routeAnimationActive = true;
    requestAnimationFrame(animateArrows);
  }
  
  function clearRouteArrows() {
    window.routeAnimationActive = false;
    routeArrowMarkers.forEach(marker => marker.remove());
    routeArrowMarkers = [];
    
    if (map.getLayer('route-arrows-layer')) {
      map.removeLayer('route-arrows-layer');
    }
    if (map.getSource('route-arrows')) {
      map.removeSource('route-arrows');
    }
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

  // Enhanced Search Bar with Autocomplete
  const searchWrapper = document.createElement("div");
  Object.assign(searchWrapper.style, {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    width: "400px"
  });

  const searchContainer = document.createElement("div");
  Object.assign(searchContainer.style, {
    background: "rgba(15, 15, 15, 0.75)",
    backdropFilter: "blur(20px)",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    height: "48px",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255, 107, 53, 0.2)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  });

  const searchIcon = document.createElement("span");
  searchIcon.className = "material-icons-round";
  searchIcon.textContent = "search";
  Object.assign(searchIcon.style, {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "20px",
    marginRight: "12px",
    transition: "color 0.2s"
  });

  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search places, cities, coordinates...";
  Object.assign(searchInput.style, {
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "14px",
    flex: "1",
    outline: "none",
    fontFamily: "inherit",
    fontWeight: "400"
  });

  const clearBtn = document.createElement("span");
  clearBtn.className = "material-icons-round";
  clearBtn.textContent = "close";
  Object.assign(clearBtn.style, {
    color: "rgba(255, 255, 255, 0.4)",
    cursor: "pointer",
    fontSize: "18px",
    marginLeft: "8px",
    display: "none",
    transition: "all 0.2s"
  });

  const searchBtn = document.createElement("span");
  searchBtn.className = "material-icons-round";
  searchBtn.textContent = "my_location";
  Object.assign(searchBtn.style, {
    color: "#ff6b35",
    cursor: "pointer",
    fontSize: "20px",
    marginLeft: "8px",
    transition: "all 0.2s",
    padding: "4px",
    borderRadius: "8px"
  });

  searchContainer.appendChild(searchIcon);
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(clearBtn);
  searchContainer.appendChild(searchBtn);
  searchWrapper.appendChild(searchContainer);

  // Autocomplete dropdown
  const autocompleteDropdown = document.createElement("div");
  Object.assign(autocompleteDropdown.style, {
    background: "rgba(15, 15, 15, 0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    marginTop: "8px",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
    maxHeight: "320px",
    overflowY: "auto",
    display: "none",
    animation: "fadeIn 0.2s ease-out"
  });

  searchWrapper.appendChild(autocompleteDropdown);
  document.body.appendChild(searchWrapper);

  // Hover effects
  searchContainer.addEventListener("mouseenter", () => {
    searchContainer.style.border = "1px solid rgba(255, 107, 53, 0.4)";
    searchContainer.style.boxShadow = "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 107, 53, 0.3)";
    searchIcon.style.color = "#ff6b35";
  });
  searchContainer.addEventListener("mouseleave", () => {
    if (document.activeElement !== searchInput) {
      searchContainer.style.border = "1px solid rgba(255, 255, 255, 0.15)";
      searchContainer.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255, 107, 53, 0.2)";
      searchIcon.style.color = "rgba(255, 255, 255, 0.5)";
    }
  });

  searchInput.addEventListener("focus", () => {
    searchContainer.style.border = "1px solid rgba(255, 107, 53, 0.5)";
    searchContainer.style.boxShadow = "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 107, 53, 0.4)";
    searchIcon.style.color = "#ff6b35";
  });

  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      searchContainer.style.border = "1px solid rgba(255, 255, 255, 0.15)";
      searchContainer.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255, 107, 53, 0.2)";
      searchIcon.style.color = "rgba(255, 255, 255, 0.5)";
      autocompleteDropdown.style.display = "none";
    }, 200);
  });

  searchBtn.addEventListener("mouseenter", () => {
    searchBtn.style.background = "rgba(255, 107, 53, 0.15)";
    searchBtn.style.transform = "scale(1.1)";
  });
  searchBtn.addEventListener("mouseleave", () => {
    searchBtn.style.background = "transparent";
    searchBtn.style.transform = "scale(1)";
  });

  clearBtn.addEventListener("mouseenter", () => {
    clearBtn.style.color = "#ff6b35";
  });
  clearBtn.addEventListener("mouseleave", () => {
    clearBtn.style.color = "rgba(255, 255, 255, 0.4)";
  });

  // Clear button functionality
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    autocompleteDropdown.style.display = "none";
    searchInput.focus();
  });

  let debounceTimer;
  let selectedIndex = -1;
  let suggestions = [];

  // Debounced autocomplete
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    clearBtn.style.display = query ? "block" : "none";

    if (!query) {
      autocompleteDropdown.style.display = "none";
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  });

  function fetchSuggestions(query) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          suggestions = data;
          displaySuggestions(data);
        } else {
          autocompleteDropdown.style.display = "none";
        }
      })
      .catch(e => console.error(e));
  }

  function displaySuggestions(data) {
    autocompleteDropdown.innerHTML = "";
    selectedIndex = -1;

    data.forEach((item, index) => {
      const suggestionItem = document.createElement("div");
      Object.assign(suggestionItem.style, {
        padding: "14px 18px",
        cursor: "pointer",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        transition: "all 0.2s"
      });

      const icon = document.createElement("span");
      icon.className = "material-icons-round";
      icon.textContent = getPlaceIcon(item.type);
      Object.assign(icon.style, {
        color: "#ff6b35",
        fontSize: "20px",
        flexShrink: "0"
      });

      const textContainer = document.createElement("div");
      Object.assign(textContainer.style, {
        flex: "1",
        overflow: "hidden"
      });

      const title = document.createElement("div");
      title.textContent = item.display_name.split(",")[0];
      Object.assign(title.style, {
        color: "#fff",
        fontSize: "14px",
        fontWeight: "500",
        marginBottom: "4px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      });

      const subtitle = document.createElement("div");
      subtitle.textContent = item.display_name.split(",").slice(1).join(",").trim();
      Object.assign(subtitle.style, {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: "12px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      });

      textContainer.appendChild(title);
      textContainer.appendChild(subtitle);
      suggestionItem.appendChild(icon);
      suggestionItem.appendChild(textContainer);

      suggestionItem.addEventListener("mouseenter", () => {
        suggestionItem.style.background = "rgba(255, 107, 53, 0.1)";
        suggestionItem.style.borderLeft = "3px solid #ff6b35";
        suggestionItem.style.paddingLeft = "15px";
      });

      suggestionItem.addEventListener("mouseleave", () => {
        suggestionItem.style.background = "transparent";
        suggestionItem.style.borderLeft = "none";
        suggestionItem.style.paddingLeft = "18px";
      });

      suggestionItem.addEventListener("click", () => {
        selectSuggestion(item);
      });

      autocompleteDropdown.appendChild(suggestionItem);
    });

    autocompleteDropdown.style.display = "block";
  }

  function getPlaceIcon(type) {
    const iconMap = {
      city: "location_city",
      town: "location_city",
      village: "holiday_village",
      administrative: "public",
      country: "flag",
      state: "map",
      county: "landscape",
      municipality: "home",
      suburb: "home_work",
      neighbourhood: "apartment"
    };
    return iconMap[type] || "place";
  }

  function selectSuggestion(item) {
    searchInput.value = item.display_name.split(",")[0];
    autocompleteDropdown.style.display = "none";
    map.flyTo({
      center: [parseFloat(item.lon), parseFloat(item.lat)],
      zoom: 13,
      duration: 1500,
      essential: true
    });

    // Add marker at selected location
    new maplibregl.Popup({ closeButton: false, offset: 25 })
      .setLngLat([parseFloat(item.lon), parseFloat(item.lat)])
      .setHTML(`<div style="color: #fff; font-size: 13px; font-weight: 500;">${item.display_name.split(",")[0]}</div>`)
      .addTo(map);
  }

  const doSearch = () => {
    const q = searchInput.value.trim();
    if (!q) return;

    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
    } else {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            selectSuggestion(data[0]);
          }
        })
        .catch(e => console.error(e));
    }
  };

  // Keyboard navigation
  searchInput.addEventListener("keydown", (e) => {
    const items = autocompleteDropdown.children;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (autocompleteDropdown.style.display === "block") {
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem(items);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (autocompleteDropdown.style.display === "block") {
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelectedItem(items);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        selectSuggestion(suggestions[selectedIndex]);
      } else {
        doSearch();
      }
    } else if (e.key === "Escape") {
      autocompleteDropdown.style.display = "none";
      selectedIndex = -1;
    }
  });

  function updateSelectedItem(items) {
    Array.from(items).forEach((item, index) => {
      if (index === selectedIndex) {
        item.style.background = "rgba(255, 107, 53, 0.15)";
        item.style.borderLeft = "3px solid #ff6b35";
        item.style.paddingLeft = "15px";
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        item.style.background = "transparent";
        item.style.borderLeft = "none";
        item.style.paddingLeft = "18px";
      }
    });
  }

  searchBtn.onclick = doSearch;

  if (typeof StackControl !== 'undefined') {
    map.addControl(new StackControl(), "top-right");
  }

  // 2D/3D Terrain Toggle Slider (Redesigned)
  let is3D = false;

  const toggleContainer = document.createElement("div");
  Object.assign(toggleContainer.style, {
    position: "absolute",
    top: "20px",
    right: "90px",
    zIndex: 10,
    background: "rgba(15, 15, 15, 0.6)",
    backdropFilter: "blur(12px)",
    borderRadius: "20px",
    width: "60px",
    height: "34px",
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "all 0.2s"
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

  setMode(false); // Init to 2D by default

  toggleContainer.addEventListener("click", () => {
    setMode(!is3D);
  });

  document.body.appendChild(toggleContainer);

  // Navigation System
  let navigationActive = false;
  let currentStepIndex = 0;
  let navigationPanel = null;

  // Google Maps fallback for unavailable routes
  window.openGoogleMapsRoute = function() {
    if (!window.routeData) {
      const start = startMarker ? startMarker.getLngLat() : null;
      const end = endMarker ? endMarker.getLngLat() : null;
      
      if (start && end) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&travelmode=driving`;
        window.open(url, '_blank');
      } else {
        alert('Could not get route coordinates');
      }
    } else {
      const start = window.routeData.start;
      const end = window.routeData.end;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  window.startNavigation = function() {
    if (!window.routeData) {
      alert("No route data available");
      return;
    }

    navigationActive = true;
    currentStepIndex = 0;
    
    // Close route popup
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    // Create navigation panel
    showNavigationPanel();
    updateNavigationStep();
  };

  function showNavigationPanel() {
    if (navigationPanel) {
      navigationPanel.remove();
    }

    navigationPanel = document.createElement('div');
    Object.assign(navigationPanel.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      background: 'rgba(15, 15, 15, 0.98)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      zIndex: '10000',
      padding: '0',
      overflow: 'hidden'
    });

    navigationPanel.innerHTML = `
      <div style="background: linear-gradient(135deg, #0fa958, #0c8a47); padding:20px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:16px; flex:1;">
          <span class="material-icons-round" id="nav-icon" style="font-size:40px; color:#fff;">navigation</span>
          <div style="flex:1;">
            <div id="nav-instruction" style="font-size:18px; font-weight:600; color:#fff; margin-bottom:4px;">Starting navigation...</div>
            <div id="nav-distance" style="font-size:13px; color:rgba(255,255,255,0.8);"></div>
          </div>
        </div>
        <button onclick="stopNavigation()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.2)';">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      
      <div style="padding:20px; display:flex; gap:16px; align-items:center;">
        <button onclick="previousStep()" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:12px; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0;" onmouseover="this.style.background='rgba(255,255,255,0.15)';" onmouseout="this.style.background='rgba(255,255,255,0.1)';">
          <span class="material-icons-round">arrow_back</span>
        </button>
        
        <div style="flex:1; text-align:center;">
          <div id="nav-step-counter" style="font-size:13px; color:rgba(255,255,255,0.6); margin-bottom:8px;"></div>
          <div id="nav-maneuver" style="font-size:15px; color:rgba(255,255,255,0.9);"></div>
        </div>
        
        <button onclick="nextStep()" style="background:rgba(255,107,53,0.8); border:none; color:#fff; padding:12px; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0;" onmouseover="this.style.background='rgba(255,107,53,1)';" onmouseout="this.style.background='rgba(255,107,53,0.8)';">
          <span class="material-icons-round">arrow_forward</span>
        </button>
      </div>
    `;

    document.body.appendChild(navigationPanel);
  }

  function updateNavigationStep() {
    if (!window.routeData || !navigationPanel) return;

    const steps = window.routeData.steps;
    const step = steps[currentStepIndex];

    if (!step) return;

    const instruction = step.maneuver.instruction || "Continue";
    const distance = step.distance > 1000 
      ? `${(step.distance / 1000).toFixed(1)} km`
      : `${Math.round(step.distance)} m`;
    
    const maneuverType = step.maneuver.type;
    const modifier = step.maneuver.modifier || '';

    // Update icon based on maneuver
    let icon = 'navigation';
    if (maneuverType === 'turn') {
      icon = modifier.includes('left') ? 'turn_left' : modifier.includes('right') ? 'turn_right' : 'straight';
    } else if (maneuverType === 'arrive') {
      icon = 'place';
    } else if (maneuverType === 'depart') {
      icon = 'trip_origin';
    } else if (maneuverType.includes('roundabout')) {
      icon = 'roundabout_left';
    }

    document.getElementById('nav-icon').textContent = icon;
    document.getElementById('nav-instruction').textContent = instruction;
    document.getElementById('nav-distance').textContent = `in ${distance}`;
    document.getElementById('nav-step-counter').textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
    document.getElementById('nav-maneuver').textContent = step.name || 'Unnamed road';

    // Center map on current step
    const coord = step.maneuver.location;
    map.flyTo({
      center: coord,
      zoom: 16,
      duration: 1000
    });
  }

  window.nextStep = function() {
    if (!window.routeData) return;
    
    if (currentStepIndex < window.routeData.steps.length - 1) {
      currentStepIndex++;
      updateNavigationStep();
    } else {
      // Navigation complete
      showNavigationComplete();
    }
  };

  window.previousStep = function() {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      updateNavigationStep();
    }
  };

  window.stopNavigation = function() {
    navigationActive = false;
    if (navigationPanel) {
      navigationPanel.remove();
      navigationPanel = null;
    }
    
    // Fit bounds back to full route
    if (window.routeData) {
      const coords = window.routeData.coords;
      const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 80 });
    }
  };

  function showNavigationComplete() {
    if (navigationPanel) {
      navigationPanel.innerHTML = `
        <div style="background: linear-gradient(135deg, #0fa958, #0c8a47); padding:40px 20px; text-align:center;">
          <span class="material-icons-round" style="font-size:64px; color:#fff; margin-bottom:16px; display:block;">check_circle</span>
          <div style="font-size:24px; font-weight:700; color:#fff; margin-bottom:8px;">You've Arrived!</div>
          <div style="font-size:14px; color:rgba(255,255,255,0.9); margin-bottom:24px;">Navigation complete</div>
          <button onclick="stopNavigation()" style="background:#fff; color:#0fa958; border:none; padding:14px 32px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
            Close Navigation
          </button>
        </div>
      `;
    }
  }
})();

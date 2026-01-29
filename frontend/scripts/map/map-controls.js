(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");
  // Measurement + Routing controls (left of satellite selector)
  class StackControl {
    onAdd(mapInstance) {
      this._map = mapInstance;
      const wrap = document.createElement("div");
      wrap.className = "maplibregl-ctrl maplibregl-ctrl-group";
      wrap.style.display = "flex";
      wrap.style.flexDirection = "row";
      wrap.style.gap = "8px";
      wrap.style.position = "absolute";
      wrap.style.top = "10px";
      wrap.style.right = "360px"; // sits left of satellite dropdown
      wrap.style.zIndex = 11;
      wrap.style.pointerEvents = "auto";
      const { wrap: measureWrap, btn: measureBtn, tooltip: measureTooltip } = createIconButton("activity_zone", "Click to start measuring area");
      const { wrap: routeWrap, btn: routeBtn, tooltip: routeTooltip } = createIconButton("conversion_path", "Click to plot a start and end point");

      wrap.appendChild(measureWrap);
      wrap.appendChild(routeWrap);

      // Sources/layers setup
      if (!mapInstance.getSource("measure-geo")) {
        mapInstance.addSource("measure-geo", { type: "geojson", data: emptyFeatureCollection() });
        mapInstance.addLayer({ id: "measure-fill", type: "fill", source: "measure-geo", paint: { "fill-color": "#00ffc3", "fill-opacity": 0.18 }, layout: { visibility: "none" } });
        mapInstance.addLayer({ id: "measure-outline", type: "line", source: "measure-geo", paint: { "line-color": "#00ffc3", "line-width": 2.5 }, layout: { visibility: "none" } });
        mapInstance.addLayer({ id: "measure-points", type: "circle", source: "measure-geo", paint: { "circle-radius": 4, "circle-color": "#00ffc3", "circle-stroke-color": "#002c24", "circle-stroke-width": 1.5 }, layout: { visibility: "none" } });
      }
      if (!mapInstance.getSource("route-geo")) {
        mapInstance.addSource("route-geo", { type: "geojson", data: emptyFeatureCollection() });
        mapInstance.addLayer({ id: "route-line", type: "line", source: "route-geo", paint: { "line-color": "#4aa8ff", "line-width": 4, "line-opacity": 0.9 }, layout: { visibility: "none" } });
      }

      // Measure logic
      let measuring = false;
      let measurePts = [];
      const closeThreshPx = 18;
      const onMeasureClick = (e) => {
        const pt = [e.lngLat.lng, e.lngLat.lat];
        if (measurePts.length >= 2) {
          const first = measurePts[0];
          const distPx = pointDistancePx(first, pt, mapInstance);
          if (distPx <= closeThreshPx) {
            // close and finish
            measurePts.push(first);
            updateMeasure(true);
            stopMeasure();
            return;
          }
        }
        measurePts.push(pt);
        updateMeasure(false);
      };

      function updateMeasure(closed) {
        const fc = emptyFeatureCollection();
        let labelText = "Click to start measuring area";
        if (measurePts.length === 1) {
          fc.features.push(pointFeature(measurePts[0]));
          labelText = "Pick next point";
        } else if (measurePts.length >= 2) {
          const lineCoords = measurePts.slice();
          fc.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: lineCoords }, properties: {} });
          lineCoords.forEach((p) => fc.features.push(pointFeature(p)));

          const perimeterM = lineLengthMeters(lineCoords);
          let label = `Perimeter: ${(perimeterM / 1000).toFixed(2)} km`;

          if (closed) {
            if (lineCoords.length >= 3) {
              const ring = lineCoords.slice(0, lineCoords.length - 1);
              const areaSqM = polygonAreaSqMeters(lineCoords);
              const areaText = areaSqM > 1e6 ? `${(areaSqM / 1e6).toFixed(2)} km²` : `${areaSqM.toFixed(0)} m²`;
              label = `${label} | Area: ${areaText}`;
              fc.features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [lineCoords] }, properties: {} });
              ring.forEach((p) => fc.features.push(pointFeature(p)));
            }
          }

          labelText = closed ? label : `${label} | Click near first point to close`;
        }

        measureTooltip.textContent = labelText;

        mapInstance.getSource("measure-geo").setData(fc);
        const visibility = measurePts.length ? "visible" : "none";
        ["measure-fill", "measure-outline", "measure-points"].forEach((id) => mapInstance.setLayoutProperty(id, "visibility", visibility));
      }

      function stopMeasure() {
        measuring = false;
        setActive(measureBtn, false);
        measureTooltip.textContent = "Click to start measuring area";
        mapInstance.getCanvas().style.cursor = "";
        mapInstance.off("click", onMeasureClick);
        measurePts = [];
      }

      function toggleMeasure() {
        measuring = !measuring;
        if (measuring) {
          setActive(measureBtn, true);
          measureTooltip.textContent = "Click to add vertices. Close near the first point.";
          mapInstance.getCanvas().style.cursor = "crosshair";
          mapInstance.on("click", onMeasureClick);
          // disable routing if active
          stopRoute();
        } else {
          stopMeasure();
          updateMeasure(false);
        }
      }

      measureBtn.addEventListener("click", toggleMeasure);

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
        ghostMarker.setLngLat(e.lngLat).addTo(mapInstance);
      };

      const onRouteClick = (e) => {
        if (!routing) return;
        const pt = [e.lngLat.lng, e.lngLat.lat];
        if (routePts.length === 0) {
          routePts.push(pt);
          if (startMarker) startMarker.remove();
          startMarker = markerBadge("Start", "#0fa958");
          startMarker.setLngLat(pt).addTo(mapInstance);
          routeTooltip.textContent = "Pick end point";
          // switch ghost to End immediately
          closeGhost();
          ghostMarker = markerBadge("End", "#d83b3b");
          ghostMarker.setLngLat(e.lngLat).addTo(mapInstance);
        } else if (routePts.length === 1) {
          routePts.push(pt);
          if (endMarker) endMarker.remove();
          endMarker = markerBadge("End", "#d83b3b");
          endMarker.setLngLat(pt).addTo(mapInstance);
          routing = false;
          setActive(routeBtn, false);
          mapInstance.getCanvas().style.cursor = "";
          mapInstance.off("mousemove", onRouteMove);
          mapInstance.off("click", onRouteClick);
          closeGhost();
          fetchRoute(routePts[0], routePts[1]);
        }
      };

      function fetchRoute(start, end) {
        routeTooltip.textContent = "Routing...";
        mapInstance.setLayoutProperty("route-line", "visibility", "none");
        mapInstance.getSource("route-geo").setData(emptyFeatureCollection());
        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
        fetch(url)
          .then((r) => r.json())
          .then((data) => {
            if (!data.routes || !data.routes.length) throw new Error("No route");
            const coords = data.routes[0].geometry.coordinates;
            mapInstance.getSource("route-geo").setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] });
            mapInstance.setLayoutProperty("route-line", "visibility", "visible");
            routeTooltip.textContent = `Distance: ${(data.routes[0].distance / 1000).toFixed(2)} km | ETA: ${(data.routes[0].duration / 60).toFixed(1)} min`;
            const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
            mapInstance.fitBounds(bounds, { padding: 60 });
          })
          .catch(() => {
            routeTooltip.textContent = "Route unavailable";
          })
          .finally(() => {
            routePts = [];
          });
      }

      function toggleRoute() {
        routing = !routing;
        routePts = [];
        clearRouteMarkers();
        closeGhost();
        routeTooltip.textContent = routing ? "Pick start point" : "Click to plot a start and end point";
        if (routing) {
          setActive(routeBtn, true);
          mapInstance.getCanvas().style.cursor = "crosshair";
          stopMeasure();
          mapInstance.on("mousemove", onRouteMove);
          mapInstance.on("click", onRouteClick);
        } else {
          setActive(routeBtn, false);
          mapInstance.getCanvas().style.cursor = "";
          mapInstance.off("mousemove", onRouteMove);
          mapInstance.off("click", onRouteClick);
        }
      }

      routeBtn.addEventListener("click", toggleRoute);

      function stopRoute() {
        routing = false;
        routePts = [];
        clearRouteMarkers();
        closeGhost();
        setActive(routeBtn, false);
        routeTooltip.textContent = "Click to plot a start and end point";
        mapInstance.getCanvas().style.cursor = "";
        mapInstance.off("mousemove", onRouteMove);
        mapInstance.off("click", onRouteClick);
        if (mapInstance.getSource("route-geo")) {
          mapInstance.getSource("route-geo").setData(emptyFeatureCollection());
        }
        if (mapInstance.getLayer("route-line")) {
          mapInstance.setLayoutProperty("route-line", "visibility", "none");
        }
      }

      return wrap;
    }
    onRemove() {}
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

  map.addControl(new StackControl(), "top-right");
  // 2D/3D Terrain Toggle (explicit MapLibre control-like button)
  let is3D = true;

  const terrainBtn = document.createElement("button");
  terrainBtn.type = "button";
  terrainBtn.className = "maplibregl-ctrl maplibregl-ctrl-group";
  terrainBtn.style.position = "absolute";
  terrainBtn.style.top = "15px";
  terrainBtn.style.right = "90px";
  terrainBtn.style.zIndex = 10;
  terrainBtn.style.display = "flex";
  terrainBtn.style.alignItems = "center";
  terrainBtn.style.justifyContent = "center";
  terrainBtn.style.width = "46px";
  terrainBtn.style.height = "46px";
  terrainBtn.style.borderRadius = "12px";
  terrainBtn.style.background = "#111";
  terrainBtn.style.border = "1px solid #2c3342";
  terrainBtn.style.color = "#fff";
  terrainBtn.style.cursor = "pointer";
  terrainBtn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
  terrainBtn.title = "Toggle terrain";
  terrainBtn.innerHTML = '<span class="material-icons-round" style="font-size:20px;">terrain</span>';
  terrainBtn.setAttribute("aria-label", "Toggle terrain");

  const setMode = (enable3D) => {
    if (enable3D) {
      map.setProjection({ type: "globe" });
      map.setTerrain({ source: "terrainSource", exaggeration: 1.5 });
      map.easeTo({ pitch: 0 });
      terrainBtn.style.borderColor = "#4aa8ff";
      terrainBtn.style.background = "linear-gradient(135deg, #182235, #0f1829)";
    } else {
      map.setTerrain(null);
      map.setProjection({ type: "mercator" });
      map.easeTo({ pitch: 0, bearing: 0 });
      terrainBtn.style.borderColor = "#2c3342";
      terrainBtn.style.background = "linear-gradient(135deg, #10131c, #0c0f17)";
    }
    is3D = enable3D;
  };

  setMode(true);

  terrainBtn.addEventListener("click", () => {
    setMode(!is3D);
  });

  document.body.appendChild(terrainBtn);
})();

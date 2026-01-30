//
(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  map.on("click", async (e) => {
    // Weather scan is now always active, even during tools

    const lat = e.lngLat.lat;
    const lng = e.lngLat.lng;

    const popup = new maplibregl.Popup({
      anchor: 'top', // Show below the point
      offset: [0, 10], // Push down slightly
      closeButton: true // Cleaner look but user requested close button
    })
      .setLngLat([lng, lat])
      .setHTML('<div style="color:#333; padding:5px;">Scanning atmosphere...</div>')
      .addTo(map);

    try {
      // 1. Fetch Weather
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${CONFIG.OPENWEATHER_KEY}`
      );
      const weatherData = await weatherRes.json();

      // 2. Fetch Air Pollution (Gas Data)
      const airRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${CONFIG.OPENWEATHER_KEY}`
      );
      const airData = await airRes.json();

      if (weatherData.cod !== 200) { throw new Error(weatherData.message); }

      // Parse Data
      const components = airData.list[0].components; // co, no2, o3, so2, pm2_5, pm10, nh3
      const aqi = airData.list[0].main.aqi; // 1 = Good, 5 = Very Poor

      // Color code AQI
      const aqiColors = { 1: '#00e400', 2: '#ffff00', 3: '#ff7e00', 4: '#ff0000', 5: '#7e0023' };
      const aqiColor = aqiColors[aqi] || '#ccc';

      const htmlContent = `
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px; color: #333;">
          <div style="background: #222; color: #fff; padding: 8px; border-radius: 4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:600;">${weatherData.name || "Target Zone"}</span>
             <span style="background:${aqiColor}; color:#000; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">AQI ${aqi}</span>
          </div>
          
          <div style="padding: 10px;">
            <div style="display:flex; align-items:center; margin-bottom:8px;">
                <span style="font-size:24px; font-weight:bold; margin-right:10px;">${Math.round(weatherData.main.temp)}°C</span>
                <div style="font-size:12px; line-height:1.2;">
                  <div>Wind: <b>${weatherData.wind.speed} m/s</b></div>
                  <div>Direction: <b>${weatherData.wind.deg}°</b></div>
                  <div>${weatherData.weather[0].description}</div>
                </div>
            </div>

            <hr style="border:0; border-top:1px solid #eee; margin:8px 0;">

            <div style="font-size:11px; font-weight:600; color:#555; margin-bottom:4px;">ATMOSPHERIC COMPOSITION (μg/m³)</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 12px;">
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">CO</span> <b style="float:right;">${components.co}</b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">NO₂</span> <b style="float:right;">${components.no2}</b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">SO₂</span> <b style="float:right;">${components.so2}</b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">PM2.5</span> <b style="float:right;">${components.pm2_5}</b>
               </div>
            </div>
            
            ${components.co > 1000 ? '<div style="margin-top:8px; color:#c0392b; font-weight:600; font-size:11px;">High CO detected (possible fire)</div>' : ''}
          </div>
        </div>
      `;
      popup.setHTML(htmlContent);

    } catch (err) {
      console.error(err);
      popup.setHTML('<div style="color:red; padding:10px;">Unable to retrieve telemetry.</div>');
    }
  });
})();

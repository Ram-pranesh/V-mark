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

    // Restore view when popup is closed (canceled)
    popup.on('close', () => {
      if (window._weatherPopupPrevCenter) {
        map.easeTo({
          center: window._weatherPopupPrevCenter,
          padding: { top: 0, bottom: 0 },
          duration: 600
        });
        window._weatherPopupPrevCenter = null;
      }
    });

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
            
            <button id="btn-weather-details" style="width:100%; margin-top:8px; padding:5px; background:#667eea; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;" onclick="window.fetchDetailedWeather(${lat}, ${lng})">
              More Info
            </button>
            <div id="weather-details-container" style="display:none; margin-top:5px; border-top:1px solid #eee;"></div>
          </div>
        </div>
      `;
      popup.setHTML(htmlContent);

    } catch (err) {
      console.error(err);
      popup.setHTML('<div style="color:red; padding:10px;">Unable to retrieve telemetry.</div>');
    }
  });

  // Global handler for detailed weather
  window.fetchDetailedWeather = async (lat, lng) => {
    const container = document.getElementById('weather-details-container');
    const btn = document.getElementById('btn-weather-details');
    if (!container || !btn) return;

    // Toggle
    if (container.style.display === 'block') {
      container.style.display = 'none';
      btn.innerText = 'More Info';

      // Restore view on collapse
      if (window._weatherPopupPrevCenter) {
        window.map.easeTo({
          center: window._weatherPopupPrevCenter,
          padding: { top: 0, bottom: 0 },
          duration: 600
        });
        window._weatherPopupPrevCenter = null;
      }
      return;
    }

    // Auto-pan to make room for the popup
    if (window.map) {
      // Store current center before panning
      window._weatherPopupPrevCenter = window.map.getCenter();

      window.map.easeTo({
        center: [lng, lat],
        padding: { top: 20, bottom: 300 }, // Push map up (point moves up) to reveal popup
        duration: 600
      });
    }

    const originalText = btn.innerText;
    btn.innerText = 'Loading...';

    try {
      const res = await fetch(`/api/detailed-weather?lat=${lat}&lng=${lng}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Horizontal Scroll Container
      let html = '<div id="weather-scroll-view" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:6px; margin-top:8px; scrollbar-width:thin;">';

      const now = new Date();

      // Show ALL data (Past 5 days + Forecast)
      data.forEach(row => {
        const date = new Date(row.date);
        const hours = date.getHours();
        const timeStr = hours.toString().padStart(2, '0') + ':00';
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Highlight Current Hour (within 1 hour window)
        const diff = Math.abs(date - now);
        const isCurrent = diff < 3600000 / 2; // within 30 min

        const border = isCurrent ? '2px solid #667eea' : '1px solid #eee';
        const bg = isCurrent ? '#f8faff' : '#fff';
        const fw = isCurrent ? '700' : '400';
        const shadow = isCurrent ? '0 2px 5px rgba(102,126,234,0.3)' : 'none';
        const cardId = isCurrent ? 'current-weather-card' : '';

        html += `
          <div id="${cardId}" style="flex:0 0 90px; display:flex; flex-direction:column; align-items:center; justify-content:start; text-align:center; padding:8px 4px; border:${border}; background:${bg}; border-radius:8px; font-size:10px; box-shadow:${shadow}; min-height:145px;">
             <div style="font-size:9px; color:#888; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px;">${dateStr}</div>
             <div style="font-weight:600; margin-bottom:4px; color:#555; font-size:11px;">${timeStr}</div>
             <div style="font-size:14px; font-weight:${fw}; color:#333; margin-bottom:2px;">${row.temperature_2m?.toFixed(0)}°</div>
             <div style="font-size:9px; color:#666;">${row.wind_speed_10m?.toFixed(0)} <span style="font-size:8px">m/s</span></div>
             
             <div style="width:100%; height:1px; background:#eee; margin:5px 0;"></div>
             
             <div style="display:grid; grid-template-columns:1fr 1fr; gap:3px; width:100%; text-align:left; padding-left:4px; font-size:9px; color:#444;">
                 <span style="color:#888;">PM<sub>2.5</sub></span> <b>${row.pm2_5?.toFixed(0) || '-'}</b>
                 <span style="color:#888;">CO<sub>2</sub></span> <b>${row.carbon_dioxide?.toFixed(0) || '-'}</b>
                 <span style="color:#888;">AOD</span> <b>${row.aerosol_optical_depth?.toFixed(2) || '-'}</b>
                 <span style="color:#888;">NO<sub>2</sub></span> <b>${row.nitrogen_dioxide?.toFixed(0) || '-'}</b>
             </div>
          </div>
        `;
      });
      html += '</div>';

      // Add Soil/Humidity summary on top?
      // User asked for "all these details". The table shows only 3.
      // I'll add summaries below.
      const current = data[0];
      if (current) {
        html += `<div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:10px; background:#f0f0ff; padding:5px; border-radius:4px;">
                <div>Humidity: <b>${current.relative_humidity_2m?.toFixed(0)}%</b></div>
                <div>Gusts: <b>${current.wind_gusts_10m?.toFixed(1)} m/s</b></div>
                <div>Soil M: <b>${current.soil_moisture_0_to_1cm?.toFixed(2)}</b></div>
                <div>CAPE: <b>${current.cape?.toFixed(0)}</b></div>
             </div>`;
      }

      container.innerHTML = html;
      container.style.display = 'block';
      btn.innerText = 'Hide Info';

      // Auto-scroll to center the current time
      const currentCard = document.getElementById('current-weather-card');
      if (currentCard) {
        setTimeout(() => {
          currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }

    } catch (err) {
      console.error(err);
      btn.innerText = 'Error Fetching Data';
    }
  };

})();

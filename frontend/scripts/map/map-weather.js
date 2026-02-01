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
      // 1. Fetch OpenWeather for Location Name & AQI (User Preference)
      const [weatherRes, airRes, meteoRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${CONFIG.OPENWEATHER_KEY}`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${CONFIG.OPENWEATHER_KEY}`),
        fetch(`/api/detailed-weather?lat=${lat}&lng=${lng}`)
      ]);

      const weatherData = await weatherRes.json();
      const airData = await airRes.json();
      const meteoData = await meteoRes.json();

      if (meteoData.error) throw new Error(meteoData.error);

      // Store Open-Meteo data for stats
      window._currentWeatherData = meteoData;

      // Parse OpenWeather info
      const locationName = weatherData.name || "Target Zone";
      const aqi = airData.list?.[0]?.main?.aqi || 1;
      const aqiColors = { 1: '#00e400', 2: '#ffff00', 3: '#ff7e00', 4: '#ff0000', 5: '#7e0023' };
      const aqiColor = aqiColors[aqi] || '#ccc';

      // Parse Open-Meteo Current Data
      const now = new Date();
      const current = meteoData.reduce((prev, curr) => {
        return (Math.abs(new Date(curr.date) - now) < Math.abs(new Date(prev.date) - now) ? curr : prev);
      });

      // WMO Label
      const getWeatherLabel = (code) => {
        if (code === 0) return 'Clear sky';
        if (code < 4) return 'Partly cloudy';
        if (code < 50) return 'Foggy';
        if (code < 60) return 'Drizzle';
        if (code < 80) return 'Rain';
        return 'Stormy';
      };
      const wmoLabel = getWeatherLabel(current.weather_code);

      const htmlContent = `
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px; color: #333;">
          <div style="background: #222; color: #fff; padding: 8px; border-radius: 4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:600;">${locationName}</span>
             <span style="background:${aqiColor}; color:#000; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">AQI ${aqi}</span>
          </div>
          
          <div style="padding: 10px;">
            <div style="display:flex; align-items:center; margin-bottom:8px;">
                <span style="font-size:24px; font-weight:bold; margin-right:10px;">${Math.round(current.temperature_2m)}°C</span>
                <div style="font-size:12px; line-height:1.2;">
                  <div>Wind: <b>${current.wind_speed_10m.toFixed(1)} m/s</b></div>
                  <div>Direction: <b>${current.wind_direction_10m.toFixed(2)}°</b></div>
                  <div>${wmoLabel}</div>
                </div>
            </div>

            <hr style="border:0; border-top:1px solid #eee; margin:8px 0;">

            <div style="font-size:11px; font-weight:600; color:#555; margin-bottom:4px;">ATMOSPHERIC COMPOSITION (μg/m³)</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 12px;">
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">CO</span> <b style="float:right;">${current.carbon_monoxide.toFixed(1)}</b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">NO₂</span> <b style="float:right;">${current.nitrogen_dioxide.toFixed(1)}</b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">CO₂</span> <b style="float:right;">${current.carbon_dioxide.toFixed(0)} <span style="font-size:10px; color:#888;">ppm</span></b>
               </div>
               <div style="background:#f5f5f5; padding:4px; border-radius:4px;">
                 <span style="color:#666;">PM2.5</span> <b style="float:right;">${current.pm2_5.toFixed(1)}</b>
               </div>
            </div>
            
            ${current.carbon_monoxide > 1000 ? '<div style="margin-top:8px; color:#c0392b; font-weight:600; font-size:11px;">High CO detected (possible fire)</div>' : ''}
            
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
      popup.setHTML('<div style="color:red; padding:10px;">Unable to retrieve atmospheric data.</div>');
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

      // Store for stats view
      window._currentWeatherData = data;

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

      // Add Stats Button
      html += `
        <button style="width:100%; margin-top:8px; padding:8px; background:#e0f2f1; color:#00695c; border:1px solid #b2dfdb; border-radius:6px; font-weight:600; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="window.showWeatherStats()">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="m105-399-65-47 200-320 120 140 160-260 120 180 135-214 65 47-198 314-119-179-152 247-121-141-145 233Zm475 159q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29ZM784-80 676-188q-21 14-45.5 21t-50.5 7q-75 0-127.5-52.5T400-340q0-75 52.5-127.5T580-520q75 0 127.5 52.5T760-340q0 26-7 50.5T732-244l108 108-56 56Z"/></svg> View Stats
        </button>
        `;

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

  // Stats Renderer
  window.showWeatherStats = () => {
    const rawData = window._currentWeatherData;
    if (!rawData) return;

    // Group Data by Date
    const grouped = {};
    const allDates = [];
    rawData.forEach(row => {
      const d = row.date.split(' ')[0]; // YYYY-MM-DD
      if (!grouped[d]) {
        grouped[d] = [];
        allDates.push(d);
      }
      grouped[d].push(row);
    });
    // Sort dates
    allDates.sort(); // Oldest first. Last is "Present/Future"

    // Initial State
    const state = {
      metric: 'temp_wind',
      view: 'daily',
      dateIndex: allDates.length - 1, // Default to latest
      showExport: false
    };

    // Render Modal Frame
    let modal = document.getElementById('weather-stats-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'weather-stats-modal';
      modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:850px; background:rgba(255,255,255,0.99); backdrop-filter:blur(10px); padding:20px; border-radius:12px; box-shadow:0 10px 50px rgba(0,0,0,0.4); z-index:9999; display:block; border:1px solid #ddd; font-family:var(--font-primary, sans-serif);';
      document.body.appendChild(modal);
    }
    modal.style.display = 'block';

    const renderUI = () => {
      if (state.showExport) {
        renderExportUI();
        return;
      }

      const currentDate = allDates[state.dateIndex];
      const isOverall = state.view === 'overall';
      // Date formatting: "Fri, Feb 02"
      const dateDisplay = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                     <h3 style="margin:0; font-size:18px; color:#333;">Weather Stats</h3>
                     
                     <select id="stats-metric-select" style="padding:4px 8px; border-radius:4px; border:1px solid #ccc; font-size:13px; cursor:pointer; background:#fff;">
                        <option value="temp_wind" ${state.metric === 'temp_wind' ? 'selected' : ''}>Temp & Wind</option>
                        <option value="pm25" ${state.metric === 'pm25' ? 'selected' : ''}>PM2.5</option>
                        <option value="co2" ${state.metric === 'co2' ? 'selected' : ''}>CO2</option>
                        <option value="aod" ${state.metric === 'aod' ? 'selected' : ''}>AOD</option>
                        <option value="no2" ${state.metric === 'no2' ? 'selected' : ''}>NO2</option>
                        <option value="humidity" ${state.metric === 'humidity' ? 'selected' : ''}>Humidity</option>
                        <option value="soil" ${state.metric === 'soil' ? 'selected' : ''}>Soil Moisture</option>
                     </select>
                </div>
                
                <div style="display:flex; align-items:center; gap:10px; background:#f0f2f5; padding:4px 8px; border-radius:20px;">
                    ${!isOverall ? `
                        <button id="stats-prev-date" ${state.dateIndex <= 0 ? 'disabled style="opacity:0.3"' : ''} style="border:none; background:none; cursor:pointer; font-size:14px;">&#9664;</button>
                        <span style="font-size:13px; font-weight:700; color:#000; width:100px; text-align:center;">${dateDisplay}</span>
                        <button id="stats-next-date" ${state.dateIndex >= allDates.length - 1 ? 'disabled style="opacity:0.3"' : ''} style="border:none; background:none; cursor:pointer; font-size:14px;">&#9654;</button>
                    ` : `<span style="font-size:13px; font-weight:700; color:#000; padding:0 10px;">Past 5 Days Overview</span>`}
                    
                    <button id="stats-toggle-view" style="font-size:11px; padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px; cursor:pointer; font-weight:600;">
                        ${isOverall ? 'Switch to Daily' : 'Switch to Overall'}
                    </button>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <button id="stats-export-btn" style="background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 5px rgba(16,185,129,0.3);">Export Data</button>
                    <button onclick="document.getElementById('weather-stats-modal').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
                </div>
            </div>
            
            <div style="height:350px; position:relative; width:100%;">
                <canvas id="weather-stats-chart"></canvas>
            </div>
        `;

      setEventListeners();
      updateChart();
    };

    const renderExportUI = () => {
      modal.innerHTML = `
            <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:18px; color:#333;">Export Data</h3>
                <button id="export-cancel-btn" style="border:none; background:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
            </div>
            
            <div style="font-size:13px; color:#444; display:grid; gap:20px;">
                <!-- Section 1: Data Fields -->
                <div>
                    <div style="font-weight:700; margin-bottom:8px; display:flex; gap:10px; align-items:center;">
                        1. Select Data Fields
                        <label style="font-weight:400; font-size:11px; display:flex; align-items:center; gap:4px; cursor:pointer; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                            <input type="checkbox" id="exp-field-all" checked> Previous All
                        </label>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px;" id="exp-fields-container">
                        ${['Temperature', 'Wind Speed', 'PM2.5', 'CO2', 'AOD', 'NO2', 'Humidity', 'Soil Moisture'].map(f =>
        `<label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" class="exp-field" value="${f}" checked> ${f}</label>`
      ).join('')}
                    </div>
                </div>

                <!-- Section 2: Date Range -->
                <div>
                    <div style="font-weight:700; margin-bottom:8px; display:flex; gap:10px; align-items:center;">
                        2. Select Dates
                        <label style="font-weight:400; font-size:11px; display:flex; align-items:center; gap:4px; cursor:pointer; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                            <input type="checkbox" id="exp-date-all" checked> All 5 Days
                        </label>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:8px;" id="exp-dates-container">
                        ${allDates.map((d) => {
        return `<label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" class="exp-date" value="${d}" checked> ${d}</label>`;
      }).reverse().join('')}
                    </div>
                </div>

                <!-- Section 3: Format -->
                <div>
                    <div style="font-weight:700; margin-bottom:8px;">3. Select Format</div>
                    <div style="display:flex; gap:20px;">
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="radio" name="exp-format" value="excel" checked> Excel (.xlsx)</label>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="radio" name="exp-format" value="csv"> CSV</label>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="radio" name="exp-format" value="json"> JSON</label>
                    </div>
                </div>
            </div>

            <div style="margin-top:25px; display:flex; justify-content:flex-end; gap:10px;">
                <button id="export-back-btn" style="padding:8px 16px; border:1px solid #ddd; background:#fff; border-radius:4px; cursor:pointer;">Cancel</button>
                <button id="export-confirm-btn" style="padding:8px 24px; background:#10b981; color:#white; border:none; border-radius:4px; font-weight:700; cursor:pointer; color:#fff;">Download</button>
            </div>
        `;

      // Export Logic Listeners
      document.getElementById('export-cancel-btn').onclick = () => { state.showExport = false; renderUI(); };
      document.getElementById('export-back-btn').onclick = () => { state.showExport = false; renderUI(); };

      // "All" Toggles
      document.getElementById('exp-field-all').onchange = (e) => {
        document.querySelectorAll('.exp-field').forEach(cb => cb.checked = e.target.checked);
      };
      document.getElementById('exp-date-all').onchange = (e) => {
        document.querySelectorAll('.exp-date').forEach(cb => cb.checked = e.target.checked);
      };

      document.getElementById('export-confirm-btn').onclick = () => {
        // Gather Fields
        const selectedFields = Array.from(document.querySelectorAll('.exp-field:checked')).map(cb => cb.value);
        const fieldMap = {
          'Temperature': 'temperature_2m', 'Wind Speed': 'wind_speed_10m', 'PM2.5': 'pm2_5',
          'CO2': 'carbon_dioxide', 'AOD': 'aerosol_optical_depth', 'NO2': 'nitrogen_dioxide',
          'Humidity': 'relative_humidity_2m', 'Soil Moisture': 'soil_moisture_0_to_1cm'
        };
        const keepKeys = ['date', ...selectedFields.map(f => fieldMap[f])];

        // Gather Dates
        const selectedDates = Array.from(document.querySelectorAll('.exp-date:checked')).map(cb => cb.value);

        if (selectedFields.length === 0) { alert('Please select at least one data field.'); return; }
        if (selectedDates.length === 0) { alert('Please select at least one date.'); return; }

        // Filter Data
        let finalData = rawData.filter(r => selectedDates.includes(r.date.split(' ')[0]));

        // Filter Columns
        finalData = finalData.map(row => {
          const newRow = {};
          keepKeys.forEach(k => { if (row[k] !== undefined) newRow[k] = row[k]; });
          return newRow;
        });

        const format = document.querySelector('input[name="exp-format"]:checked').value;

        if (format === 'excel') {
          if (typeof XLSX === 'undefined') { alert('Excel lib loading...'); return; }
          const ws = XLSX.utils.json_to_sheet(finalData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Export");
          XLSX.writeFile(wb, "weather_export.xlsx");
        } else if (format === 'csv') {
          const headers = Object.keys(finalData[0]).join(',');
          const rows = finalData.map(row => Object.values(row).join(',')).join('\n');
          const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
          downloadBlob(blob, 'weather_export.csv');
        } else {
          const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
          downloadBlob(blob, 'weather_export.json');
        }

        state.showExport = false;
        renderUI();
      };
    };

    const setEventListeners = () => {
      document.getElementById('stats-metric-select').onchange = (e) => { state.metric = e.target.value; updateChart(); };
      document.getElementById('stats-toggle-view').onclick = () => { state.view = state.view === 'overall' ? 'daily' : 'overall'; renderUI(); };
      document.getElementById('stats-export-btn').onclick = () => { state.showExport = true; renderUI(); };

      const prevBtn = document.getElementById('stats-prev-date');
      if (prevBtn) prevBtn.onclick = () => { if (state.dateIndex > 0) { state.dateIndex--; renderUI(); } };

      const nextBtn = document.getElementById('stats-next-date');
      if (nextBtn) nextBtn.onclick = () => { if (state.dateIndex < allDates.length - 1) { state.dateIndex++; renderUI(); } };
    };

    const updateChart = () => {
      let chartData = state.view === 'overall' ? rawData : grouped[allDates[state.dateIndex]];
      const ctx = document.getElementById('weather-stats-chart').getContext('2d');
      if (window._weatherChart) window._weatherChart.destroy();

      let datasets = [];
      let yTitle = '', y1Title = '';

      switch (state.metric) {
        case 'temp_wind':
          datasets.push({ label: 'Temperature', data: chartData.map(r => r.temperature_2m), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, yAxisID: 'y' });
          datasets.push({ label: 'Wind Speed', data: chartData.map(r => r.wind_speed_10m), borderColor: '#3b82f6', borderDash: [5, 5], yAxisID: 'y1' });
          yTitle = 'Temperature (°C)';
          y1Title = 'Wind Speed (m/s)';
          break;
        case 'pm25':
          datasets.push({ label: 'Particulate Matter (PM2.5)', data: chartData.map(r => r.pm2_5), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, yAxisID: 'y' });
          yTitle = 'Concentration (μg/m³)';
          break;
        case 'co2':
          datasets.push({ label: 'Carbon Dioxide (CO2)', data: chartData.map(r => r.carbon_dioxide), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, yAxisID: 'y' });
          yTitle = 'Concentration (ppm)';
          break;
        case 'aod':
          datasets.push({ label: 'Aerosol Optical Depth (AOD)', data: chartData.map(r => r.aerosol_optical_depth), borderColor: '#ef4444', yAxisID: 'y' });
          yTitle = 'Optical Depth';
          break;
        case 'no2':
          datasets.push({ label: 'Nitrogen Dioxide (NO2)', data: chartData.map(r => r.nitrogen_dioxide), borderColor: '#eab308', yAxisID: 'y' });
          yTitle = 'Concentration (μg/m³)';
          break;
        case 'humidity':
          datasets.push({ label: 'Relative Humidity', data: chartData.map(r => r.relative_humidity_2m), borderColor: '#0ea5e9', fill: true, backgroundColor: 'rgba(14,165,233,0.2)', yAxisID: 'y' });
          yTitle = 'Percentage (%)';
          break;
        case 'soil':
          datasets.push({ label: 'Soil Moisture', data: chartData.map(r => r.soil_moisture_0_to_1cm), borderColor: '#78350f', yAxisID: 'y' });
          yTitle = 'Volumetric Fraction';
          break;
      }

      const labels = chartData.map(r => {
        const d = new Date(r.date);
        return state.view === 'overall' ? `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00` : `${d.getHours()}:00`;
      });

      window._weatherChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              display: true,
              title: { display: true, text: 'Time', color: '#666', font: { size: 12, weight: 'bold' } }
            },
            y: {
              type: 'linear', display: true, position: 'left',
              title: { display: true, text: yTitle, color: '#444', font: { size: 12, weight: 'bold' } }
            },
            y1: {
              type: 'linear', display: state.metric === 'temp_wind', position: 'right', grid: { drawOnChartArea: false },
              title: { display: state.metric === 'temp_wind', text: y1Title, color: '#444', font: { size: 12, weight: 'bold' } }
            }
          }
        }
      });
    };

    const downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click();
    };

    renderUI();
  };

})();

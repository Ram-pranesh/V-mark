(function () {
  const scripts = [
    "./scripts/map/map-init.js",
    "./scripts/map/map-layers.js",

    "./scripts/map/map-controls.js",
    "./scripts/map/map-switcher.js",
    "./scripts/map/map-time-controls.js",
    "./scripts/map/map-weather.js",
    "./scripts/map/map-coords.js",
    "./scripts/map/map-extensions.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
  }

  fetch("/config")
    .then((res) => {
      if (!res.ok) throw new Error("Config request failed");
      return res.json();
    })
    .then((config) => {
      window.CONFIG = config;
      return scripts.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
    })
    .catch((err) => {
      console.warn("Config load failed, using defaults", err);
      // Fallback config to ensure map loads even if backend is unreachable
      window.CONFIG = {
        DEFAULT_CENTER: [78.9629, 20.5937], // India center approx
        DEFAULT_ZOOM: 4,
        OPENWEATHER_KEY: "", // Features needing keys will fail gracefully
        FIRMS_MAP_KEY: ""
      };
      // Load scripts anyway
      scripts.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
    });
})();

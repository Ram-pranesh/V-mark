(function () {
  const scripts = [
    "./scripts/globe.js",
    "./scripts/globe.layers.js",
    "./scripts/risk-factors/risk-factors.layers.js",
    "./scripts/risk-factors/risk-factors.ui.js",
    "./scripts/globe.controls.js",
    "./scripts/globe.switcher.js",
    "./scripts/time.controls.js",
    "./scripts/globe.weather.js",
    "./scripts/globe.coords.js",
    "./scripts/extensions.js"
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
      console.error(err);
    });
})();

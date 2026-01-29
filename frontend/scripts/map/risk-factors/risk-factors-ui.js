(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  const dropdown = document.getElementById("risk-dropdown");
  const dropdownToggle = document.getElementById("risk-dropdown-toggle");
  const dropdownMenu = document.getElementById("risk-dropdown-menu");

  if (dropdown && dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove("open");
      }
    });
  }

  const setLayerVisibility = (layerId, visible) => {
    if (window.setRiskFactorLayerVisibility) {
      window.setRiskFactorLayerVisibility(layerId, visible);
      return;
    }

    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  };

  const setCheckboxState = (id, checked) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = checked;
  };

  const toggleMutualAtmospheric = (layerId, visible) => {
    if (!visible) return;

    if (layerId === "wind-layer") {
      setLayerVisibility("temp-layer", false);
      setCheckboxState("layer-temp", false);
    }

    if (layerId === "temp-layer") {
      setLayerVisibility("wind-layer", false);
      setCheckboxState("layer-wind", false);
    }
  };

  const riskCheckboxes = dropdownMenu ? dropdownMenu.querySelectorAll("input[type='checkbox'][data-layer-id]") : [];
  riskCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const layerId = checkbox.dataset.layerId;
      setLayerVisibility(layerId, checkbox.checked);
      toggleMutualAtmospheric(layerId, checkbox.checked);

      if (layerId === "wind-layer") setCheckboxState("layer-wind", checkbox.checked);
      if (layerId === "temp-layer") setCheckboxState("layer-temp", checkbox.checked);

      if (window.updateLegend && (layerId === "wind-layer" || layerId === "temp-layer")) {
        window.updateLegend(layerId, checkbox.checked);
      }
    });
  });

  const firmsConfigured = CONFIG && CONFIG.FIRMS_MAP_KEY;

  riskCheckboxes.forEach((checkbox) => {
    const layerId = checkbox.dataset.layerId;
    if (layerId === "firms-fires-layer" && !firmsConfigured) {
      checkbox.disabled = true;
      checkbox.parentElement.title = "Set FIRMS_MAP_KEY in .env";
    }
  });

  const firmsLabel = document.getElementById("firms-date-label");
  const firmsStrip = document.getElementById("firms-date-strip");

  const formatDisplayDate = (date) => {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd} ${mm} ${yyyy}`;
  };

  const formatIsoDate = (date) => date.toISOString().split("T")[0];

  const buildFirmsDates = () => {
    if (!firmsStrip) return;

    firmsStrip.innerHTML = "";
    const today = new Date();

    const dates = Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      return date;
    });

    dates.forEach((date, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "firms-date-chip";
      chip.textContent = formatDisplayDate(date);
      chip.dataset.iso = formatIsoDate(date);

      if (index === 0) chip.classList.add("active");

      chip.addEventListener("click", () => {
        firmsStrip.querySelectorAll(".firms-date-chip").forEach((el) => el.classList.remove("active"));
        chip.classList.add("active");

        if (firmsLabel) {
          firmsLabel.textContent = `FIRMS Date: ${chip.textContent}`;
        }

        if (window.updateFirmsDate) {
          window.updateFirmsDate(chip.dataset.iso);
        }

        setLayerVisibility("firms-fires-layer", true);
        const fireCheckbox = dropdownMenu ? dropdownMenu.querySelector("input[data-layer-id='firms-fires-layer']") : null;
        if (fireCheckbox) fireCheckbox.checked = true;
      });

      firmsStrip.appendChild(chip);
    });

    const defaultChip = firmsStrip.querySelector(".firms-date-chip.active");
    if (defaultChip && firmsLabel) {
      firmsLabel.textContent = `FIRMS Date: ${defaultChip.textContent}`;
      if (window.updateFirmsDate) {
        window.updateFirmsDate(defaultChip.dataset.iso);
      }
    }
  };

  buildFirmsDates();
})();

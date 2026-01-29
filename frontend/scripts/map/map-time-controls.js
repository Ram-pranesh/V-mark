(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  const container = document.createElement("div");
  container.className = "time-control";
  container.setAttribute("aria-live", "polite");

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "time-btn";
  prevBtn.textContent = "◀";
  prevBtn.setAttribute("aria-label", "Previous day");

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "time-btn";
  nextBtn.textContent = "▶";
  nextBtn.setAttribute("aria-label", "Next day");

  const display = document.createElement("div");
  display.className = "time-display";

  const dateText = document.createElement("span");
  dateText.className = "time-date";

  const timeText = document.createElement("span");
  timeText.className = "time-clock";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "time-toggle";
  toggle.textContent = "Local";
  toggle.setAttribute("aria-label", "Toggle time zone");

  display.appendChild(dateText);
  display.appendChild(timeText);
  display.appendChild(toggle);

  container.appendChild(prevBtn);
  container.appendChild(display);
  container.appendChild(nextBtn);

  document.body.appendChild(container);

  const maxDays = 5;
  let dayOffset = 0;
  let useGmt = false;

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, "0");
    return `${year} ${month} ${day}`;
  };

  const formatTime = (date, gmt, blinkOn) => {
    const separator = blinkOn ? ":" : " ";
    if (gmt) {
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const mm = String(date.getUTCMinutes()).padStart(2, "0");
      return `${hh}${separator}${mm} GMT`;
    }
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}${separator}${mm} Local`;
  };

  const getDateForOffset = () => {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    return date;
  };

  let blinkOn = true;

  let lastDateIso = null;

  const updateDisplay = (forceDateUpdate = false) => {
    const date = getDateForOffset();
    const dateIso = date.toISOString().split("T")[0];
    dateText.textContent = formatDate(date);
    timeText.textContent = formatTime(new Date(), useGmt, blinkOn);
    toggle.textContent = useGmt ? "GMT" : "Local";

    if (forceDateUpdate || dateIso !== lastDateIso) {
      lastDateIso = dateIso;

      if (window.updateFirmsDate) {
        window.updateFirmsDate(dateIso);
      }

      if (window.setFirmsDate) {
        window.setFirmsDate(dateIso);
      }
    }
  };

  prevBtn.addEventListener("click", () => {
    if (dayOffset < maxDays - 1) {
      dayOffset += 1;
      updateDisplay(true);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (dayOffset > 0) {
      dayOffset -= 1;
      updateDisplay(true);
    }
  });

  toggle.addEventListener("click", () => {
    useGmt = !useGmt;
    updateDisplay(true);
  });

  updateDisplay(true);
  setInterval(() => {
    blinkOn = !blinkOn;
    updateDisplay();
  }, 1000);
})();

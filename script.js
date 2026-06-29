// Free no-key weather widget using Open-Meteo + Nominatim fallback
const FALLBACK_CITY = 'India'; // your requested fallback

// UI helpers
function updateHumidityUI(humidity, locationName) {
  const humEl = document.getElementById('humidity-value');
  const locEl = document.getElementById('weather-location');
  const noteEl = document.getElementById('weather-note');
  if (humEl) humEl.textContent = (humidity === null || humidity === undefined) ? '—' : String(humidity);
  if (locEl) locEl.textContent = locationName ? ` — ${locationName}` : '';
  if (noteEl) noteEl.textContent = '';
}
function showWeatherNote(msg) {
  const noteEl = document.getElementById('weather-note');
  if (noteEl) noteEl.textContent = msg;
}

// Map Open-Meteo weathercode to rain/snow detection
function isRainCode(code) {
  // 51-67, 80-82 represent drizzle/rain/convective rain in Open-Meteo scheme
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}
function isSnowCode(code) {
  // 71-77 and 85-86 snow/ice
  return (code >= 71 && code <= 77) || (code === 85) || (code === 86);
}

// Normalize temperature to 0-100% for thermometer (range -10°C .. 45°C)
function tempToPercent(tempC) {
  const min = -10, max = 45;
  const clamped = Math.max(min, Math.min(max, tempC));
  return Math.round(((clamped - min) / (max - min)) * 100);
}

// Fetch humidity and temperature arrays from Open-Meteo
async function fetchWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=relativehumidity_2m,temperature_2m&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('fetchWeatherData error', err);
    showWeatherNote('Could not fetch weather (network/API).');
    return null;
  }
}

// Pick nearest hourly index
function pickNearestIndex(times) {
  const nowMs = Date.now();
  let bestIdx = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const tMs = Date.parse(times[i]);
    const diff = Math.abs(tMs - nowMs);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  return bestIdx;
}

// Geocode fallback city with Nominatim
async function geocodeCity(city) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!items || items.length === 0) return null;
    const it = items[0];
    return { lat: parseFloat(it.lat), lon: parseFloat(it.lon), name: it.display_name };
  } catch (err) {
    console.error('geocodeCity error', err);
    showWeatherNote('Could not geocode fallback city.');
    return null;
  }
}

// Update thermometer and emoji
function renderThermometer(tempC, weathercode) {
  const mercury = document.getElementById('thermometer-mercury');
  const tempEl = document.getElementById('temp-value');
  const emojiEl = document.getElementById('weather-emoji');

  if (tempEl) tempEl.textContent = (typeof tempC === 'number') ? `${Math.round(tempC)}°C` : '—°C';
  const pct = (typeof tempC === 'number') ? tempToPercent(tempC) : 0;
  if (mercury) mercury.style.height = `${pct}%`;

  // Choose emoji: rain overrides, snow overrides, otherwise season by temperature
  let emoji = '🌤️';
  if (typeof weathercode === 'number' && isRainCode(weathercode)) {
    emoji = '💧';
  } else if (typeof weathercode === 'number' && isSnowCode(weathercode)) {
    emoji = '❄️';
  } else if (typeof tempC === 'number') {
    if (tempC >= 30) emoji = '🔥';     // summer
    else if (tempC >= 15) emoji = '🌸'; // spring/pleasant
    else emoji = '❄️';                 // colder -> winter emoji
  }
  if (emojiEl) emojiEl.textContent = emoji;
}

// Orchestrator
async function getAndShowWeather() {
  updateHumidityUI(null, 'Loading...');
  // Try geolocation first
  if ('geolocation' in navigator) {
    const geoPromise = new Promise((resolve) => {
      const onSuccess = (pos) => resolve({ ok: true, pos });
      const onError = (err) => resolve({ ok: false, err });
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 8000 });
    });

    const result = await geoPromise;
    if (result.ok) {
      const { coords } = result.pos;
      const data = await fetchWeatherData(coords.latitude, coords.longitude);
      if (data) {
        // humidity from hourly set (nearest), temperature from current_weather or hourly nearest
        const times = data?.hourly?.time || [];
        const humidArr = data?.hourly?.relativehumidity_2m || [];
        const tempArr = data?.hourly?.temperature_2m || [];
        const current = data?.current_weather || {};
        let humidity = null, temp = null;
        if (times.length && humidArr.length) {
          const idx = pickNearestIndex(times);
          humidity = humidArr[idx];
        }
        if (current && typeof current.temperature === 'number') {
          temp = current.temperature;
        } else if (times.length && tempArr.length) {
          const idx2 = pickNearestIndex(times);
          temp = tempArr[idx2];
        }
        updateHumidityUI(humidity, 'Your location');
        renderThermometer(temp, current?.weathercode);
        return;
      }
      // otherwise fall through to fallback
    } else {
      console.info('Geolocation failed or denied', result.err);
    }
  }

  // Fallback: geocode provided city (India)
  const geo = await geocodeCity(FALLBACK_CITY);
  if (!geo) {
    updateHumidityUI(null, FALLBACK_CITY);
    renderThermometer(null, null);
    return;
  }
  const data2 = await fetchWeatherData(geo.lat, geo.lon);
  if (data2) {
    const times = data2?.hourly?.time || [];
    const humidArr = data2?.hourly?.relativehumidity_2m || [];
    const tempArr = data2?.hourly?.temperature_2m || [];
    const current = data2?.current_weather || {};
    let humidity = null, temp = null;
    if (times.length && humidArr.length) {
      const idx = pickNearestIndex(times);
      humidity = humidArr[idx];
    }
    if (current && typeof current.temperature === 'number') {
      temp = current.temperature;
    } else if (times.length && tempArr.length) {
      const idx2 = pickNearestIndex(times);
      temp = tempArr[idx2];
    }
    updateHumidityUI(humidity, geo.name || FALLBACK_CITY);
    renderThermometer(temp, current?.weathercode);
  } else {
    updateHumidityUI(null, geo.name || FALLBACK_CITY);
    renderThermometer(null, null);
  }
}

/* --- existing DOMContentLoaded behaviours: nav, year, contact --- */
document.addEventListener('DOMContentLoaded', function () {
  // Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Nav toggle for small screens
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      mainNav.setAttribute('aria-hidden', String(expanded));
      mainNav.style.display = expanded ? 'none' : 'block';
    });
    mainNav.setAttribute('aria-hidden', 'true');
    mainNav.style.display = '';
  }

  // Contact form: validation + mailto fallback
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#name').value.trim();
      const email = form.querySelector('#email').value.trim();
      const message = form.querySelector('#message').value.trim();
      if (!name || !email || !message) {
        status.textContent = 'Please complete all fields.';
        status.style.color = 'salmon';
        return;
      }
      const subject = encodeURIComponent(`Message from ${name} — YourProject`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:you@example.com?subject=${subject}&body=${body}`;
      status.textContent = 'Opening mail client...';
      status.style.color = '';
    });
  }

  // Start weather fetch (non-blocking)
  getAndShowWeather();
});

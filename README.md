# YourProject — Brochure Site

This repository contains a simple single-page brochure site for *YourProject*, an eco-friendly, user-friendly project. The site includes a dark violet theme, Times New Roman typography, and a live weather widget (thermometer-style) that shows current humidity and temperature using free APIs (Open-Meteo and Nominatim).

Files
- index.html — main page
- styles.css — styles and responsive layout
- script.js — behavior: nav toggle, contact form (mailto), and live weather widget
- logo.svg — simple project logo

How to preview locally
1. Clone the repo or download the files.
2. Open `index.html` in a modern browser.
3. Allow location access to show local weather; if denied, the widget falls back to "India" by default.

Customize
- Change the project name by editing `index.html` (brand text and page title).
- Update the contact mail address in `script.js` (replace `you@example.com`).
- Change fallback city by editing `FALLBACK_CITY` in `script.js` (default: India).

Notes
- The weather widget uses Open-Meteo (no API key) and Nominatim for geocoding. These services are free for light use. For high-traffic production, consider caching or a paid geocoding provider.

If you want, I can:
- Add a GitHub Pages workflow or set up automatic deploys to Netlify/Vercel.
- Replace placeholder copy with your real project text and contact email.


// UI update panna intha function-ai kadaisila paste pannunga
function getWeather() {
    const city = document.getElementById('cityInput').value;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current_weather=true`; // Sample Chennai coordinates

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const temp = data.current_weather.temperature;
            document.getElementById('cityName').innerText = city;
            document.getElementById('temp').innerText = temp + " °C";
            document.getElementById('desc').innerText = "Clear Sky";
        })
        .catch(err => alert("Error fetching weather!"));
}

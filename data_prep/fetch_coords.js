const fs = require('fs');
const https = require('https');

const allCitiesData = require('./all-city-district.json').city;
const DISTRICT_COORDS = {};

function fetchCoord(city, dist) {
  return new Promise((resolve) => {
    const query = dist === 'MERKEZ' ? city : dist;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=tr&format=json`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results) {
            let match = json.results.find(r => r.country_code === 'TR' && (r.admin1?.toLocaleUpperCase('tr-TR').includes(city.toLocaleUpperCase('tr-TR')) || r.name?.toLocaleUpperCase('tr-TR') === dist.toLocaleUpperCase('tr-TR')));
            if (!match) match = json.results.find(r => r.country_code === 'TR');
            
            if (match) {
              DISTRICT_COORDS[`${city}-${dist}`] = [match.latitude, match.longitude];
            }
          }
        } catch (e) {}
        resolve();
      });
    }).on('error', resolve);
  });
}

async function run() {
  const tasks = [];
  for (const cityObj of allCitiesData) {
    const city = cityObj.name;
    const dists = [...new Set([...cityObj.discrits, 'MERKEZ'])];
    for (const dist of dists) {
      tasks.push({city, dist});
    }
  }

  console.log(`Fetching ${tasks.length} coordinates...`);
  for (let i=0; i<tasks.length; i+=20) {
    const batch = tasks.slice(i, i+20);
    await Promise.all(batch.map(t => fetchCoord(t.city, t.dist)));
  }

  fs.writeFileSync('district_coords.json', JSON.stringify(DISTRICT_COORDS, null, 2));
  console.log(`Saved ${Object.keys(DISTRICT_COORDS).length} coords to district_coords.json!`);
}
run();

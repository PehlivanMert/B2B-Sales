const fs = require('fs');
const path = require('path');

const inputPath = path.resolve('./final_agencies.json');
const outputPath = path.resolve('../frontend/public/agencies.json');
const allCitiesData = require('./all-city-district.json').city;

const CITY_COORDS = {
  "Adana": [37.0000, 35.3213], "Adıyaman": [37.7648, 38.2786], "Afyonkarahisar": [38.7507, 30.5567],
  "Ağrı": [39.7191, 43.0503], "Amasya": [40.6499, 35.8353], "Ankara": [39.9208, 32.8541],
  "Antalya": [36.8969, 30.7133], "Artvin": [41.1828, 41.8183], "Aydın": [37.8380, 27.8456],
  "Balıkesir": [39.6484, 27.8826], "Bilecik": [40.1451, 29.9798], "Bingöl": [38.8847, 40.4939],
  "Bitlis": [38.4006, 42.1095], "Bolu": [40.7392, 31.6116], "Burdur": [37.7183, 30.2823],
  "Bursa": [40.1828, 29.0667], "Çanakkale": [40.1553, 26.4142], "Çankırı": [40.6013, 33.6134],
  "Çorum": [40.5506, 34.9556], "Denizli": [37.7765, 29.0864], "Diyarbakır": [37.9144, 40.2306],
  "Edirne": [41.6771, 26.5557], "Elazığ": [38.6748, 39.2225], "Erzincan": [39.7500, 39.5000],
  "Erzurum": [39.9000, 41.2700], "Eskişehir": [39.7767, 30.5206], "Gaziantep": [37.0662, 37.3833],
  "Giresun": [40.9128, 38.3897], "Gümüşhane": [40.4600, 39.4814], "Hakkari": [37.5744, 43.7408],
  "Hatay": [36.2000, 36.1667], "Isparta": [37.7648, 30.5566], "Mersin": [36.8000, 34.6333],
  "İstanbul": [41.0082, 28.9784], "İzmir": [38.4192, 27.1287], "Kars": [40.6013, 43.0975],
  "Kastamonu": [41.3766, 33.7765], "Kayseri": [38.7312, 35.4787], "Kırklareli": [41.7333, 27.2167],
  "Kırşehir": [39.1425, 34.1639], "Kocaeli": [40.8533, 29.8815], "Konya": [37.8667, 32.4833],
  "Kütahya": [39.4167, 29.9833], "Malatya": [38.3552, 38.3095], "Manisa": [38.6191, 27.4289],
  "Kahramanmaraş": [37.5858, 36.9371], "Mardin": [37.3131, 40.7436], "Muğla": [37.2153, 28.3636],
  "Muş": [38.7369, 41.4883], "Nevşehir": [38.6250, 34.7122], "Niğde": [37.9667, 34.6833],
  "Ordu": [40.9839, 37.8764], "Rize": [41.0201, 40.5234], "Sakarya": [40.7569, 29.9765],
  "Samsun": [41.2867, 36.3300], "Siirt": [37.9333, 41.9500], "Sinop": [42.0231, 35.1531],
  "Sivas": [39.7477, 37.0179], "Tekirdağ": [40.9833, 27.5167], "Tokat": [40.3167, 36.5500],
  "Trabzon": [41.0015, 39.7178], "Tunceli": [39.1079, 39.5401], "Şanlıurfa": [37.1500, 38.8000],
  "Uşak": [38.6823, 29.4082], "Van": [38.4891, 43.3811], "Yozgat": [39.8181, 34.8147],
  "Zonguldak": [41.4564, 31.7762], "Aksaray": [38.3687, 34.0370], "Bayburt": [40.2552, 40.2249],
  "Karaman": [37.1811, 33.2222], "Kırıkkale": [39.8468, 33.5153], "Batman": [37.8812, 41.1351],
  "Şırnak": [37.5228, 42.4594], "Bartın": [41.6344, 32.3375], "Ardahan": [41.1105, 42.7022],
  "Iğdır": [39.9237, 44.0450], "Yalova": [40.6500, 29.2667], "Karabük": [41.2061, 32.6204],
  "Kilis": [36.7161, 37.1150], "Osmaniye": [37.0742, 36.2475], "Düzce": [40.8438, 31.1565]
};

// Inject MERKEZ to all cities because the dataset misses them
allCitiesData.forEach(city => {
  if (!city.discrits.includes('MERKEZ')) {
    city.discrits.push('MERKEZ');
  }
});

function normalizeTr(str) {
  if (!str) return "";
  return str.toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I').replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O')
    .replace(/I/g, 'I');
}

function cleanTitle(str) {
  if (!str) return "";
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
}

function processAgencies() {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  const processedData = data.map(agency => {
    const addressUpper = agency.address ? agency.address.toLocaleUpperCase('tr-TR') : "";
    let bestCity = null;
    let bestDist = null;

    // Helper to check if a word exists as a distinct token
    const hasWord = (text, word) => {
      // \p{L} matches any unicode letter. We want to ensure the word is not surrounded by other letters.
      const regex = new RegExp(`(?:^|[^\\p{L}])${word}(?:[^\\p{L}]|$)`, 'u');
      return regex.test(text);
    };

    // Use agency.city if available to restrict search and avoid false positives like 'KOCAELİ APT'
    if (agency.city) {
      const rawCity = agency.city.toLocaleUpperCase('tr-TR');
      const cityMatch = allCitiesData.find(c => c.name.toLocaleUpperCase('tr-TR') === rawCity || hasWord(rawCity, c.name.toLocaleUpperCase('tr-TR')));
      if (cityMatch) {
        bestCity = cityMatch.name;
      }
    }

    if (!bestCity) {
      for (const cityObj of allCitiesData) {
        if (hasWord(addressUpper, cityObj.name.toLocaleUpperCase('tr-TR'))) {
          bestCity = cityObj.name;
          break;
        }
      }
    }

    // Search address for district using the matched city (or all cities if not matched)
    const citiesToSearchAddress = bestCity ? [allCitiesData.find(c => c.name === bestCity)] : allCitiesData;
    for (const cityObj of citiesToSearchAddress) {
      if (!cityObj) continue;
      for (const dist of cityObj.discrits) {
        const distUpper = dist.toLocaleUpperCase('tr-TR');
        // Do not search for 'MERKEZ' in the raw address to avoid matching 'MERKEZ MAH' or 'MERKEZ CAD'.
        // Let it fall back to the agency.district column instead.
        if (distUpper === 'MERKEZ') continue;

        if (hasWord(addressUpper, distUpper)) {
          bestDist = dist;
          if (!bestCity) bestCity = cityObj.name;
          break;
        }
        if (distUpper === 'EYÜPSULTAN' && hasWord(addressUpper, 'EYÜP')) {
          bestDist = 'EYÜPSULTAN';
          if (!bestCity) bestCity = cityObj.name;
          break;
        }
      }
      if (bestDist) break;
    }

    // Fallback if not found in address: use the agency's original district field
    if (!bestDist && agency.district) {
      let rawDist = agency.district.toLocaleUpperCase('tr-TR');
      const citiesToSearch = bestCity ? allCitiesData.filter(c => c.name.toLocaleUpperCase('tr-TR') === bestCity.toLocaleUpperCase('tr-TR')) : allCitiesData;

      for (const cityObj of citiesToSearch) {
        for (const dist of cityObj.discrits) {
          const distUpper = dist.toLocaleUpperCase('tr-TR');
          
          if (hasWord(rawDist, distUpper) || rawDist === distUpper) {
            bestDist = dist;
            if (!bestCity) bestCity = cityObj.name;
            break;
          }

          // If the district is glued to the end of the string (e.g., ASELÇUKLU, 16AMERKEZ, FALANYA)
          if (normalizeTr(rawDist).endsWith(normalizeTr(distUpper))) {
            bestDist = dist;
            if (!bestCity) bestCity = cityObj.name;
            break;
          }

          // Specific handling for EYÜPSULTAN
          if (distUpper === 'EYÜPSULTAN' && rawDist.includes('EYÜP')) {
            bestDist = 'EYÜPSULTAN';
            if (!bestCity) bestCity = cityObj.name;
            break;
          }
        }
        if (bestDist) break;
      }
    }

    // If still null, try cleaning the raw district string as last resort
    if (!bestDist) {
      let rawDist = agency.district ? agency.district.toLocaleUpperCase('tr-TR') : "";
      if (rawDist.includes('MERKEZ')) {
        bestDist = 'MERKEZ';
      } else {
        rawDist = rawDist.replace(/^[0-9]+/, '').replace(/^(APT|NO|IC|KAPI|SK|MAH|CD|CADDESİ|MAHALLESİ|D|K|B|BLOK)\.?\s+/, '').replace(/^:/, '');
        bestDist = rawDist;
      }
    }

    if (!bestCity && agency.city) {
      bestCity = agency.city;
    }

    // Final formatting
    bestCity = cleanTitle(bestCity);
    bestDist = cleanTitle(bestDist);

    // Fix coordinates
    let lat = agency.lat;
    let lng = agency.lng;
    
    // We should overwrite scraper-generated coordinates that are just city centers.
    // However, if the agency has a TRULY unique coordinate (not exactly city center), we could keep it.
    // For safety and proper spreading, we will prioritize assigning our fetched district coords.
    
    let districtCoords = null;
    try {
      const allDistrictCoords = require('./district_coords.json');
      const upperCity = bestCity ? bestCity.toLocaleUpperCase('tr-TR') : '';
      const upperDist = bestDist ? bestDist.toLocaleUpperCase('tr-TR') : '';
      districtCoords = allDistrictCoords[`${upperCity}-${upperDist}`];
    } catch(e) {}

    if (districtCoords) {
      lat = districtCoords[0] + (Math.random() - 0.5) * 0.05;
      lng = districtCoords[1] + (Math.random() - 0.5) * 0.05;
    } else if (CITY_COORDS[bestCity]) {
      const baseCoords = CITY_COORDS[bestCity];
      lat = baseCoords[0] + (Math.random() - 0.5) * 0.1;
      lng = baseCoords[1] + (Math.random() - 0.5) * 0.1;
    } else {
      lat = 39.0;
      lng = 35.0;
    }
    
    return {
      ...agency,
      district: bestDist,
      city: bestCity,
      lat: lat,
      lng: lng,
      docId: agency.id.toString() 
    };
  });
  
  const publicDir = path.dirname(outputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
  console.log(`Successfully processed ${processedData.length} agencies. Output to ${outputPath}`);
}

processAgencies();

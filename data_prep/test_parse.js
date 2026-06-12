const fs = require('fs');
const allCitiesData = require('./all-city-district.json');
const agencies = require('./final_agencies.json');

const allCities = allCitiesData.city;

const testCases = agencies.slice(0, 10);
for(const agency of testCases) {
    const addressUpper = agency.address ? agency.address.toLocaleUpperCase('tr-TR') : "";
    let foundCityName = null;
    let foundDistrictName = null;

    for (const cityObj of allCities) {
        // use boundary or just includes?
        // if address contains "ADANADA", includes("ADANA") matches. But that's usually fine.
        if (addressUpper.includes(cityObj.name.toLocaleUpperCase('tr-TR'))) {
            // Found a city, but wait, multiple cities might match (e.g. "BATMAN" vs "KARAMAN" if we just do includes).
            // Actually, Turkish cities don't usually overlap.
            foundCityName = cityObj.name;
            for (const dist of cityObj.discrits) {
                // To avoid "MERKEZ" matching everywhere, we should be careful.
                // But most districts are unique strings.
                if (addressUpper.includes(dist.toLocaleUpperCase('tr-TR'))) {
                    foundDistrictName = dist;
                    break;
                }
            }
            if(foundDistrictName) break;
        }
    }
    
    // fallback to original city if address match failed
    if (!foundCityName && agency.city) {
        const origCity = agency.city.toLocaleUpperCase('tr-TR');
        const matched = allCities.find(c => origCity.includes(c.name.toLocaleUpperCase('tr-TR')));
        if (matched) {
            foundCityName = matched.name;
            for (const dist of matched.discrits) {
                if (addressUpper.includes(dist.toLocaleUpperCase('tr-TR'))) {
                    foundDistrictName = dist;
                    break;
                }
            }
        }
    }

    console.log(`Original: ${agency.address}`);
    console.log(`Parsed -> City: ${foundCityName}, District: ${foundDistrictName}`);
    console.log('---');
}

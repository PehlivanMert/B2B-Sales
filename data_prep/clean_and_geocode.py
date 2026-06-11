import sqlite3
import json
import random
import os
import re

DB_PATH = "../agencies_cache.db"
OUTPUT_JSON = "final_agencies.json"

TURKEY_CITIES = {
    "Adana": (37.0000, 35.3213), "Adıyaman": (37.7648, 38.2786), "Afyonkarahisar": (38.7507, 30.5567),
    "Ağrı": (39.7191, 43.0503), "Amasya": (40.6499, 35.8353), "Ankara": (39.9208, 32.8541),
    "Antalya": (36.8969, 30.7133), "Artvin": (41.1828, 41.8183), "Aydın": (37.8380, 27.8456),
    "Balıkesir": (39.6484, 27.8826), "Bilecik": (40.1451, 29.9798), "Bingöl": (38.8847, 40.4939),
    "Bitlis": (38.4006, 42.1095), "Bolu": (40.7392, 31.6116), "Burdur": (37.7183, 30.2823),
    "Bursa": (40.1828, 29.0667), "Çanakkale": (40.1553, 26.4142), "Çankırı": (40.6013, 33.6134),
    "Çorum": (40.5506, 34.9556), "Denizli": (37.7765, 29.0864), "Diyarbakır": (37.9144, 40.2306),
    "Edirne": (41.6771, 26.5557), "Elazığ": (38.6748, 39.2225), "Erzincan": (39.7500, 39.5000),
    "Erzurum": (39.9000, 41.2700), "Eskişehir": (39.7767, 30.5206), "Gaziantep": (37.0662, 37.3833),
    "Giresun": (40.9128, 38.3897), "Gümüşhane": (40.4600, 39.4814), "Hakkari": (37.5744, 43.7408),
    "Hatay": (36.2000, 36.1667), "Isparta": (37.7648, 30.5566), "Mersin": (36.8000, 34.6333),
    "İstanbul": (41.0082, 28.9784), "İzmir": (38.4192, 27.1287), "Kars": (40.6013, 43.0975),
    "Kastamonu": (41.3766, 33.7765), "Kayseri": (38.7312, 35.4787), "Kırklareli": (41.7333, 27.2167),
    "Kırşehir": (39.1425, 34.1639), "Kocaeli": (40.8533, 29.8815), "Konya": (37.8667, 32.4833),
    "Kütahya": (39.4167, 29.9833), "Malatya": (38.3552, 38.3095), "Manisa": (38.6191, 27.4289),
    "Kahramanmaraş": (37.5858, 36.9371), "Mardin": (37.3131, 40.7436), "Muğla": (37.2153, 28.3636),
    "Muş": (38.7369, 41.4883), "Nevşehir": (38.6250, 34.7122), "Niğde": (37.9667, 34.6833),
    "Ordu": (40.9839, 37.8764), "Rize": (41.0201, 40.5234), "Sakarya": (40.7569, 29.9765),
    "Samsun": (41.2867, 36.3300), "Siirt": (37.9333, 41.9500), "Sinop": (42.0231, 35.1531),
    "Sivas": (39.7477, 37.0179), "Tekirdağ": (40.9833, 27.5167), "Tokat": (40.3167, 36.5500),
    "Trabzon": (41.0015, 39.7178), "Tunceli": (39.1079, 39.5401), "Şanlıurfa": (37.1500, 38.8000),
    "Uşak": (38.6823, 29.4082), "Van": (38.4891, 43.3811), "Yozgat": (39.8181, 34.8147),
    "Zonguldak": (41.4564, 31.7762), "Aksaray": (38.3687, 34.0370), "Bayburt": (40.2552, 40.2249),
    "Karaman": (37.1811, 33.2222), "Kırıkkale": (39.8468, 33.5153), "Batman": (37.8812, 41.1351),
    "Şırnak": (37.5228, 42.4594), "Bartın": (41.6344, 32.3375), "Ardahan": (41.1105, 42.7022),
    "Iğdır": (39.9237, 44.0450), "Yalova": (40.6500, 29.2667), "Karabük": (41.2061, 32.6204),
    "Kilis": (36.7161, 37.1150), "Osmaniye": (37.0742, 36.2475), "Düzce": (40.8438, 31.1565)
}

def clean_tr(text):
    if not text: return ""
    return text.upper().replace('İ', 'I').replace('I', 'I').replace('Ş', 'S').replace('Ğ', 'G').replace('Ü', 'U').replace('Ö', 'O').replace('Ç', 'C')

def parse_address(address):
    if not address:
        return "Unknown", "Unknown"
    
    # Clean address for easier parsing
    addr_upper = clean_tr(address)
    
    # Find matching city
    found_city = "Unknown"
    found_city_key = None
    
    # Iterate cities to find a match at the end or anywhere
    for city_key in TURKEY_CITIES.keys():
        city_clean = clean_tr(city_key)
        # If city name is isolated near the end
        if re.search(r'\b' + city_clean + r'\b', addr_upper):
            found_city = city_key
            found_city_key = city_clean
            break

    district = "Unknown"
    if found_city != "Unknown" and found_city_key:
        # Try to find the word immediately before the city or before a slash/dash
        # e.g., "KADIKOY / ISTANBUL", "KADIKOY-ISTANBUL", "KADIKOY ISTANBUL"
        pattern = r'(\w+)\s*[/\-]?\s*' + found_city_key
        match = re.search(pattern, addr_upper)
        if match:
            district_raw = match.group(1)
            # Avoid picking up numbers or single letters
            if len(district_raw) > 2 and not district_raw.isdigit():
                district = district_raw.title()
                
    return found_city, district

def mock_geocode(city):
    """
    Get actual coordinates of the city and add a tiny random variation
    so markers don't overlap completely.
    """
    if city in TURKEY_CITIES:
        lat, lng = TURKEY_CITIES[city]
        # +/- 0.05 degrees is roughly +/- 5km, good enough to scatter them in the city
        return lat + random.uniform(-0.05, 0.05), lng + random.uniform(-0.05, 0.05)
        
    # Default fallback (center of Turkey)
    return 39.0 + random.uniform(-2, 2), 35.0 + random.uniform(-2, 2)

def extract_website(email):
    if not email or '@' not in email:
        return None
    domain = email.split('@')[1]
    # Filter out common freemail domains
    freemails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'yandex.com']
    if domain.lower() in freemails:
        return None
    return f"https://www.{domain}"

def main():
    # Because script runs in data_prep/ we check if DB is in parent dir
    # Or absolute path if relative fails
    db_file = DB_PATH
    if not os.path.exists(db_file):
        db_file = "/home/mert/Masaüstü/B2B Sales/agencies_cache.db"
        if not os.path.exists(db_file):
            print("Veritabanı bulunamadı!")
            return

    print(f"Connecting to {db_file}...")
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM agencies")
    rows = cursor.fetchall()
    
    agencies_list = []
    
    for row in rows:
        address = row['address']
        city, district = parse_address(address)
        lat, lng = mock_geocode(city)
        website = extract_website(row['email'])
        
        agency = {
            "id": row['id'],
            "tursab_no": row['belge_no'],
            "name": row['agency_name'],
            "phone": row['phone'],
            "email": row['email'],
            "website": website,
            "address": address,
            "city": city,
            "district": district,
            "btk": row['btk'],
            "lat": lat,
            "lng": lng,
            "is_active": True # Default value
        }
        agencies_list.append(agency)
        
    conn.close()
    
    print(f"Processed {len(agencies_list)} agencies. Writing to {OUTPUT_JSON}...")
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(agencies_list, f, ensure_ascii=False, indent=2)
        
    print("Geocoding and data cleaning completed successfully.")

if __name__ == "__main__":
    main()

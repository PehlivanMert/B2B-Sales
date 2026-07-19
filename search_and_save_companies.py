import requests
import json
import uuid
import os
import time

API_KEY = "AIzaSyAke5oW_vKW1DyQ_3y960xb6u9hookFf2w"
URL = "https://places.googleapis.com/v1/places:searchText"
JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "companies.json")

def load_companies():
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except:
            pass
    return []

def save_companies(companies):
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)

def search_companies(query):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType"
    }
    
    payload = {
        "textQuery": query,
        "languageCode": "tr",
        "maxResultCount": 20
    }
    
    results = []
    try:
        response = requests.post(URL, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            for place in data.get("places", []):
                name = place.get("displayName", {}).get("text", "")
                if not name: continue
                
                address = place.get("formattedAddress", "")
                
                # Sadece şehir tahmini (Kocaeli, Ankara vs.)
                city = "Bilinmiyor"
                for c in ["İstanbul", "Ankara", "İzmir", "Bursa", "Kocaeli", "Gaziantep", "Konya", "Kayseri", "Adana"]:
                    if c.lower() in address.lower():
                        city = c
                        break
                        
                results.append({
                    "name": name,
                    "address": address,
                    "phone": place.get("nationalPhoneNumber", ""),
                    "website": place.get("websiteUri", ""),
                    "sector": place.get("primaryType", "Sanayi").replace('_', ' ').title(),
                    "city": city,
                    "district": ""
                })
        else:
            print("API Hatası:", response.status_code, response.text)
    except Exception as e:
        print("İstek Hatası:", e)
        
    return results

def main():
    queries = [
        "Gebze OSB fabrikalar",
        "Ankara OSTİM üretici firmalar",
        "İzmir Atatürk OSB sanayi şirketleri",
        "Bursa Demirtaş OSB otomotiv yan sanayi",
        "Kayseri OSB mobilya fabrikaları",
        "Gaziantep OSB tekstil fabrikaları",
        "İstanbul Dudullu OSB makine üreticileri",
        "Kocaeli plastik ve kauçuk fabrikaları"
    ]
    
    existing = load_companies()
    max_id = max((int(a.get('id', 0)) for a in existing if str(a.get('id')).isdigit()), default=0)
    
    added = 0
    for query in queries:
        print(f"Araştırılıyor: {query}...")
        firms = search_companies(query)
        for firm in firms:
            # Check for duplicates
            if not any(f.get('name') == firm['name'] for f in existing):
                max_id += 1
                existing.append({
                    "id": str(max_id),
                    "docId": str(uuid.uuid4()),
                    "name": firm['name'],
                    "city": firm['city'],
                    "district": firm['district'],
                    "tax_no": "",
                    "sector": firm['sector'],
                    "status": "AKTİF",
                    "source": "Google B2B Arama",
                    "address": firm['address'],
                    "phone": firm['phone'],
                    "website": firm['website']
                })
                added += 1
        time.sleep(2) # be nice to API
        
    if added > 0:
        save_companies(existing)
        print(f"\n🎉 {added} yepyeni ve detaylı şirket sisteme eklendi!")
    else:
        print("\n⚡ Yeni şirket bulunamadı.")

if __name__ == "__main__":
    main()

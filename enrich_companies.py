import json
import os
import requests
import time

API_KEY = "AIzaSyAke5oW_vKW1DyQ_3y960xb6u9hookFf2w"
URL = "https://places.googleapis.com/v1/places:searchText"
JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "companies.json")

def load_companies():
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    return []

def save_companies(companies):
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)

def fetch_place_details(company_name, city):
    query = f"{company_name} {city}"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri"
    }
    
    payload = {
        "textQuery": query,
        "languageCode": "tr"
    }
    
    try:
        response = requests.post(URL, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            places = data.get("places", [])
            if places:
                # Get the first matching place
                place = places[0]
                return {
                    "address": place.get("formattedAddress", ""),
                    "phone": place.get("nationalPhoneNumber", ""),
                    "website": place.get("websiteUri", "")
                }
    except Exception as e:
        print(f"Hata ({query}): {e}")
        
    return None

def main():
    print("🚀 Şirket verileri Google Haritalar kullanılarak zenginleştiriliyor...")
    companies = load_companies()
    
    updated_count = 0
    for comp in companies:
        # Check if we already have the data
        if comp.get("phone") and comp.get("address"):
            continue
            
        print(f"[{comp['id']}] Aranıyor: {comp['name']} ({comp['city']})...", end=" ", flush=True)
        details = fetch_place_details(comp['name'], comp['city'])
        
        if details:
            comp["address"] = details["address"]
            comp["phone"] = details["phone"]
            comp["website"] = details["website"]
            updated_count += 1
            print("✅ Bulundu!")
        else:
            print("❌ Bulunamadı.")
            
        # Uyku süresi API sınırlarına takılmamak için
        time.sleep(1)
        
    if updated_count > 0:
        save_companies(companies)
        print(f"\n🎉 İşlem tamamlandı. {updated_count} şirketin iletişim bilgisi güncellendi!")
    else:
        print("\n⚡ Güncellenecek yeni veri bulunamadı veya tüm şirketler zaten güncel.")

if __name__ == "__main__":
    main()

import requests
import json
import uuid
import os
import time

API_KEY = "AIzaSyAke5oW_vKW1DyQ_3y960xb6u9hookFf2w"
URL = "https://places.googleapis.com/v1/places:searchText"
JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "companies.json")

CITIES = [
    # Marmara
    "İstanbul", "Kocaeli", "Bursa", "Tekirdağ", "Sakarya", "Balıkesir",
    # Ege
    "İzmir", "Manisa", "Denizli", "Aydın",
    # Akdeniz
    "Antalya", "Adana", "Mersin", "Hatay",
    # İç Anadolu
    "Ankara", "Konya", "Kayseri", "Eskişehir",
    # Karadeniz
    "Samsun", "Trabzon", "Zonguldak"
]

SECTORS = [
    "Makine İmalat Sanayi",
    "Otomotiv ve Yan Sanayi",
    "Tekstil ve Konfeksiyon Fabrikası",
    "Gıda ve İçecek Üretimi",
    "Plastik ve Kauçuk Sanayi",
    "Metal Sanayi",
    "Mobilya Üretimi",
    "Kimya Sanayi"
]

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

def fetch_page(query, page_token=None):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,nextPageToken"
    }
    
    payload = {
        "textQuery": query,
        "languageCode": "tr",
        "maxResultCount": 20
    }
    
    if page_token:
        payload["pageToken"] = page_token
        
    try:
        res = requests.post(URL, json=payload, headers=headers, timeout=15)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"  [!] Ağ Hatası: {e}")
    return {}

def main():
    print("🚀 Devasa Şirket Tarama Robotu (Mass Scraper) Başlıyor...")
    print(f"Hedef: {len(CITIES)} Şehir x {len(SECTORS)} Sektör = {len(CITIES)*len(SECTORS)} Farklı Arama Kombinasyonu\n")
    
    existing = load_companies()
    existing_names = {comp['name'] for comp in existing}
    max_id = max((int(a.get('id', 0)) for a in existing if str(a.get('id')).isdigit()), default=0)
    
    total_added = 0
    query_count = 0
    
    # Tüm şehir x sektör kombinasyonlarını gez
    for city in CITIES:
        for sector in SECTORS:
            query = f"{city} {sector}"
            print(f"🔍 Aranan: '{query}'")
            
            page_token = None
            pages_fetched = 0
            
            while pages_fetched < 3: # En fazla 3 sayfa (60 sonuç) çek
                data = fetch_page(query, page_token)
                places = data.get("places", [])
                
                added_in_page = 0
                for place in places:
                    name = place.get("displayName", {}).get("text", "")
                    if not name or name in existing_names: continue
                    
                    max_id += 1
                    address = place.get("formattedAddress", "")
                    existing_names.add(name)
                    
                    existing.append({
                        "id": str(max_id),
                        "docId": str(uuid.uuid4()),
                        "name": name,
                        "city": city,
                        "district": "",
                        "tax_no": "",
                        "sector": sector,
                        "status": "AKTİF",
                        "source": "Google Mass Scraper",
                        "address": address,
                        "phone": place.get("nationalPhoneNumber", ""),
                        "website": place.get("websiteUri", "")
                    })
                    added_in_page += 1
                    total_added += 1
                
                print(f"  -> Sayfa {pages_fetched+1}: {len(places)} bulundu, {added_in_page} yeni eklendi.")
                
                page_token = data.get("nextPageToken")
                pages_fetched += 1
                
                if not page_token:
                    break
                
                time.sleep(2) # Sayfalar arası bekleme
                
            query_count += 1
            
            # Her 5 sorguda bir diske kaydet (Güvenlik için)
            if query_count % 5 == 0:
                save_companies(existing)
                print(f"💾 Ara Kayıt: {total_added} yeni firma companies.json'a kaydedildi.")
                
            # Kısa bir demo olması için (aksi takdirde script saatlerce sürer)
            # Güvenlik freni kaldırıldı: Tam tarama yapılıyor.
            # if query_count >= 15:
            #     save_companies(existing)
            #     print(f"\n🎉 DEMO BİTİŞİ: Toplam {total_added} yeni şirket eklendi!")
            #     return
                
            time.sleep(1) # Sorgular arası bekleme

    # Döngü tamamen bitince son kayıt
    save_companies(existing)
    print(f"\n✅ Tarama Tamamlandı! Toplam {total_added} yeni şirket eklendi!")

if __name__ == "__main__":
    main()

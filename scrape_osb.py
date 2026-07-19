import requests
from bs4 import BeautifulSoup
import json
import uuid
import os
import time

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "companies.json")

def load_existing_companies():
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except:
            return []
    return []

def save_companies(companies):
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=2)

def scrape_gebze_osb():
    print("Gebze OSB (Marmara) taranıyor...")
    # Örnek scraping mantığı (Gerçek URL ve HTML yapısına göre uyarlanmalıdır)
    # Gebze OSB firmaları genelde bir listeleme sayfasında bulunur.
    # url = "https://www.gosb.com.tr/firmalar"
    
    # Simüle edilmiş veri (Gerçek projede request ile çekilecek)
    simulated_data = [
        {"name": "ARÇELİK A.Ş.", "sector": "Elektronik", "district": "Gebze", "city": "Kocaeli"},
        {"name": "PROCTER & GAMBLE", "sector": "Kimya", "district": "Gebze", "city": "Kocaeli"},
        {"name": "ASELSAN", "sector": "Savunma Sanayi", "district": "Yenimahalle", "city": "Ankara"},
        {"name": "VAKKO", "sector": "Tekstil", "district": "Esenyurt", "city": "İstanbul"}
    ]
    
    return simulated_data

def main():
    existing = load_existing_companies()
    max_id = max((int(a.get('id', 0)) for a in existing if str(a.get('id')).isdigit()), default=0)
    
    new_firms = scrape_gebze_osb()
    added_count = 0
    
    for firm in new_firms:
        # Check if already exists
        exists = any(f.get('name') == firm['name'] for f in existing)
        if not exists:
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
                "source": "OSB Rehberi"
            })
            added_count += 1
            
    if added_count > 0:
        save_companies(existing)
        print(f"Başarıyla {added_count} yeni firma companies.json dosyasına eklendi.")
    else:
        print("Yeni firma bulunamadı, veritabanı güncel.")

if __name__ == "__main__":
    main()

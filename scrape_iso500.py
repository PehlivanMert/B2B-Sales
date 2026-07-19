import requests
import json
import uuid
import os

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "companies.json")

def scrape_iso500():
    url = "https://www.iso500.org.tr/Default/GetList"
    
    # DataTables payload for ISO 500
    payload = {
        "draw": "1",
        "start": "0",
        "length": "500",
        "yil": "2023",
        "listType": "iso500"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        response = requests.post(url, data=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            firms = data.get("data", [])
            print(f"{len(firms)} adet firma bulundu.")
            
            companies = []
            for firm in firms:
                companies.append({
                    "id": str(firm.get("Sira", "")),
                    "docId": str(uuid.uuid4()),
                    "name": firm.get("KurulusAdi", "").title(),
                    "city": firm.get("Il", "İstanbul").title(),
                    "district": "",
                    "tax_no": "",
                    "sector": "İSO 500",
                    "status": "AKTİF",
                    "source": "İSO 500 - 2023"
                })
                
            with open(JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(companies, f, ensure_ascii=False, indent=2)
            print("Veriler companies.json dosyasına kaydedildi.")
        else:
            print("API yanıt vermedi (Hata kodu:", response.status_code, "). Yedek veri kullanılıyor...")
            use_dummy_data()
    except Exception as e:
        print("Hata:", e, "Yedek veri kullanılıyor...")
        use_dummy_data()

def use_dummy_data():
    existing = []
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list): existing = data
        except: pass
        
    max_id = max((int(a.get('id', 0)) for a in existing if str(a.get('id')).isdigit()), default=0)
    
    dummy_iso500 = [
        {"name": "TÜPRAŞ - TÜRKİYE PETROL RAFİNERİLERİ A.Ş.", "city": "Kocaeli", "sector": "Petrol Rafinerisi"},
        {"name": "FORD OTOMOTİV SANAYİ A.Ş.", "city": "Kocaeli", "sector": "Otomotiv"},
        {"name": "STAR RAFİNERİ A.Ş.", "city": "İzmir", "sector": "Petrol Rafinerisi"},
        {"name": "İSTANBUL ALTIN RAFİNERİSİ A.Ş.", "city": "İstanbul", "sector": "Kıymetli Madenler"}
    ]
    
    for firm in dummy_iso500:
        if not any(f.get('name') == firm['name'] for f in existing):
            max_id += 1
            existing.append({
                "id": str(max_id),
                "docId": str(uuid.uuid4()),
                "name": firm['name'],
                "city": firm['city'],
                "district": "",
                "tax_no": "",
                "sector": firm['sector'],
                "status": "AKTİF",
                "source": "İSO 500 - 2023"
            })
            
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print("İSO 500 yedek verileri başarıyla eklendi.")

if __name__ == "__main__":
    scrape_iso500()

import os
import time
import json
import uuid
import requests
from bs4 import BeautifulSoup
import concurrent.futures
import re

URL = "https://online.tursab.org.tr/publicpages/embedded/agencysearch/"
JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "agencies.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': URL,
    'Origin': 'https://online.tursab.org.tr'
}

def get_initial_tokens():
    session = requests.Session()
    resp = session.get(URL, headers=HEADERS)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    viewstate = soup.find('input', {'name': '__VIEWSTATE'}).get('value')
    eventvalidation = soup.find('input', {'name': '__EVENTVALIDATION'}).get('value')
    generator = soup.find('input', {'name': '__VIEWSTATEGENERATOR'}).get('value')
    return viewstate, eventvalidation, generator

def clean_district_smart(token, valid_districts):
    token = re.sub(r'^NO:?', '', token, flags=re.IGNORECASE)
    token = re.sub(r'^[^\w]+', '', token)
    token_upper = token.replace("i", "İ").replace("ı", "I").upper()
    
    best_match = ""
    for vd in valid_districts:
        vd_compact = vd.replace(" ", "")
        if token_upper.endswith(vd_compact):
            if len(vd) > len(best_match):
                best_match = vd
    
    if best_match:
        return best_match.title()
        
    token = re.sub(r'\d+', '', token)
    token = re.sub(r'^[^\w]+', '', token)
    # Strip any leading standalone letter like A, B, C, D if it looks like block
    token = re.sub(r'^[A-Ea-e](?=[A-Za-zçğıöşüÇĞİÖŞÜ]{3,})', '', token)
    if not token: return ""
    return token.capitalize()

def parse_html(html_content, max_id, tursab_target, valid_districts):
    soup = BeautifulSoup(html_content, 'html.parser')
    containers = soup.find_all(class_='lit-container')
    agencies = []
    
    for container in containers:
        rows = container.find_all(class_='w3-row', recursive=False)
        if len(rows) < 3:
            continue
            
        row0_cols = rows[0].find_all(recursive=False)
        if len(row0_cols) < 4:
            continue
            
        belge_no = row0_cols[0].get_text(strip=True)
        if belge_no != str(tursab_target):
            continue
        
        agency_name_raw = row0_cols[1].get_text(strip=True)
        agency_name = agency_name_raw.replace("Seyahat Acentası Adı :", "").strip()
        
        phone_fax_raw = row0_cols[2].get_text(strip=True)
        phone = ""
        fax = ""
        if "Telefon :" in phone_fax_raw:
            phone_part = phone_fax_raw.split("Telefon :")[1]
            if "Faks :" in phone_part:
                phone, fax_part = phone_part.split("Faks :")
                fax = fax_part.strip()
                phone = phone.strip()
            else:
                phone = phone_part.strip()
                
        email_raw = row0_cols[3].get_text(strip=True)
        email = email_raw.replace("Email :", "").strip()
        
        address_raw = rows[1].get_text(strip=True)
        address = address_raw.replace("Adres :", "").strip()
        
        btk_raw = rows[2].get_text(strip=True)
        btk = btk_raw.replace("BTK :", "").strip()

        # Simple city extraction logic
        city = ""
        district = ""
        address_upper = address.upper()
        if "/" in address_upper:
            parts = address_upper.split("/")
            if len(parts) >= 2:
                city_raw = parts[-1].strip().split(" ")[0]
                last_token = parts[-2].split()[-1]
                city = city_raw.capitalize()
                district = clean_district_smart(last_token, valid_districts)
        
        doc_id = str(uuid.uuid4())
        
        agencies.append({
            "id": max_id + 1,
            "tursab_no": belge_no,
            "name": agency_name,
            "phone": phone,
            "email": email,
            "website": "",
            "address": address,
            "city": city,
            "district": district,
            "btk": btk,
            "lat": 0.0,
            "lng": 0.0,
            "is_active": True,
            "docId": doc_id
        })
        
    return agencies

def scrape_number(no, viewstate, eventvalidation, generator, max_id, valid_districts):
    payload = {
        'RadScriptManager_TSM': '',
        '__VIEWSTATE': viewstate,
        '__VIEWSTATEGENERATOR': generator,
        '__EVENTVALIDATION': eventvalidation,
        'ctl00$ContentPlaceHolder1$OprGroup': 'NameSearchRadio',
        'ctl00$ContentPlaceHolder1$TursabNo$AutoCompleteTextBox': '',
        'ctl00$ContentPlaceHolder1$TursabNo$AutoCompleteTextBoxHF': '',
        'ctl00$ContentPlaceHolder1$TursabNo$AutoCompleteTextBoxTF': '',
        'ctl00$ContentPlaceHolder1$TursabNoText': str(no),
        'ctl00$ContentPlaceHolder1$SearchButton': 'ARA'
    }
    
    try:
        resp = requests.post(URL, data=payload, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return no, []
            
        html = resp.text
        if "Arama kriterlerinize uygun sonuç bulunamamıştır!" in html:
            return no, []
            
        agencies = parse_html(html, max_id, no, valid_districts)
        return no, agencies
    except Exception as e:
        print(f"[{no}] Hata: {e}")
        return no, []

def main():
    if not os.path.exists(JSON_PATH):
        print(f"JSON dosyası bulunamadı: {JSON_PATH}")
        return
        
    print("Mevcut JSON yükleniyor...")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    max_tursab = max((int(a.get('tursab_no', 0)) for a in data if str(a.get('tursab_no', '')).isdigit()), default=0)
    max_id = max((int(a.get('id', 0)) for a in data), default=0)
    
    valid_districts = set()
    for a in data:
        if str(a.get("id")) <= "17144":
            d = a.get("district")
            if d and isinstance(d, str):
                valid_districts.add(d.strip().upper())
    
    print(f"Mevcut en yüksek TÜRSAB No: {max_tursab}")
    print(f"Mevcut en yüksek ID: {max_id}")
    
    # Sadece 10 tane yeni numara tara (test amaçlı)
    target_count = 10
    start_num = max_tursab + 1
    end_num = start_num + target_count
    
    numbers_to_scrape = list(range(start_num, end_num))
    print(f"{start_num} ile {end_num - 1} arasındaki {target_count} numara taranıyor...")
    
    viewstate, eventvalidation, generator = get_initial_tokens()
    new_agencies = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(scrape_number, no, viewstate, eventvalidation, generator, max_id + i, valid_districts): no 
            for i, no in enumerate(numbers_to_scrape)
        }
        
        for future in concurrent.futures.as_completed(futures):
            no = futures[future]
            try:
                _, agencies = future.result()
                if agencies:
                    new_agencies.extend(agencies)
                    print(f"[{no}] Eklendi: {agencies[0]['name']}")
                else:
                    print(f"[{no}] Bulunamadı.")
            except Exception as e:
                print(f"[{no}] İstisna fırlatıldı: {e}")

    if new_agencies:
        print(f"Toplam {len(new_agencies)} yeni acente bulundu. JSON güncelleniyor...")
        data.extend(new_agencies)
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Başarıyla kaydedildi.")
    else:
        print("Yeni acente bulunamadı. JSON güncellenmedi.")

if __name__ == "__main__":
    main()

import os
import random
import time
import concurrent.futures
import requests
from bs4 import BeautifulSoup
import pandas as pd

URL = "https://online.tursab.org.tr/publicpages/embedded/agencysearch/"
EXCEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agency.xlsx")

# Headers to make the requests look like they come from a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': URL,
    'Origin': 'https://online.tursab.org.tr'
}

def get_initial_tokens():
    print("Fetching initial page and tokens...")
    session = requests.Session()
    resp = session.get(URL, headers=HEADERS)
    resp.raise_for_status()
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    viewstate = soup.find('input', {'name': '__VIEWSTATE'}).get('value')
    eventvalidation = soup.find('input', {'name': '__EVENTVALIDATION'}).get('value')
    generator = soup.find('input', {'name': '__VIEWSTATEGENERATOR'}).get('value')
    
    return viewstate, eventvalidation, generator

def parse_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    containers = soup.find_all(class_='lit-container')
    agencies = []
    
    for container in containers:
        rows = container.find_all(class_='w3-row', recursive=False)
        if len(rows) < 3:
            continue
            
        # Row 0: Basic Info (Belge No, Acente Adı, Telefon/Faks, Email)
        row0_cols = rows[0].find_all(recursive=False)
        if len(row0_cols) < 4:
            continue
            
        belge_no = row0_cols[0].get_text(strip=True)
        
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
        
        # Row 1: Address
        address_raw = rows[1].get_text(strip=True)
        address = address_raw.replace("Adres :", "").strip()
        
        # Row 2: BTK
        btk_raw = rows[2].get_text(strip=True)
        btk = btk_raw.replace("BTK :", "").strip()
        
        agencies.append({
            'Belge No': belge_no,
            'Acente Adı': agency_name,
            'Telefon': phone,
            'Faks': fax,
            'E-posta': email,
            'Adres': address,
            'BTK': btk
        })
        
    return agencies

def scrape_number(no, viewstate, eventvalidation, generator):
    # Sleep a random delay between 0.5 and 2.5 seconds to distribute concurrency randomly
    delay = random.uniform(0.5, 2.5)
    time.sleep(delay)
    
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
            print(f"[{no}] Error: status code {resp.status_code}")
            return no, []
            
        html = resp.text
        if "Arama kriterlerinize uygun sonuç bulunamamıştır!" in html:
            print(f"[{no}] No results found.")
            return no, []
            
        agencies = parse_html(html)
        print(f"[{no}] Found {len(agencies)} agency records.")
        return no, agencies
        
    except Exception as e:
        print(f"[{no}] Error querying: {e}")
        return no, []

def main():
    start_time = time.time()
    viewstate, eventvalidation, generator = get_initial_tokens()
    
    numbers = list(range(1, 101))
    all_agencies = []
    
    print("Starting concurrent scraping of document numbers 1 to 100...")
    # Using 5 concurrent workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(scrape_number, no, viewstate, eventvalidation, generator): no 
            for no in numbers
        }
        
        for future in concurrent.futures.as_completed(futures):
            no = futures[future]
            try:
                _, agencies = future.result()
                all_agencies.extend(agencies)
            except Exception as e:
                print(f"[{no}] Future raised exception: {e}")

    print(f"Scraping completed. Total agencies/branches found: {len(all_agencies)}")
    
    # Save to Excel
    df = pd.DataFrame(all_agencies)
    if df.empty:
        # Create an empty DataFrame with target columns if no records were found
        df = pd.DataFrame(columns=['Belge No', 'Acente Adı', 'Telefon', 'Faks', 'E-posta', 'Adres', 'BTK'])
    
    # Write to Excel with nice formatting
    writer = pd.ExcelWriter(EXCEL_PATH, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Acenteler')
    
    # Get workbook and sheet objects to adjust formatting
    workbook = writer.book
    worksheet = writer.sheets['Acenteler']
    
    # Enable grid lines
    worksheet.views.sheetView[0].showGridLines = True
    
    # Auto-adjust column widths
    for col in worksheet.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            val = str(cell.value or '')
            if len(val) > max_len:
                max_len = len(val)
        worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)
        
    writer.close()
    
    duration = time.time() - start_time
    print(f"Excel file successfully created at: {EXCEL_PATH}")
    print(f"Process took {duration:.2f} seconds.")

if __name__ == "__main__":
    main()

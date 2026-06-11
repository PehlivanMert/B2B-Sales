import os
import sys
import random
import time
import sqlite3
import concurrent.futures
import requests
from bs4 import BeautifulSoup
import pandas as pd

URL = "https://online.tursab.org.tr/publicpages/embedded/agencysearch/"
DB_PATH = "/home/mert/agencies_cache.db"
EXCEL_PATH = "/home/mert/agency.xlsx"

# Headers to mimic a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': URL,
    'Origin': 'https://online.tursab.org.tr'
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Table to track which document numbers have been queried
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS queries (
            document_no INTEGER PRIMARY KEY,
            status TEXT,
            queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Table to store found agencies
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            belge_no TEXT,
            agency_name TEXT,
            phone TEXT,
            fax TEXT,
            email TEXT,
            address TEXT,
            btk TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def get_queried_numbers():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT document_no FROM queries')
    rows = cursor.fetchall()
    conn.close()
    return {row[0] for row in rows}

def save_not_found(no):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT OR REPLACE INTO queries (document_no, status) VALUES (?, ?)', (no, 'not_found'))
        conn.commit()
    except Exception as e:
        print(f"[{no}] DB Save Error (not_found): {e}")
    finally:
        conn.close()

def save_found(no, agencies):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT OR REPLACE INTO queries (document_no, status) VALUES (?, ?)', (no, 'found'))
        for agency in agencies:
            cursor.execute('''
                INSERT INTO agencies (belge_no, agency_name, phone, fax, email, address, btk)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                agency['Belge No'],
                agency['Acente Adı'],
                agency['Telefon'],
                agency['Faks'],
                agency['E-posta'],
                agency['Adres'],
                agency['BTK']
            ))
        conn.commit()
    except Exception as e:
        print(f"[{no}] DB Save Error (found): {e}")
    finally:
        conn.close()

def get_initial_tokens():
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
        
        address_raw = rows[1].get_text(strip=True)
        address = address_raw.replace("Adres :", "").strip()
        
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

def scrape_number(no, viewstate, eventvalidation, generator, attempt=1):
    # Sleep a random delay between 0.2 and 1.2 seconds to spread out request times
    delay = random.uniform(0.2, 1.2)
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
        resp = requests.post(URL, data=payload, headers=HEADERS, timeout=20)
        
        if resp.status_code == 429 or resp.status_code == 503:
            # Server is rate-limiting or overloaded. Backoff and retry.
            backoff = attempt * 5 + random.uniform(2, 5)
            print(f"[{no}] Rate limited/Server Error ({resp.status_code}). Sleeping {backoff:.1f}s (Attempt {attempt})...")
            time.sleep(backoff)
            if attempt < 3:
                return scrape_number(no, viewstate, eventvalidation, generator, attempt + 1)
            else:
                return False
                
        if resp.status_code != 200:
            print(f"[{no}] HTTP Error {resp.status_code}")
            return False
            
        html = resp.text
        if "Arama kriterlerinize uygun sonuç bulunamamıştır!" in html:
            save_not_found(no)
            return True
            
        agencies = parse_html(html)
        if agencies:
            save_found(no, agencies)
            print(f"[{no}] Found {len(agencies)} agency records. Saved to DB.")
        else:
            save_not_found(no)
            
        return True
        
    except requests.RequestException as e:
        # Connection issues
        backoff = attempt * 5 + random.uniform(2, 5)
        print(f"[{no}] Network error: {e}. Retrying after {backoff:.1f}s...")
        time.sleep(backoff)
        if attempt < 3:
            return scrape_number(no, viewstate, eventvalidation, generator, attempt + 1)
        return False

def export_to_excel():
    print("Compiling DB data and exporting to Excel...")
    if not os.path.exists(DB_PATH):
        print("No database file found to export.")
        return
        
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT belge_no AS [Belge No], agency_name AS [Acente Adı], phone AS [Telefon], fax AS [Faks], email AS [E-posta], address AS [Adres], btk AS [BTK] FROM agencies", conn)
    conn.close()
    
    print(f"Total records in DB to export: {len(df)}")
    
    # Save to Excel with nice formatting
    writer = pd.ExcelWriter(EXCEL_PATH, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Acenteler')
    
    workbook = writer.book
    worksheet = writer.sheets['Acenteler']
    
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
    print(f"Excel file updated at: {EXCEL_PATH}")

def main():
    init_db()
    
    print("Getting viewstate tokens...")
    try:
        viewstate, eventvalidation, generator = get_initial_tokens()
    except Exception as e:
        print(f"Failed to get initial tokens: {e}. Exiting.")
        sys.exit(1)
        
    queried = get_queried_numbers()
    total_to_query = list(range(1, 25001))
    remaining = [no for no in total_to_query if no not in queried]
    
    print(f"Total numbers to query: {len(total_to_query)}")
    print(f"Already queried: {len(queried)}")
    print(f"Remaining: {len(remaining)}")
    
    if not remaining:
        print("All numbers already queried. Exporting Excel.")
        export_to_excel()
        return

    # Using 25 concurrent threads
    max_workers = 25
    print(f"Starting execution with {max_workers} threads...")
    
    start_time = time.time()
    last_export_time = time.time()
    
    completed_count = 0
    total_remaining = len(remaining)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit tasks
        futures = {
            executor.submit(scrape_number, no, viewstate, eventvalidation, generator): no 
            for no in remaining
        }
        
        for future in concurrent.futures.as_completed(futures):
            no = futures[future]
            try:
                success = future.result()
                if success:
                    completed_count += 1
                    
                # Periodic logging & Excel export (every 500 completed items or 60 seconds)
                if completed_count % 200 == 0 or (time.time() - last_export_time > 60):
                    elapsed = time.time() - start_time
                    percent = (completed_count / total_remaining) * 100
                    rate = completed_count / elapsed if elapsed > 0 else 0
                    eta = (total_remaining - completed_count) / rate if rate > 0 else 0
                    print(f"Progress: {completed_count}/{total_remaining} ({percent:.1f}%) | Speed: {rate:.2f} req/s | ETA: {eta/60:.1f} mins")
                    export_to_excel()
                    last_export_time = time.time()
                    
            except Exception as e:
                print(f"[{no}] Thread exception: {e}")
                
    # Final export
    export_to_excel()
    print("Scraping completed!")

if __name__ == "__main__":
    main()

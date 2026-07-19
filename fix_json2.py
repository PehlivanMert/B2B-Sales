import json
import re

JSON_PATH = "frontend/public/agencies.json"

def clean_district(token):
    # Remove "NO:" prefix
    token = re.sub(r'^NO:?', '', token, flags=re.IGNORECASE)
    # Remove leading numbering artifacts like "43B", "B142", "12", "106", "38C"
    # It optionally matches a starting letter, then digits, then an optional letter
    token = re.sub(r'^[A-Za-z]?\d+[A-Za-z]?', '', token)
    # Remove any non-alphabetic chars at the start (like hyphens)
    token = re.sub(r'^[^a-zA-ZçÇğĞıİöÖşŞüÜ]+', '', token)
    
    if not token:
        return ""
        
    token = token.replace("I", "ı").replace("İ", "i").lower()
    return token.capitalize()

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

for agency in data:
    if agency.get("tursab_no") in ["18869", "18871", "18870", "18872", "18873", "18875", "18874", "18876", "18877", "18878", "18864"]:
        address = agency.get("address", "")
        if "/" in address:
            parts = address.split("/")
            if len(parts) >= 2:
                last_token = parts[-2].split()[-1]
                new_district = clean_district(last_token)
                print(f"{agency['tursab_no']}: {last_token} -> {new_district}")
                agency['district'] = new_district

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done.")

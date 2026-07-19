import json
import re

JSON_PATH = "frontend/public/agencies.json"

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Build a set of all valid district names from the existing records (excluding the broken ones)
valid_districts = set()
for a in data:
    if str(a.get("id")) <= "17144": # Only trusted old records
        d = a.get("district")
        if d and isinstance(d, str):
            valid_districts.add(d.strip().upper())

def clean_district_smart(token):
    # Remove NO: prefix
    token = re.sub(r'^NO:?', '', token, flags=re.IGNORECASE)
    # Remove all non-alphanumeric
    token = re.sub(r'^[^\w]+', '', token)
    
    token_upper = token.replace("i", "İ").replace("ı", "I").upper()
    
    # Try to find the longest valid district name at the END of the token
    best_match = ""
    for vd in valid_districts:
        # Some valid districts might be multiple words, we strip spaces for comparison
        vd_compact = vd.replace(" ", "")
        if token_upper.endswith(vd_compact):
            if len(vd) > len(best_match):
                best_match = vd
    
    if best_match:
        # Capitalize nicely
        return best_match.title()
        
    # Fallback if not found in dictionary
    token = re.sub(r'\d+', '', token)
    token = re.sub(r'^[^\w]+', '', token)
    if not token: return ""
    return token.capitalize()

fixed_count = 0
for agency in data:
    if agency.get("tursab_no") in ["18869", "18871", "18870", "18872", "18873", "18875", "18874", "18876", "18877", "18878", "18864"]:
        address = agency.get("address", "")
        if "/" in address:
            parts = address.split("/")
            if len(parts) >= 2:
                last_token = parts[-2].split()[-1]
                new_district = clean_district_smart(last_token)
                print(f"{agency['tursab_no']}: {last_token} -> {new_district}")
                agency['district'] = new_district

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done.")

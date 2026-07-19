import json
import re

JSON_PATH = "frontend/public/agencies.json"

def clean_district(token):
    # Find all contiguous alphabetic sequences (including Turkish characters)
    # \w includes digits, so we explicitly define letters
    matches = re.findall(r'[a-zA-ZçÇğĞıİöÖşŞüÜ]+', token)
    if not matches:
        return ""
    # Return the longest sequence of letters
    longest = max(matches, key=len)
    
    # Capitalize for Turkish (lower first, then capitalize)
    # Since python's capitalize doesn't handle Turkish 'i/I' perfectly, let's just title()
    # But longest is something like "YUNUSEMRE" -> "Yunusemre"
    # lowercase it first handling I/i
    longest = longest.replace("I", "ı").replace("İ", "i").lower()
    return longest.capitalize()

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

fixed_count = 0
for agency in data:
    if agency.get("tursab_no") in ["18869", "18871", "18870", "18872", "18873", "18875", "18874", "18876", "18877", "18878", "18864"]:
        # Try to re-parse from address
        address = agency.get("address", "")
        if "/" in address:
            parts = address.split("/")
            if len(parts) >= 2:
                last_token = parts[-2].split()[-1]
                new_district = clean_district(last_token)
                
                print(f"{agency['tursab_no']}: {last_token} -> {new_district}")
                agency['district'] = new_district
                fixed_count += 1

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Fixed {fixed_count} records.")

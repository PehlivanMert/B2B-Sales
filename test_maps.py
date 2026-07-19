import requests
import json

API_KEY = "AIzaSyAke5oW_vKW1DyQ_3y960xb6u9hookFf2w"
URL = "https://places.googleapis.com/v1/places:searchText"

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri"
}

payload = {
    "textQuery": "FORD OTOMOTİV SANAYİ A.Ş. Kocaeli",
    "languageCode": "tr"
}

response = requests.post(URL, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2, ensure_ascii=False))

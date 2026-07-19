import requests

url = "https://www.iso500.org.tr/Default/GetList"
payload = {"yil": "2023"}
headers = {
    "User-Agent": "Mozilla/5.0",
    "X-Requested-With": "XMLHttpRequest"
}
response = requests.post(url, data=payload, headers=headers)
print(response.status_code)
print(response.text[:500])

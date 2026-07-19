import os

with open('frontend/src/pages/agencies/AgenciesPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('Agency', 'Company')
content = content.replace('agency', 'company')
content = content.replace('TÜRSAB Acenteleri', 'Sanayi Şirketleri')
content = content.replace('seyahat acentelerini', 'sanayi şirketlerini')
content = content.replace('Acente', 'Şirket')

os.makedirs('frontend/src/pages/companies', exist_ok=True)
with open('frontend/src/pages/companies/CompaniesPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("CompaniesPage.jsx created successfully.")

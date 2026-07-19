with open('frontend/src/context/AgenciesContext.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('Acente', 'Şirket')
content = content.replace('acente', 'şirket')

with open('frontend/src/context/CompaniesContext.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("CompaniesContext.jsx created successfully.")

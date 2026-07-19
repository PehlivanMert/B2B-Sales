with open('frontend/src/components/agencies/BulkStatusModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agency', 'Company')
content = content.replace('agency', 'company')
content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('Acente', 'Şirket')
content = content.replace('acente', 'şirket')
content = content.replace('useCrm', 'useCompanyCrm')

with open('frontend/src/components/companies/BulkStatusModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("BulkStatusModal.jsx created.")

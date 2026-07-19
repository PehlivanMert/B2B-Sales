import os

# AgencyTable -> CompanyTable
with open('components/agencies/AgencyTable.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agency', 'Company')
content = content.replace('agency', 'company')
content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('BELGE NO', 'VERGİ NO')
content = content.replace('Belge No', 'Vergi No')
content = content.replace('tursab_no', 'tax_no')
content = content.replace('BTK', 'SEKTÖR / BÖLGE')
content = content.replace('btk', 'sector')
content = content.replace('useCrm', 'useCompanyCrm')

with open('components/companies/CompanyTable.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# AgencyDetailModal -> CompanyDetailModal
with open('components/agencies/AgencyDetailModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agency', 'Company')
content = content.replace('agency', 'company')
content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('Belge No', 'Vergi No')
content = content.replace('tursab_no', 'tax_no')
content = content.replace('BTK', 'Sektör')
content = content.replace('btk', 'sector')
content = content.replace('Acente', 'Şirket')
content = content.replace('useCrm', 'useCompanyCrm')

with open('components/companies/CompanyDetailModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ImportModal -> CompanyImportModal
with open('components/agencies/ImportModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Agency', 'Company')
content = content.replace('agency', 'company')
content = content.replace('Agencies', 'Companies')
content = content.replace('agencies', 'companies')
content = content.replace('Belge No', 'Vergi No')
content = content.replace('tursab_no', 'tax_no')
content = content.replace('TURSAB_NO', 'TAX_NO')
content = content.replace('Acente', 'Şirket')
content = content.replace('acente', 'şirket')
content = content.replace('useCrm', 'useCompanyCrm')

with open('components/companies/ImportModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Components generated.")

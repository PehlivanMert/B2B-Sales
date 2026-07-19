import re

with open('frontend/src/context/CrmContext.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'agency_crm': 'company_crm',
    'CrmContext': 'CompanyCrmContext',
    'CrmProvider': 'CompanyCrmProvider',
    'useCrm': 'useCompanyCrm',
    'crmData': 'companyCrmData',
    'crmLoading': 'companyCrmLoading',
    'updateCrmEntry': 'updateCompanyCrmEntry',
    'batchUpdateCrmEntries': 'batchUpdateCompanyCrmEntries',
    'refreshCrmData': 'refreshCompanyCrmData',
    'pushCrmUpdate': 'pushCompanyCrmUpdate',
    'batchPushCrmUpdates': 'batchPushCompanyCrmUpdates',
    'getAllCrmEntries': 'getAllCompanyCrmEntries',
    'getCrmEntryCount': 'getCompanyCrmEntryCount',
    'putCrmEntries': 'putCompanyCrmEntries',
    'patchCrmEntry': 'patchCompanyCrmEntry',
    'clearCrmDb': 'clearCompanyCrmDb',
    'getLastSyncedAt': 'getCompanyLastSyncedAt',
    'setLastSyncedAt': 'setCompanyLastSyncedAt',
    'enqueuePendingWrite(docId, patch)': "enqueuePendingWrite(docId, patch, 'company_crm')",
    'getAllPendingWrites()': "getAllPendingWrites('company_crm')",
    'CrmContext fullSync': 'CompanyCrmContext fullSync',
    'CrmContext deltaSync': 'CompanyCrmContext deltaSync',
    'CrmContext:': 'CompanyCrmContext:'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open('frontend/src/context/CompanyCrmContext.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("CompanyCrmContext.jsx created successfully.")

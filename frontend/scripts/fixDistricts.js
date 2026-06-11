import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('./b2b-sales-crm-77251-firebase-adminsdk-fbsvc-e67ba59c4e.json');

const MAJOR_DISTRICTS = [
  "ADALAR", "ARNAVUTKÖY", "ATAŞEHİR", "AVCILAR", "BAĞCILAR", "BAHÇELİEVLER", "BAKIRKÖY", "BAŞAKŞEHİR", "BAYRAMPAŞA", "BEŞİKTAŞ", "BEYKOZ", "BEYLİKDÜZÜ", "BEYOĞLU", "BÜYÜKÇEKMECE", "ÇATALCA", "ÇEKMEKÖY", "ESENLER", "ESENYURT", "EYÜPSULTAN", "EYÜP", "FATİH", "GAZİOSMANPAŞA", "GÜNGÖREN", "KADIKÖY", "KAĞITHANE", "KARTAL", "KÜÇÜKÇEKMECE", "MALTEPE", "PENDİK", "SANCAKTEPE", "SARIYER", "SİLİVRİ", "SULTANBEYLİ", "SULTANGAZİ", "ŞİLE", "ŞİŞLİ", "TUZLA", "ÜMRANİYE", "ÜSKÜDAR", "ZEYTİNBURNU",
  "AKYURT", "ALTINDAĞ", "AYAŞ", "BALA", "BEYPAZARI", "ÇAMLIDERE", "ÇANKAYA", "ÇUBUK", "ELMADAĞ", "ETİMESGUT", "EVREN", "GÖLBAŞI", "GÜDÜL", "HAYMANA", "KAHRAMANKAZAN", "KALECİK", "KEÇİÖREN", "KIZILCAHAMAM", "MAMAK", "NALLIHAN", "POLATLI", "PURSAKLAR", "SİNCAN", "ŞEREFLİKOÇHİSAR", "YENİMAHALLE",
  "ALİAĞA", "BALÇOVA", "BAYINDIR", "BAYRAKLI", "BERGAMA", "BEYDAĞ", "BORNOVA", "BUCA", "ÇEŞME", "ÇİĞLİ", "DİKİLİ", "FOÇA", "GAZİEMİR", "GÜZELBAHÇE", "KARABAĞLAR", "KARABURUN", "KARŞIYAKA", "KEMALPAŞA", "KINIK", "KİRAZ", "KONAK", "MENDERES", "MENEMEN", "NARLIDERE", "ÖDEMİŞ", "SEFERİHİSAR", "SELÇUK", "TİRE", "TORBALI", "URLA",
  "AKSEKİ", "AKSU", "ALANYA", "DEMRE", "DÖŞEMEALTI", "ELMALI", "FİNİKE", "GAZİPAŞA", "GÜNDOĞMUŞ", "İBRADI", "KAŞ", "KEMER", "KEPEZ", "KONYAALTI", "KORKUTELİ", "KUMLUCA", "MANAVGAT", "MURATPAŞA", "SERİK",
  "BODRUM", "DALAMAN", "DATÇA", "FETHİYE", "KAVAKLIDERE", "KÖYCEĞİZ", "MARMARİS", "MENTEŞE", "MİLAS", "ORTACA", "SEYDİKEMER", "ULA", "YATAĞAN",
  "NİLÜFER", "OSMANGAZİ", "YILDIRIM", "GEMLİK", "MUDANYA", "İNEGÖL",
  "MERKEZ"
];

async function main() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  
  const db = getFirestore();
  const snapshot = await db.collection('agencies').get();
  
  let updatedCount = 0;
  const batchArray = [];
  let currentBatch = db.batch();
  let operationCount = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    let dist = data.district?.toUpperCase() || "";
    let city = data.city?.toUpperCase() || "";
    let originalDist = dist;
    
    // Fix concatenated districts (e.g., HARBİYEŞİŞLİ -> ŞİŞLİ, 41KONAK -> KONAK)
    for (const major of MAJOR_DISTRICTS) {
      if (dist.endsWith(major) && dist !== major) {
        dist = major;
        break;
      }
    }
    
    // Remove leading numbers or weird characters if any left
    dist = dist.replace(/^[0-9]+/, '');
    
    if (dist !== originalDist) {
      currentBatch.update(doc.ref, { district: dist });
      operationCount++;
      updatedCount++;
      
      if (operationCount === 400) {
        batchArray.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }
  });
  
  if (operationCount > 0) {
    batchArray.push(currentBatch);
  }
  
  console.log(`Found ${updatedCount} agencies to fix districts. Committing batches...`);
  
  for (const batch of batchArray) {
    await batch.commit();
  }
  
  console.log('Districts fixed!');
}

main().catch(console.error);

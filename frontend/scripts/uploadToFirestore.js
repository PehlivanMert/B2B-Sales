import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('./b2b-sales-crm-77251-firebase-adminsdk-fbsvc-e67ba59c4e.json');
const DATA_PATH = path.resolve('../data_prep/final_agencies.json');

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('Error: serviceAccountKey.json not found!');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Error: Data file not found at ${DATA_PATH}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const agencies = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  console.log(`Starting upload of ${agencies.length} agencies to Firestore...`);
  
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < agencies.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = agencies.slice(i, i + BATCH_SIZE);
    
    for (const agency of chunk) {
      const docRef = db.collection('agencies').doc(agency.id.toString());
      batch.set(docRef, agency);
    }
    
    await batch.commit();
    console.log(`Uploaded batch ${i / BATCH_SIZE + 1} (${i} - ${i + chunk.length})`);
  }

  console.log('Upload completed successfully!');
}

main().catch(console.error);

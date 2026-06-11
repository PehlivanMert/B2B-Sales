import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('./b2b-sales-crm-77251-firebase-adminsdk-fbsvc-e67ba59c4e.json');

async function main() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  
  const db = getFirestore();
  const auth = getAuth();
  
  try {
    const userRecord = await auth.getUserByEmail('test@example.com');
    await db.collection('users').doc(userRecord.uid).update({ role: 'admin' });
    console.log('User made admin!');
  } catch (err) {
    console.error(err);
  }
}
main();

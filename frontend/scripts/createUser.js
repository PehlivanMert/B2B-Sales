import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.resolve('./b2b-sales-crm-77251-firebase-adminsdk-fbsvc-e67ba59c4e.json');

async function main() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  try {
    const userRecord = await getAuth().createUser({
      email: 'test@example.com',
      password: 'test123',
    });
    console.log('Successfully created new user:', userRecord.uid);
  } catch (error) {
    console.error('Error creating new user:', error);
  }
}

main();

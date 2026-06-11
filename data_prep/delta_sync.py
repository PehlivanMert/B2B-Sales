import os
import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup

def main():
    # 1. Init Firebase
    try:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase initialized.")
    except Exception as e:
        print("Could not initialize Firebase:", e)
        return

    # 2. Get Max ID from Firestore
    print("Fetching current Max TÜRSAB No from Firestore...")
    try:
        # Since we stored tursab_no as a string or number, let's query the latest
        # In a real scenario, you'd order by numeric tursab_no descending limit 1
        query = db.collection('agencies').order_by('id', direction=firestore.Query.DESCENDING).limit(1)
        results = query.stream()
        
        max_id = 0
        for doc in results:
            data = doc.to_dict()
            if 'id' in data:
                max_id = int(data['id'])
                
        print(f"Current Max ID in DB: {max_id}")
    except Exception as e:
        print("Error fetching max ID:", e)
        return

    # 3. Scrape delta (Mocked for demonstration)
    print("Starting delta scrape for new agencies...")
    new_agencies = []
    
    # Normally we'd call the online.tursab.org.tr logic from max_id + 1 up to + 500
    # For now, we print what would happen:
    print(f"Would scrape from ID {max_id + 1} to {max_id + 500}")
    
    # 4. Upload new agencies to Firestore
    if not new_agencies:
        print("No new agencies found. Delta sync complete.")
        return
        
    batch = db.batch()
    for agency in new_agencies:
        doc_ref = db.collection('agencies').document(str(agency['id']))
        batch.set(doc_ref, agency)
        
    batch.commit()
    print(f"Successfully added {len(new_agencies)} new agencies.")

if __name__ == "__main__":
    main()

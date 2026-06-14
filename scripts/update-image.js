// Run with: node scripts/update-image.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app);

const docRef = doc(db, 'app_data', 'restaurants');
const snap = await getDoc(docRef);

if (snap.exists()) {
  const data = snap.data();
  const list = data.list.map(r =>
    r.id === 'lucy-blu' ? { ...r, image: 'https://imghosting.in/host/mm5d7a' } : r
  );
  await setDoc(docRef, { list });
  console.log('Updated Lucy Blu image in Firestore');
} else {
  console.log('No Firestore document found');
}

// Firestore seed script for shipping_couriers (run with Node.js)
// Place this in a scripts/ directory and run with: node seed_couriers.js

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

const couriers = [
  {
    name: "J&T Express",
    logo_url: null,
    estimated_days: "3-5 days",
    base_fee: 85,
    is_active: true,
  },
  {
    name: "Flash Express",
    logo_url: null,
    estimated_days: "2-4 days",
    base_fee: 90,
    is_active: true,
  },
  {
    name: "Ninja Van",
    logo_url: null,
    estimated_days: "3-5 days",
    base_fee: 85,
    is_active: true,
  },
  {
    name: "LBC Express",
    logo_url: null,
    estimated_days: "2-3 days",
    base_fee: 100,
    is_active: true,
  },
  {
    name: "GoGo Xpress",
    logo_url: null,
    estimated_days: "3-7 days",
    base_fee: 75,
    is_active: true,
  },
];

async function seedCouriers() {
  const batch = db.batch();
  couriers.forEach((courier) => {
    const ref = db.collection('shipping_couriers').doc();
    batch.set(ref, courier);
  });
  await batch.commit();
  console.log('Shipping couriers seeded successfully!');
}

seedCouriers().catch(console.error);

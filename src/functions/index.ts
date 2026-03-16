
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket(); // Get default bucket

// Helper to check for admin privileges
const assertIsAdmin = async (uid: string | undefined) => {
    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }
    const rolesDoc = await db.collection("user_roles").doc(uid).get();
    const roleData = rolesDoc.data();
    if (!rolesDoc.exists || roleData?.role !== "admin") {
         // Also check for custom claims, just in case
        const user = await admin.auth().getUser(uid);
        if (user.customClaims?.admin !== true) {
            throw new HttpsError("permission-denied", "You must be an admin to perform this action.");
        }
    }
    // Return profile data for logging
    const profileDoc = await db.collection("profiles").doc(uid).get();
    return profileDoc.data();
};

// Helper to ensure user is authenticated
const assertIsAuthenticated = (uid: string | undefined): string => {
    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }
    return uid;
}

function getPathFromUrl(gsUrl: string): string | null {
    if (!gsUrl || !gsUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        return null;
    }
    try {
        const url = new URL(gsUrl);
        const pathName = url.pathname;
        const bucketName = admin.app().options.storageBucket;
        const prefix = `/v0/b/${bucketName}/o/`;
        if (pathName.startsWith(prefix)) {
            return decodeURIComponent(pathName.substring(prefix.length));
        }
        return null;
    } catch (e) {
        console.error("Failed to parse storage URL", gsUrl, e);
        return null;
    }
}

export const adminDataFetcher = onCall({ maxInstances: 2 }, async (request) => {
    const { auth, data } = request;
    await assertIsAdmin(auth?.uid);

    const { tab } = data;
    if (!tab || typeof tab !== 'string') {
        throw new HttpsError("invalid-argument", "The function must be called with a 'tab' argument.");
    }

    try {
        const collectionRef = db.collection(tab);
        const snapshot = await collectionRef.orderBy("created_at", "desc").get();
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const urlConfig = { action: 'read' as const, expires: Date.now() + 1000 * 60 * 30 }; // 30 min expiry

        if (tab === "verifications") {
            results = await Promise.all(results.map(async (v: any) => {
                const docUrls: { [key: string]: string | null } = {};
                const urlFields = ['id_front_url', 'id_back_url', 'selfie_url'];

                for (const field of urlFields) {
                    if (v[field]) {
                        const path = getPathFromUrl(v[field]);
                        if (path) {
                            try {
                                const [signedUrl] = await bucket.file(path).getSignedUrl(urlConfig);
                                docUrls[field] = signedUrl;
                            } catch (e) {
                                console.error(`Failed to get signed URL for ${path}`, e);
                                docUrls[field] = v[field];
                            }
                        } else {
                           docUrls[field] = v[field];
                        }
                    }
                }
                return { ...v, ...docUrls };
            }));
        }
        
        if (tab === "orders") {
             results = await Promise.all(results.map(async (order: any) => {
                if (order.payment_proof_url) {
                    const path = getPathFromUrl(order.payment_proof_url);
                    if(path) {
                        try {
                            const [signedUrl] = await bucket.file(path).getSignedUrl(urlConfig);
                            return {...order, payment_proof_url: signedUrl };
                        } catch(e) {
                            console.error(`Failed to get signed URL for ${order.payment_proof_url}`, e);
                        }
                    }
                }
                return order;
             }));
        }

        return { data: results };
    } catch (error) {
        console.error("Error fetching admin data:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An unexpected error occurred while fetching data.");
    }
});

export const adminAction = onCall({ maxInstances: 5 }, async (request) => {
    const { auth, data, rawRequest } = request;
    const adminProfile = await assertIsAdmin(auth?.uid);

    const { action, ...payload } = data;
    const ip_address = rawRequest.ip;

    const createAuditLog = (target_type: string, target_id: string, details?: object) => {
        if(!auth?.uid) return;
        return db.collection("audit_logs").add({
            admin_id: auth.uid,
            admin_name: (adminProfile as any)?.display_name || "Unknown Admin",
            action,
            target_type,
            target_id,
            details,
            ip_address,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    };

    try {
        switch (action) {
            case "approve_verification": {
                const { verification_id } = payload;
                if (!verification_id) throw new HttpsError("invalid-argument", "verification_id is required.");
                
                const verificationRef = db.collection("seller_verifications").doc(verification_id);
                const verificationDoc = await verificationRef.get();
                if (!verificationDoc.exists) throw new HttpsError("not-found", "Verification document not found.");
                
                const user_id = verificationDoc.data()?.user_id;
                if (!user_id) throw new HttpsError("internal", "Verification document is missing user_id.");

                const profileRef = db.collection("profiles").doc(user_id);
                
                const batch = db.batch();
                batch.update(verificationRef, { status: "approved" });
                batch.update(profileRef, { is_approved: true });
                batch.set(db.collection('user_roles').doc(user_id), { role: 'seller' }, { merge: true });

                await batch.commit();
                await createAuditLog("verification", verification_id, { user_id });
                return { success: true, message: "Seller approved." };
            }
            // ... other admin actions ...
            default:
                throw new HttpsError("invalid-argument", `Invalid action specified: ${action}`);
        }
    } catch (error) {
        console.error(`Error performing admin action '${action}':`, error);
         if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", `An error occurred while performing action: ${action}.`);
    }
});

export const placeOrder = onCall({ maxInstances: 10 }, async (request) => {
    const buyerId = assertIsAuthenticated(request.auth?.uid);
    const { items, payment_method, address_id, delivery_fee, notes, courier_id, courier_name, payment_reference, payment_proof_url, temp_order_id } = request.data;

    if (!Array.isArray(items) || items.length === 0 || !address_id || !payment_method) {
        throw new HttpsError("invalid-argument", "Missing required order information.");
    }

    // Group items by seller
    const ordersBySeller: { [sellerId: string]: any[] } = items.reduce((acc, item) => {
        if (!acc[item.seller_id]) {
            acc[item.seller_id] = [];
        }
        acc[item.seller_id].push(item);
        return acc;
    }, {});

    const buyerProfileDoc = await db.collection('profiles').doc(buyerId).get();
    if (!buyerProfileDoc.exists) {
        throw new HttpsError("not-found", "Buyer profile not found.");
    }

    const addressDoc = await db.collection('profiles').doc(buyerId).collection('addresses').doc(address_id).get();
    if (!addressDoc.exists) {
        throw new HttpsError("not-found", "Delivery address not found.");
    }
    const delivery_address = addressDoc.data();

    const batch = db.batch();
    const orderCreationTimestamp = admin.firestore.FieldValue.serverTimestamp();

    for (const sellerId in ordersBySeller) {
        const sellerItems = ordersBySeller[sellerId];
        const orderSubtotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderTotal = orderSubtotal + delivery_fee; // Note: delivery fee is per-order, not per-item

        const orderRef = sellerId === Object.keys(ordersBySeller)[0] 
            ? db.collection('orders').doc(temp_order_id) 
            : db.collection("orders").doc();

        batch.set(orderRef, {
            buyer_id: buyerId,
            seller_id: sellerId,
            subtotal: orderSubtotal,
            total: orderTotal,
            delivery_fee,
            delivery_address,
            courier_id,
            courier_name,
            status: 'pending', 
            payment_method,
            payment_status: payment_method === 'cod' ? 'pending' : 'awaiting_review',
            payment_reference,
            payment_proof_url: payment_proof_url || null,
            notes: notes || null,
            created_at: orderCreationTimestamp,
            updated_at: orderCreationTimestamp,
        });

        for (const item of sellerItems) {
            const orderItemRef = orderRef.collection('items').doc(item.listing_id);
            batch.set(orderItemRef, { ...item });

            const listingRef = db.collection('listings').doc(item.listing_id);
            batch.update(listingRef, {
                quantity: admin.firestore.FieldValue.increment(-item.quantity)
            });
        }
    }

    try {
        await batch.commit();
        return { success: true, message: "Order placed successfully for all sellers." };
    } catch (error) {
        console.error("Error committing order batch:", error);
        throw new HttpsError("internal", "Failed to save the order. Please try again.");
    }
});

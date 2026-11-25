# Security Specification — ร้านหมาล่าทอด หลังเกษราษฎร์

## 1. Data Invariants
1. Every document in `sales`, `purchases`, and `shopSettings` MUST belong to an authenticated, email-verified user (`request.auth.uid == resource.data.ownerId`).
2. `sales` records MUST have `cashAmount >= 0`, `krungthaiAmount >= 0`, `totalAmount > 0`, and `totalAmount == cashAmount + krungthaiAmount` (within floating-point tolerance <= 0.01).
3. `purchases` records MUST have `amount > 0`, valid `paymentMethod` (`"cash"` or `"krungthai"`), and valid `category`.
4. `ownerId` and `createdAt` are immutable after document creation.
5. `createdAt` and `updatedAt` MUST equal `request.time`.
6. List queries MUST evaluate `resource.data.ownerId == request.auth.uid` directly in Firestore rules.
7. Shadow/extra keys are strictly rejected via `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.

## 2. Dirty Dozen Attack Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/sales/s1` (`request.auth == null`).
2. Unverified email write (`request.auth.token.email_verified == false`).
3. Identity spoofing: User A writes `/sales/s2` with `ownerId: "userB"`.
4. Shadow field injection on create: `/sales/s3` with extra `"isAdmin": true`.
5. Oversized string poisoning: `/purchases/p1` with `itemName` > 120 chars or `note` > 200 chars.
6. Invalid ID path poisoning: `/sales/invalid$id!with/junk` or > 128 chars.
7. Negative/mismatched sale arithmetic: `cashAmount: 100, krungthaiAmount: 50, totalAmount: 999`.
8. Zero-value sale: `cashAmount: 0, krungthaiAmount: 0, totalAmount: 0`.
9. Invalid purchase paymentMethod: `paymentMethod: "crypto"`.
10. Client-forged timestamp: `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
11. Immutable field tampering on update: changing `ownerId` or `createdAt` on `/sales/s1`.
12. Cross-tenant list/read: User B listing `/sales` or reading `/shopSettings/userA`.

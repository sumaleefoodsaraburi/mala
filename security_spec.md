# Security Specification — ร้านหมาล่าทอด หลังเกษราษฎร์ (Direct Shop Mode)

## 1. Data Invariants
1. Every document in `sales`, `purchases`, and `shopSettings` MUST use `ownerId == "kasemrad-mala"` (the store ledger identifier).
2. `sales` records MUST have `cashAmount >= 0`, `krungthaiAmount >= 0`, `totalAmount > 0`, and `totalAmount == cashAmount + krungthaiAmount` (within floating-point tolerance <= 0.01).
3. `purchases` records MUST have `amount > 0`, valid `paymentMethod` (`"cash"` or `"krungthai"`), and valid `category`.
4. `ownerId` and `createdAt` are immutable after document creation.
5. `createdAt` and `updatedAt` MUST equal `request.time`.
6. Shadow/extra keys are strictly rejected via `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.

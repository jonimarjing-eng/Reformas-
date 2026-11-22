# Security Specification — AutoReforma Firestore Rules

## 1. Data Invariants

1. **Ownership Isolation**: Every document in `/orders/{orderId}` MUST have `ownerId == request.auth.uid`. No user may read (`get` or `list`), create, update, or delete an order belonging to another user.
2. **Verified Identity**: All read and write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict Schema & No Shadow Fields**: Only declared fields in `firebase-blueprint.json` are permitted (`hasAll` + `hasOnly`). Unknown fields are always rejected.
4. **Volumetric, Numeric & Regex Boundaries**:
   - Every string enforces `.size()` limits; `licensePlate` matches `^[A-Z0-9 \-]+$`; `orderDate` matches `^\d{4}-\d{2}-\d{2}$`; `ownerId` and `orderId` match `^[a-zA-Z0-9_\-]+$`.
   - `status` must strictly belong to `['pendiente_laboratorio', 'pendiente_cliente', 'pendiente_modificacion_vplus', 'pendiente_itv', 'rechazado_itv', 'pendiente_cobrar', 'terminado', 'cancelado']`.
   - `reformCodes` is a non-empty list bounded to `1..20` entries.
   - `labPrice` and `finalPrice` are numbers within `[0, 1000000]`.
   - `profit` is a number within `[-1000000, 1000000]`.
5. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on create and remain strictly immutable on update. `updatedAt` must equal `request.time` on create and update. `ownerId` is immutable after creation.
6. **Terminal State Locking**: Once an order reaches `status == 'terminado'` or `status == 'cancelado'`, no subsequent updates are permitted.
7. **PII Isolation**: Client contact details (`clientName`, `clientContact`) live exclusively inside owner-isolated documents and are never accessible to non-owners.
8. **Secure List Queries**: `allow list` explicitly checks `existing().ownerId == request.auth.uid` without `get()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Create**: `ownerId: "victim_uid"` while authenticated as `"attacker_uid"`.
2. **Shadow Field Injection on Create**: Valid order payload plus `isAdmin: true`.
3. **Shadow Field Injection on Update**: Valid update payload plus `extraFlag: "injected"`.
4. **Unverified Email Bypass**: Authenticated user with `email_verified: false` attempting create or read.
5. **Owner Hijack on Update**: Updating `ownerId` from `"user_a"` to `"user_b"`.
6. **Immortal Timestamp Tampering**: Changing `createdAt` during an update.
7. **Client-Spoofed Server Timestamp**: Creating an order with a past `createdAt` instead of `request.time`.
8. **Negative or Non-Numeric Pricing Poisoning**: Sending `labPrice: -50` or `finalPrice: "300"` (string instead of number).
9. **Resource Poisoning via Oversized Document ID**: Writing to `/orders/<200-char-id>` or invalid characters in `orderId`.
10. **Value Poisoning on Whitelisted Status Key**: Updating `status` to `"estado_invalido"` or a boolean `true`.
11. **Unbounded Array / Empty Array Injection**: Creating an order with `reformCodes: []` or 25 items.
12. **Cross-Tenant PII Read / Blanket List**: User B calling `get` or unfiltered `list` on User A's orders.

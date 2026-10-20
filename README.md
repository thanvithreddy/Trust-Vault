# TrustVault 🛡️
> **Secure Document Sharing with a Provable, Tamper-Evident Audit Trail**

---

## 1. Quick Credentials & Demo Personas

When running or opening TrustVault, the database comes pre-seeded with five distinct personas to test access boundaries, instant revocation, and refused access audit logging:

| Role / Persona | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Document Owner (Alice - CFO)** | `owner@trustvault.local` | `Password123!` | Owns Q3 Financials & MSA Contracts. Can grant/revoke permissions and request AI suggestions. |
| **Viewer (Bob - Contractor)** | `viewer@trustvault.local` | `Password123!` | Granted `READ` on Apex MSA only. Cannot see or download Q3 Financials. |
| **Auditor (Carol - KPMG)** | `auditor@trustvault.local` | `Password123!` | Granted `READ` on Q3 Financial Statements for audit review. |
| **Unauthorized (Eve - Rogue)** | `unauthorized@trustvault.local` | `Password123!` | Zero active grants. Used to demonstrate real-time access refusal and audit alerting. |
| **Administrator (SysAdmin)** | `admin@trustvault.local` | `Password123!` | Full access to the Audit Trail and Cryptographic Integrity verification. Cannot read documents without explicit grant. |

---

## 2. Core Architecture & The Three Non-Negotiable Rules

### Rule 1: The Server Decides, Every Time
* **No UI-only checks:** Authorization is enforced at the database transaction layer on every endpoint via `PermissionService.enforceAccess(...)`.
* **Zero IDOR:** Guessing or enumerating document UUIDs returns HTTP 403 / 404, with the unauthorized probe immediately logged to the audit ledger.

### Rule 2: You Can Prove Who Reached It (Audit Trail)
* **Refused Access Captured:** Every denied attempt is recorded with `status = "DENIED"`, caller identity, client IP, target document, and timestamp.
* **Cryptographic Hash Chaining:** Audit log entries are linked in an immutable blockchain-style SHA-256 hash chain (`prev_hash + SHA-256(current_entry)`).
* **Automated Integrity Verification:** The Admin dashboard provides an on-demand verification tool (`GET /api/audit/verify`) that verifies every historical link and detects any out-of-band SQL tampering.

### Rule 3: Taking Access Away Works Immediately
* **Zero-Latency Revocation:** No long-lived presigned URLs or capability tokens are used.
* **Backend Proxied Streaming:** File downloads are streamed through `GET /api/documents/{id}/stream`. If an owner revokes access at $T$, access at $T+1\text{ms}$ is blocked immediately.

---

## 3. API Documentation & Access Matrix

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT bearer token. |
| `POST` | `/api/auth/register` | Public | Registers a new user account. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves active user profile and role. |
| `GET` | `/api/documents` | Authenticated | Searches and lists documents strictly accessible to the caller. |
| `POST` | `/api/documents` | Owner, Admin | Uploads a validated document (magic bytes verified). |
| `GET` | `/api/documents/{id}` | Granted Users, Owner | Retrieves document metadata. Refused attempts logged. |
| `GET` | `/api/documents/{id}/stream`| Granted Users, Owner | Proxied binary stream of the document. Refused attempts logged. |
| `PUT` | `/api/documents/{id}` | Editor, Owner | Updates document metadata. |
| `DELETE` | `/api/documents/{id}` | Owner Only | Soft-deletes document from active vault. |
| `GET` | `/api/permissions/documents/{id}` | Owner Only | Lists active authorized grantees. |
| `POST` | `/api/permissions/documents/{id}` | Owner Only | Grants explicit `READ` or `EDIT` permission to a named user. |
| `DELETE`| `/api/permissions/documents/{id}` | Owner Only | Revokes permission immediately. |
| `GET` | `/api/ai/documents/{id}/suggestions` | Owner Only | Generates AI access suggestions (strictly advisory). |
| `POST` | `/api/ai/documents/confirm` | Owner Only | Human owner approves or rejects AI suggestion. |
| `GET` | `/api/audit/logs` | Admin Only | Fetches system audit trail (filter by status or document). |
| `GET` | `/api/audit/verify` | Admin Only | Verifies SHA-256 cryptographic chain integrity across all records. |
| `GET` | `/api/audit/stats` | Admin Only | Returns security summary metrics and denied attempt counts. |

---

## 4. Setup & Running from Clean Clone

### Prerequisites
* Java 17+ (Java 21 or Java 26 supported)
* Node.js 18+ and npm

### 1. Database Configuration (PostgreSQL / Neon)
TrustVault connects to PostgreSQL through Neon or local Postgres.
Set the environment variable or create a `.env` / `application-local.properties` file:
```bash
# Example Neon connection string:
export DATABASE_URL="postgres://user:password@ep-cold-resonance-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
*(If no `DATABASE_URL` is set, TrustVault automatically falls back to an embedded in-memory database with PostgreSQL dialect for immediate testing and offline evaluation!)*

### 2. Start the Backend
```bash
cd backend
# On Windows:
.\mvnw.cmd spring-boot:run
# On Linux/macOS:
./mvnw spring-boot:run
```
The backend initializes on `http://localhost:8080` and seeds the demo personas and documents automatically.

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Use the Persona quick switcher buttons to test access and revocation between Alice, Bob, Carol, Eve, and Admin!

---

## 5. Running Automated Security & Mutation Tests

To execute the automated security test suite proving user document separation, immediate revocation, and audit trail integrity:
```bash
cd backend
.\mvnw.cmd test
```

### The Mutation Test (Evaluator Verification)
To test whether our test suite is genuinely testing authorization:
1. Open `backend/src/main/java/com/trustvault/security/PermissionService.java`.
2. Locate line 35: `return grantOpt.isPresent();`
3. Modify it to `return true;` (simulating removed authorization).
4. Run `.\mvnw.cmd test`.
5. **Result:** The tests fail with assertion errors because Eve is expected to throw `AccessDeniedException` and fail!

---

## 6. Project Deliverables Index
* **[`THREATS.md`](THREATS.md):** Comprehensive threat matrix, IDOR mitigations, and accepted risks.
* **[`PROMPTS.md`](PROMPTS.md):** Five dated AI interaction entries documenting AI bugs caught and corrected.

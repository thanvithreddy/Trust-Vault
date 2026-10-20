# TrustVault - AI Interaction Log (PROMPTS.md)

This log records how AI was directed throughout the development of TrustVault, detailing specific prompts, flaws identified in AI-generated solutions, and the corrective engineering decisions taken.

---

### Entry 1 (2026-10-20) - Revocation vs. Pre-signed URLs & Stateless JWTs
* **Category:** Authorization & Access Control
* **Prompt / Task Asked:**
  > "Design the authentication and secure document download flow for TrustVault using Spring Security, stateless JWT tokens, and temporary pre-signed object storage URLs."
* **What the AI Produced:**
  > A standard modern cloud pattern: Upon login, the client receives a 1-hour stateless JWT. When the client requests `/api/documents/{id}/download`, the backend validates the JWT claims, checks permissions, generates a pre-signed S3 URL valid for 15 minutes, and redirects the client with HTTP 302.
* **What Was Wrong With It (Specifically):**
  > This directly violates Non-Negotiable Rule #3: **"Taking access away works immediately. Whatever you have issued to that person before that moment stops working."**
  > 1. If an owner revokes a user's access, an already-issued pre-signed URL remains completely valid on S3 until its 15-minute expiration. The server cannot recall or invalidate that URL.
  > 2. If permissions are cached inside a stateless JWT, any permission modification or revocation is ignored until token expiry.
* **What We Did Instead:**
  > 1. Completely rejected direct client access via pre-signed cloud URLs. All document downloads are strictly proxied and streamed through the backend (`/api/documents/{id}/stream`).
  > 2. Every single request to read, view, or stream a document executes an immediate transactional database query against `DocumentPermissionRepository` to ensure zero-latency revocation. If revoked at $T$, access at $T+1\text{ms}$ fails with HTTP 403.
* **Commit Reference:** Initial architecture commit [`f8c1692`](https://github.com/trustvault/trustvault/commit/f8c1692) - Scaffolded project with zero-latency streaming architecture in mind.

---

### Entry 2 (2026-10-20) - Audit Log Tamper Resistance & Failure Tracking
* **Category:** Audit Trail & Non-Repudiation
* **Prompt / Task Asked:**
  > "Create an audit logging entity and service that records document CRUD and sharing events into a PostgreSQL table."
* **What the AI Produced:**
  > A standard Spring Data JPA entity `AuditLog` with a service method `logEvent(...)` called from `@Transactional` controller methods after a successful action.
* **What Was Wrong With It (Specifically):**
  > 1. **Ignored Refused Access:** The AI only triggered logging *after* successful operations. The TrustVault specification requires: *"You can prove who reached it... including the attempts that were refused."* An attacker probing for unauthorized documents would leave zero trace.
  > 2. **Transaction Rollback on Refusal Bug:** When an unauthorized access was refused and the code threw `AccessDeniedException`, Spring's outer `@Transactional` rolled back the entire transaction, erasing the audit log of the refused attempt!
  > 3. **Mutable / Fragile Audit Trail:** Standard JPA tables can be altered with `UPDATE` or `DELETE`, allowing rogue insiders to hide actions.
* **What We Did Instead:**
  > 1. Isolated `AuditService.logEvent` with `@Transactional(propagation = Propagation.REQUIRES_NEW)`. This commits refused access attempts into the database immediately inside an isolated physical transaction before throwing `AccessDeniedException`.
  > 2. Designed cryptographic hash chaining (`prev_hash` + `SHA-256(current_entry)`) so any manual tampering corrupts the chain and is detected by `verifyIntegrity()`.
* **Commit Reference:** [`e618a2b`](https://github.com/trustvault/trustvault/commit/e618a2b) - Implemented `REQUIRES_NEW` isolation and hash-chaining verification.

---

### Entry 3 (2026-10-20) - Cryptographic Chain Corruption via Instant Precision Truncation
* **Category:** Cryptographic Audit Trail
* **Prompt / Task Asked:**
  > "Implement the SHA-256 hash chaining verification logic in AuditService to verify the integrity of the audit logs from beginning to end."
* **What the AI Produced:**
  > An integrity checker that serialized `AuditLog.timestamp` directly using `Instant.now().toString()`.
* **What Was Wrong With It (Specifically):**
  > In Java, `Instant.now()` has nanosecond precision (up to 9 decimal places, e.g. `.123456789Z`). However, when saved into PostgreSQL or H2 `TIMESTAMP` columns, the database rounds or truncates the timestamp to microseconds (6 decimal places) or milliseconds (3 decimal places).
  > As a result, when reading back the log for verification, `current.getTimestamp().toString()` had a different string representation than the original in-memory timestamp, causing `verifyIntegrity()` to report false-positive tampering on untouched records!
* **What We Did Instead:**
  > Enforced strict timestamp truncation at generation time using `Instant.now().truncatedTo(ChronoUnit.MILLIS)`. This guarantees 100% deterministic string serialization across Java memory, database persistence, and hash recalculation routines.
* **Commit Reference:** [`e618a2b`](https://github.com/trustvault/trustvault/commit/e618a2b) - Truncated timestamp to milliseconds to ensure deterministic SHA-256 chain verification.

---

### Reusable Context & System Prompts
*(Reused prompts, context instructions, and policy constraints guiding AI generations during development will be documented here).*
* **Security Guardrail Rule:** "Never propose client-side security checks without a corresponding server-side enforcement. All authorization decisions must be validated at the service layer on every invocation."
* **Least Privilege AI Principle:** "The AI suggestion engine inside TrustVault must only produce recommendations. It must never commit database permission changes automatically."

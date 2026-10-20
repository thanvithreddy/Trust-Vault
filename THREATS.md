# TrustVault - Threat Model & Vulnerability Analysis (THREATS.md)

This document identifies potential security threats to TrustVault, our mitigations, and accepted architectural risks.

---

## 1. Threat Matrix Summary

| Threat ID | Threat Category | Attack Vector | Mitigated In System? | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **TV-T01** | Authorization (IDOR) | Guessing/Enumerating document UUIDs or IDs to access unauthorized files | **Yes** (Strict Server-Side PEP on every endpoint) | Critical |
| **TV-T02** | Stale Access / Revocation | Using cached tokens or pre-signed URLs after permission was revoked | **Yes** (Real-time DB query per download chunk/stream) | Critical |
| **TV-T03** | Repudiation / Log Tampering | Malicious actor or rogue admin altering/deleting audit log records | **Yes** (Postgres DB-level immutable rules & hash-chaining) | High |
| **TV-T04** | Untracked Refused Access | Attacker attempts brute-force/reconnaissance without creating audit entries | **Yes** (Failed 401/403 events explicitly captured in audit trail) | High |
| **TV-T05** | Privilege Escalation | Admin user reading documents without explicit owner grant | **Yes** (Strict separation: Admin role only has audit/system permissions) | High |
| **TV-T06** | File Upload Exploit | Executable/malicious payloads disguised as PDF/PNG (polyglots) | **Yes** (Tika magic-byte inspection, sandboxed storage, attachment disposition) | High |
| **TV-T07** | Path Traversal | Filenames containing `../` or null bytes escaping the storage directory | **Yes** (Storage uses internal random UUIDs; original filename stored in DB only) | Critical |
| **TV-T08** | Search Metadata Leakage | Unprivileged user discerning document existence or titles via search | **Yes** (Search queries strictly join against permission grants) | Medium |
| **TV-T09** | AI Autonomous Privilege Grant | AI agent expanding access without human confirmation | **Yes** (AI only provides recommendations; human must confirm; both audited) | Medium |
| **TV-T10** | Denial of Service (Storage) | Exhausting disk or DB with giant file uploads | **Partially Mitigated** (Accepted trade-off for MVP) | Low |

---

## 2. In-Depth Threat Mitigations

### TV-T01: Insecure Direct Object References (IDOR)
* **Attack Scenario:** Attacker obtains a document ID (`/api/documents/e4b1c.../download`) and sends a GET request.
* **Mitigation:**
  1. The server never relies on client-side state or obscure UUIDs as security.
  2. Every controller calls the central `PermissionService.enforceAccess(userId, documentId, PermissionLevel.READ)`.
  3. If no explicit grant or ownership exists, the server returns `403 Forbidden` and writes an audit event.

### TV-T02: Instant Revocation Bypass (Stale Access)
* **Attack Scenario:** Owner revokes user's access at `10:00:00 AM`. User initiates a download at `10:00:01 AM` using an existing authorization bearer or pre-signed URL.
* **Mitigation:**
  1. No long-lived direct file access tokens or un-revocable pre-signed URLs are used.
  2. All document streams are proxied through Spring Boot controller streams.
  3. The permission check occurs inside the transactional request boundary immediately before opening the input stream.

### TV-T03: Audit Trail Tampering & Repudiation
* **Attack Scenario:** An attacker with database credentials or SQL injection capability attempts to alter `audit_logs` to conceal their actions.
* **Mitigation:**
  1. Database triggers / rules block `UPDATE` and `DELETE` on the `audit_logs` table.
  2. Cryptographic Hash Chaining: Each audit record stores `sha256(previous_hash + current_record_data)`. Any altered record invalidates the chain.

### TV-T06 & TV-T07: File Upload Exploits & Path Traversal
* **Attack Scenario:** An attacker uploads `evil.php` or `../../root.sh` disguised as an invoice.
* **Mitigation:**
  1. The uploaded file is saved on disk with a cryptographically secure UUID (e.g., `storage/b82f...blob`). The user-supplied filename is never used on the filesystem.
  2. File bytes are validated using magic numbers (Apache Tika / file signatures), rejecting unauthorized binary execution.
  3. Files are served with `Content-Disposition: attachment; filename="sanitized.ext"` and `X-Content-Type-Options: nosniff`.

---

## 3. Deliberately Accepted Risks & Omissions

1. **Malware / Anti-Virus Scanning:**
   * *Status:* Accepted Risk.
   * *Reasoning:* Running an in-line ClamAV daemon adds heavy operational overhead and latency for this MVP. We mitigate this by ensuring stored files are never executable, never rendered inline as HTML/JS, and only delivered as downloads with strict sandboxing headers.
2. **End-to-End Client-Side Zero-Knowledge Encryption:**
   * *Status:* Deliberate Omission.
   * *Reasoning:* E2EE prevents server-side search, virus inspection, and automated audit enforcement. TrustVault focuses on provable server-side non-repudiation and fine-grained enterprise access control.

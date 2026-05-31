# SCOC Firebase Security Specification (Zero-Trust)

This specification defines the strict data invariants, security boundaries, and adversarial test scenarios ("The Dirty Dozen") protecting the Subic Church of Christ (SCOC) Digital Board & Registry.

## 1. Data Invariants
- **Identity Invariant**: Only authenticated users with Google signatures who are registered as administrators (`isAdmin()`) can create, update, or delete directories (`members`, `networks`, `ministries`, `events`, `attendance`).
- **Audit Immutability**: All edits or directory operations emit an unmodifiable telemetry log (`auditLogs`). Audit logs must never allow `update` or `delete` actions.
- **Relational Consistency**: Attendance records cannot point to non-existent events. Each attendance record must bind atomic parameters (`eventId` and `memberId`).
- **Temporal Enforcement**: Log and record creations must validate their generation time directly using `request.time`.

## 2. The "Dirty Dozen" Threat Vectors
These operations must always fail with `PERMISSION_DENIED` at the Firestore security layer.

### Payload 1: Pseudo-Admin Privilege Escalation (Identity Spoofing)
An unauthenticated or viewer user attempts to declare themselves an administrator inside `userRoles/{userId}`.
```json
{
  "email": "attacker@gmail.com",
  "role": "admin",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 2: Admin Spoofing via Email String Match Injection
An attacker registers an account with an email that matches the admin string partially or attempts to bypass verified status.
```json
{
  "email": "scoc2911@gmail.com",
  "role": "admin"
}
```
*Expected Result: PERMISSION_DENIED (Must require verified `email_verified == true` & match provider `google.com`)*

### Payload 3: Mutation of Immutable Creation Logs (Time-Poisoning)
An attacker attempts to write an audit log using a forged backend timestamp instead of the authentic `request.time`.
```json
{
  "userEmail": "scoc2911@gmail.com",
  "userName": "Admin",
  "action": "DELETED RECORDS ALL",
  "timestamp": "2020-01-01T00:00:00Z"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 4: Arbitrary Modification of Historical Audit Logs (State Tampering)
An authenticated user attempts to run an update on an existing audit log.
```json
{
  "action": "MODIFIED BY ATTACKER"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 5: Injection of Shadow Fields (Ghost Field Injection)
An attacker attempts to create a network record with a forged `isVerified` configuration or custom field to gain unauthorized status.
```json
{
  "networkName": "Main Cluster",
  "networkLeader": "Joel Abante",
  "isVerified": true,
  "shadowPrivilege": "root"
}
```
*Expected Result: PERMISSION_DENIED (Strict keys match required)*

### Payload 6: Size-overflow / Denial of Wallet Payload
Injecting a massive characters buffer string (e.g., 2MB text) to crash client loaders or exhaust bandwidth.
```json
{
  "networkName": "MASSIVE_STRING_REPEATED_FOR_30_KILOBYTES...",
  "networkLeader": "Joel Abante"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 7: Forging Event Dates into Historical Records
Creating an event in the past or mutating standard formats.
```json
{
  "eventName": "CHURCH FORGED EVENT",
  "eventDate": "invalid-datetime-string-pattern"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 8: Self-Assigned Membership Registry
An unapproved viewer registers their own profile directly into `/members` bypassing admin-only curation.
```json
{
  "firstName": "Attacker",
  "lastName": "User",
  "membershipStatus": "Active"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 9: Mutating Immutable Records (`createdAt`)
An admin/attacker updates `createdAt` time of an established member document.
```json
{
  "lastName": "Abante",
  "firstName": "Joel",
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 10: Injecting Out-Of-Bounds Values (Enum Injection)
Registering attendance with status that is not 'Present' or 'Absent'.
```json
{
  "eventId": "event_01",
  "eventName": "Service",
  "eventDate": "2026-05-31T15:00:00Z",
  "memberId": "member_01",
  "memberName": "Joel Abante",
  "status": "MaliciousStatusValue",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 11: Orphaning Related Entities
Deleting an Event Schedule directly without verification, and inserting attendance for that orphan event.
```json
{
  "eventId": "non_existent_event_id",
  "eventName": "Service",
  "eventDate": "2026-05-31",
  "memberId": "member_01",
  "memberName": "Joel Abante",
  "status": "Present",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 12: Anonymous Write Curation Bypass
Attempting to create, edit, or remove entries while unsigned in/anonymous.
```json
{
  "lastName": "Abante",
  "firstName": "Joel"
}
```
*Expected Result: PERMISSION_DENIED*

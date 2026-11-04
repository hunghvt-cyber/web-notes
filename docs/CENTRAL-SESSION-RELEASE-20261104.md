# Homepage–Notes central session release — 2026-11-04

Owner entry: https://homepage-nas.vercel.app/notes/. Homepage is the sole owner-session/password control. Legacy Notes owner entries redirect to it; independent capability share links retain their existing domain and permission flow.

## Released source and runtime

- Notes PR #47 plus alias correction #48. Final runtime source `4a16a2eb954b95a027cea3cc85a022f409ea207b`; deployment `dpl_BuMbcG2FAXyZVqNPoFAsgCj8H3e6`, READY. All three Notes aliases (hunghvt-notes.vercel.app, hunghvt-notes-hunghvt.vercel.app, hunghvt-notes-git-main-hunghvt.vercel.app) read back on that deployment.
- Homepage PR #48 plus exact trailing-slash rewrite #49. Final runtime source `19d463259bde37b028eca850141422c85d1523ed`; deployment `dpl_HPGevFmcHJD8iiXHrNfHiGksi3en`, READY. `/notes/` HTTP 200, Notes HTML and relative assets verified. Before exact `/notes/` rewrite, production browser QA found Homepage 404 while `/notes/app.js` already proxied; this was corrected and rechecked.
- Existing NOTES_AUTH_SERVICE_KEY is used only on servers for method/path/query/body/version/time-bound HMAC grants. Homepage validates its own current cookie/version for each owner API request. Notes production shared-auth mode rejects legacy owner cookie/password login. Browser cookies and passwords are not forwarded to Notes by the API gateway. No new environment variable or credential rotation was needed.

## Evidence and limits

Homepage local tests 138/138 PASS; Notes source check 51 modules, offline 205/205 PASS. Hosted Homepage CI 41772340716 and trailing-slash correction CI 41772966982 PASS. Notes CI 41772356217 and alias correction CI 41773253606 PASS, including browser jobs.

A cross-repository synthetic fixture used real Homepage cookie unsealing and the real Notes grant verifier: authenticated owner succeeds; absent cookie and changed central password version cannot reach synthetic Notes storage. Grant tampering, expiry, direct owner login, cross-origin mutation and cookie forwarding are covered by focused tests. This is not production user-login evidence.

Live public reads: old Notes `/api/app?route=auth` and Homepage gateway auth return HTTP 200/authenticated:false for an anonymous client; Notes health HTTP 200 reports firestore-native-v1 and firestoreRead=PASS. Production browser at Homepage `/notes/` visibly showed Notes đang khóa and Mở khóa tại Homepage, with no separate password field. No actual user password was entered, no production Notes were read or mutated, and no physical iPad/S25 Ultra login qualification is claimed.

Locking Homepage removes that browser's authority for subsequent Notes API calls; same-origin BroadcastChannel/focus checks update open Notes tabs. In-flight already-authorized requests cannot be guaranteed cancelled. Changing password keeps existing all-session version revocation. Share-link revocation stays independent. See NOTES-CENTRAL-SESSION-20261104.md for protocol details.

Pre-change rollback pair (only for an intentional coordinated rollback): Homepage `dpl_AGecVEj1BjUeLuidkmenAy414edf` / `3858a56de19117dad695c7d208f81dc8776f771b`; Notes `dpl_5ktkJTN9hn9c7Gk9oH6UNXTGsuzX` / `14d5dfbd4f19d54bb584dae6bede72947715020c`. Rolling only one application back can break the new entry or authentication contract. Notes does not auto-deploy from Git: this documentation commit is later than the runtime source above and does not claim another deployment.

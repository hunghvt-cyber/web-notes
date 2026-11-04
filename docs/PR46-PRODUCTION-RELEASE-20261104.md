# PR46 Production release — 04/11/2026

PR #46 merged as `cad718270e3a1bb444d539fb5369586753763c05`, tree `e130eca44fdfd1affb932092d7653e7c8e40f784`, incorporating current main including Homepage session changes.

Cache limits: 1 MiB per projected current note, 4 MiB aggregate, 12 entries, LRU. Only server-confirmed content is persisted; history loads on demand through the existing GET. Unacknowledged drafts remain RAM-only. Finite serialized JSON budget can still exclude escape-heavy notes.

Validation: local Node 24 offline tests 206/206 and source check pass. GitHub Actions [41835442477](https://github.com/hunghvt-cyber/web-notes/actions/runs/41835442477) passed both test and browser jobs on the exact merge SHA, including grid regression. Local browser could not launch because this environment disallowed sockets; hosted browser checks supplied qualification. No Gemini runtime was available in this environment; previous PR review evidence remains in PERFORMANCE-CACHE-20261101.md.

Explicit Production deployment `dpl_7ocKN7iicWaABL7Mb53SZEpodehX` reached READY from the exact 38 tracked runtime/config files, with matching commit metadata. Build approximately 23 seconds. All three Notes aliases point to it with empty protectionBypass:
- hunghvt-notes.vercel.app
- hunghvt-notes-hunghvt.vercel.app
- hunghvt-notes-git-main-hunghvt.vercel.app

Read-only health returned HTTP 200, firestore-native-v1, firestoreRead=PASS and Cache-Control no-store. Served app.js and cache.js match the release files exactly both at the primary Notes domain and homepage-nas.vercel.app/notes/. Homepage rewrite therefore serves the new frontend without another Homepage deployment. Error/fatal log query scoped to the new deployment returned no records in the post-release window; this is limited initial observation.

Rollback: reassign the three aliases to prior READY deployment `dpl_BuMbcG2FAXyZVqNPoFAsgCj8H3e6`, then verify mappings and health. No physical S25 Ultra/iPad latency measurement is claimed. No real Notes were edited. This record supersedes earlier draft/unmerged statements for PR46.

# Note cache for large source notes — 2026-11-01

## Scope and source

Candidate for draft PR from clean `main` `14d5dfbd4f19d54bb584dae6bede72947715020c`, tree `73ee72824b232cd2f50c9c975fce23cbfcf9026c`. The dirty speed-session worktree was left untouched. This change is frontend-only and uses the current owner Notes API. It excludes PR #34, #24 and #40. No merge, deployment, billing, IAM/WIF, backend or Production data change was made.

At investigation time Production was READY at deployment
`dpl_5ktkJTN9hn9c7Gk9oH6UNXTGsuzX`, source `14d5dfbd4f19d54bb584dae6bede72947715020c`. All three Notes aliases resolved to it with empty protection-bypass state; the primary alias returned Firestore native health PASS. Immediate rollback remains the previous Production deployment `dpl_6JvV65W8wi6AQgyNfbUfA7gjC5LJ` (PR43). No Production action was taken.

## Confirmed cache cause and bounds

The prior content limit was 256 KiB per note, 1 MiB total and 12 notes. Cache admission measured UTF-8 bytes of `JSON.stringify(note)`, which included current text, title, checklist, metadata and up to five prior history versions. The user confirms the AutoHotkey current text alone exceeded 256 KiB; the supplied opt-in device summary independently counted five `note_too_large` misses. The cap therefore rejected this note even without history. History could also reject smaller current text. The `entry_absent` cases remain separately unexplained by those samples.

`lib/store.mjs` validates `Buffer.byteLength(text) + Buffer.byteLength(JSON.stringify(checklist)) <= 1,000,000`. The new cache projects only server-confirmed current fields and uses UTF-8 byte size of `JSON.stringify(projectedCurrentNote)`. JSON escaping can expand text containing many newlines or control characters, so the cache is not guaranteed to retain every API-accepted 1,000,000-byte payload. That ceiling is a cache-storage bound; an entry above it stays on the server and reports `note_too_large` rather than consuming unbounded local space. The limits are:

- 1 MiB per projected note: about the API's 1,000,000-byte text/checklist input ceiling plus serialized metadata. It supports the 280,000-byte source fixture and ordinary large code notes while remaining finite; unusually escape-heavy or larger serialized entries may still miss.
- 4 MiB aggregate and at most 12 notes: hard storage bound that holds four 1 MiB serialized entries, or more smaller recent notes.
- LRU eviction uses the in-RAM `usedAt` timestamp; storage exceptions/quota errors remain non-fatal.

History is omitted from the cached object and marked unloaded. It remains available from the existing full-note GET when the user opens History under the editor's More menu. The test restores a prior version through that menu and confirms the normal save ACK. This does not introduce an API route or import the unqualified PR #34 changes.

## Data and session safeguards

Only successful full-note GET results and valid save ACK results reach `cacheContent`. Draft edits remain in the tab's RAM and are not written to IndexedDB. The legacy draft database is not opened, migrated, cleared or deleted. Cache reads still follow successful authentication and use the exact `cacheScope`; reuse still requires list ID and revision equality. List refresh removes entries whose note is absent or revision changes. Deferred cache projection and writes are fenced by scope generation, write version and scope equality; session expiry cancels queued idle jobs before private cache deletion. Save CAS, `clientOpId`, retry, ACK state, history/trash/sharing/revocation and namespace/session behavior are unchanged.

## Synthetic evidence

The browser fixture uses synthetic Unicode source and a synthetic prior version, each 280,000 raw UTF-8 bytes. The previous policy would reject the current note because its serialized size exceeds 256 KiB. The new projection fits under 1 MiB, stores current text without history, reuses the same note after close/reopen and page reload, loads history with exactly one additional full-note GET, restores the previous version through the existing ACK path, and invalidates the cache after a server revision change. Separate tests exercise LRU eviction from five 900,000-byte entries, quota failure, unacknowledged edits, revision/CAS behavior, and session-expiry cache fencing. A synthetic 600,000-newline text passes the API's raw text byte rule but exceeds the cache's serialized JSON cap, documenting that the cache budget is a bounded storage limit rather than an expansion of API semantics.

The synthetic Chromium diagnostics for one run recorded:

| Fixture observation | Result |
| --- | ---: |
| Current text / prior version | 280,000 / 280,000 UTF-8 bytes |
| Initial miss click → content assignment | 227 ms |
| Initial miss click → first frame | 13,387 ms |
| Cache projection / size serialization / IndexedDB write | 0 / 7 / 6 ms |
| Warm-hit guard wait | 0 ms |
| Warm-hit click → content assignment / first frame | 12,834 / 12,976 ms |
| Warm-hit frame-after-update / fetch-to-headers / body+JSON | 142 / 73 / 1 ms |

The unusually long frame and warm-hit pre-assignment spans are not explained by the short network/body spans in this local harness. They are recorded as a fixture limitation/open timing question, not attributed to Firestore, not treated as an app speedup, and not generalized to a physical device. Gemini key5 also called the implementation promising but over-read the fixture when it described frame timing as stable; that conclusion is rejected because this fixture records a 13.4-second warm click-to-frame span. User-reported measurements from before this change remain: five cache hits at click→first-frame p50 25 ms/max 122 ms; nine misses p50 4,302 ms/max 6,023 ms, with reasons `note_too_large=5` and `entry_absent=4`. No post-change device sample exists.

## Auth/store latency is separate

The user's server spans (pre-response p50 3,305 ms, auth 900 ms, store operation 2,271 ms, response body+JSON 513 ms) are not summed: spans can overlap. `network_ms` is fetch-to-response-headers and is not Firestore time; response-body timing includes transfer and parsing. Source wraps authenticated-session validation, store initialization and a store method as separate spans. The store-operation span can include lazy OIDC/Google SDK work and repository access; source does not identify Firestore as the sole cause.

Follow-up directions, without changing this candidate:

1. Collect a small, separate opt-in set on each device/profile for clean cache hit, clean cache miss and revision validation, retaining the same-request allowlisted server spans. This checks whether the current miss reasons and long server spans recur; it is device evidence, not provided by CI.
2. If `server_auth` remains high, add bounded sub-duration measurements around session unsealing and validation to locate time within the existing auth span. Do not change auth behavior based on the current aggregate alone.
3. If store time remains high, split the existing store span into initialization/token acquisition, repository read and response serialization durations before considering any backend work. A separate lazy-history API would need its own compatibility and Cloud/Vercel qualification; it is outside this candidate.

## Verification and limits

Gemini key4 reviewed the frontend diff for private-data and session risks. It raised general checks for idle-job scope fencing, history revision validation, callback cleanup and the 250 ms fallback when `requestIdleCallback` is unavailable. Source inspection confirms scope+generation checks and cancellation before private-cache deletion; history results are accepted only for the same active clean session/base revision; idle jobs remove themselves before invoking callbacks. The fallback remains a bounded delay for the optional cache write, not a draft or authoritative save. A browser expiry fixture now verifies queued jobs cannot write after session expiry. No change to auth, CAS or retry was recommended.

Gemini key5 reviewed the bounds and test coverage twice. It accepted the 1 MiB/4 MiB bounded cache policy after the explicit JSON-escaping case was added. Its statement that the large-note fixture showed stable frame timing is not supported by the measured 13-second warm click-to-frame span and is not adopted. No key received Notes, credentials or private logs.

Local results: `npm test` 204/204, `npm run check:source` 50 files, `git diff --check` clean, and browser smoke 42/42. Local Node is `v22.23.4`; the repository targets Node 24, so hosted GitHub Actions remains the Node 24 check. These fixture/API tests do not qualify Vercel OIDC or live Cloud Firestore. Chromium on NAS does not represent S25 Ultra Android 16 or iPad mini 7, and the anomalous large-note frame timing remains unresolved. No real Notes or code were read. No speed improvement on a physical device is claimed.

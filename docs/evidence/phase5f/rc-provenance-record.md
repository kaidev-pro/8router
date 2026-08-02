# 8Router v1.0.0-rc.1 — RC Provenance Record

## SHA Chain

| Step | SHA | Description |
|------|-----|-------------|
| Frozen RC | `87a8cb7` | v1.0.0-rc.1 tag, release notes, changelog |
| Version update | `d27ca91` | version.ts: 0.6.1 → 1.0.0-rc.1 |
| Deploy docs | `65c4ca7` | deployment plan, rollback, smoke tests |
| **Deployed** | `65c4ca7` | systemd restart with this SHA |

## Delta Analysis: 87a8cb7 → 65c4ca7

```
 src/version.ts                      |   4 +-   (version string only)
 docs/runbooks/deployment-plan.md    | 130 +++   (new)
 docs/runbooks/rollback-procedure.md |  73 ++    (new)
 scripts/smoke-test.sh               |  77 ++    (new)
 4 files changed, 282 insertions(+), 2 deletions(-)
```

**Runtime code changes:** NONE
**Database migrations:** NONE
**Feature flag changes:** NONE
**Behavioral changes:** NONE

Only differences:
1. `version.ts` — version string 0.6.1 → 1.0.0-rc.1 (display only)
2. Three new docs/scripts files (deployment tooling, no runtime impact)

## Conclusion

Deployed SHA `65c4ca7` is provenance-equivalent to frozen SHA `87a8cb7`
for all runtime behavior. The delta is pure metadata + deployment docs.

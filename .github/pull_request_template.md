## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other: ___

## Checklist

### Code Quality
- [ ] Tests passing (`npm test` in backend/)
- [ ] TypeScript compiles clean (`npx tsc --noEmit` in frontend/)
- [ ] Lint passing (`npm run lint`)
- [ ] No `console.log` left in code
- [ ] No secrets or keys in code

### Security
- [ ] Multi-tenant isolation maintained (no cross-tenant data leak)
- [ ] RLS policies active on new tables
- [ ] `tenant_id` present on new columns
- [ ] `get_current_tenant()` used in queries (not hardcoded tenant)

### Documentation
- [ ] Documentation Loop completed:
  - [ ] `ROADMAP.md` updated
  - [ ] `docs/decisions-log.md` updated (if new decision)
  - [ ] `docs/audit/changelog.md` updated
  - [ ] `CONTRIBUTING.md` updated (if new convention)

### Database
- [ ] Migration has `tenant_id` column
- [ ] Migration has RLS policy
- [ ] Migration has `tenant_id`-led index
- [ ] No global unique indexes (breaks multi-tenancy)

## Testing Evidence

```
[Paste test output here]
```

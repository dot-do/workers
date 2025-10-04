# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code Quality

- [ ] All tests passing locally (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Code formatted (`pnpm format`)
- [ ] No lint warnings
- [ ] Test coverage ≥ 80%
- [ ] PR approved by at least one reviewer

### Configuration

- [ ] Secrets configured in GitHub Actions
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] Wrangler secrets set for affected services
- [ ] Environment variables updated in `wrangler.jsonc`
- [ ] Route configurations verified
- [ ] Service bindings configured correctly

### Testing

- [ ] Unit tests pass (`pnpm test`)
- [ ] Integration tests pass (`pnpm test:integration`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Manual testing completed in staging
- [ ] Performance benchmarks within acceptable range

## Staging Deployment

### Deploy to Staging

- [ ] Deploy to staging environment
  ```bash
  gh workflow run deploy.yml -f service=all -f environment=staging
  ```
- [ ] Verify all services deployed successfully
- [ ] Check deployment logs for warnings/errors

### Staging Validation

- [ ] Health checks passing
  - [ ] Gateway: `https://staging.api.services.do/health`
  - [ ] DB: `https://db-staging.workers.services.do/health`
  - [ ] Auth: `https://auth-staging.workers.services.do/health`
  - [ ] Other services
- [ ] Critical endpoints working
  - [ ] Authentication flow
  - [ ] Database queries
  - [ ] External integrations
- [ ] Load test results acceptable
- [ ] Error rates normal (<1%)
- [ ] Response times acceptable (<500ms p95)

### Smoke Tests

- [ ] User authentication works
- [ ] API endpoints respond correctly
- [ ] Database reads/writes working
- [ ] Webhooks receiving events
- [ ] Email sending functional
- [ ] MCP server responding
- [ ] Queue processing messages
- [ ] Schedule tasks running

## Production Deployment

### Pre-Production

- [ ] Notify team in Slack/Discord
- [ ] Check Cloudflare status page (no ongoing incidents)
- [ ] Verify no concurrent deployments
- [ ] Backup critical data if needed
- [ ] Prepare rollback plan

### Deploy to Production

- [ ] Create deployment issue/ticket
- [ ] Deploy to production
  ```bash
  gh workflow run deploy.yml -f service=all -f environment=production
  ```
- [ ] Monitor deployment logs in real-time
- [ ] Verify deployment completed successfully

### Post-Deployment Validation

- [ ] Health checks passing
  - [ ] Gateway: `https://api.services.do/health`
  - [ ] All microservices
- [ ] Critical endpoints working
- [ ] No error spikes in logs
- [ ] Response times normal
- [ ] Cloudflare Analytics showing traffic

### Monitoring (First 30 Minutes)

- [ ] Monitor error rates
  - Target: <1% error rate
  - Alert: >2% error rate
- [ ] Monitor response times
  - Target: <500ms p95
  - Alert: >1000ms p95
- [ ] Monitor traffic patterns
  - Ensure normal distribution
  - No unexpected drops
- [ ] Check user reports
  - No complaints in support channels
  - No error reports from users

### Monitoring (First 24 Hours)

- [ ] Review Cloudflare Analytics
- [ ] Check error logs
- [ ] Verify all scheduled tasks ran
- [ ] Confirm all webhooks processed
- [ ] Review performance metrics

## Rollback Procedure

### If Issues Detected

- [ ] Assess severity
  - Critical: Immediate rollback
  - High: Fix forward or rollback
  - Medium: Monitor and fix
  - Low: Fix in next release

### Immediate Rollback

If critical issues:

```bash
# Option 1: Re-run previous successful deployment
gh run list --workflow=deploy.yml --status=success --limit=1
gh run rerun <previous-run-id>

# Option 2: Trigger rollback workflow
gh workflow run gateway.yml
# (rollback job will automatically trigger on failure)

# Option 3: Manual rollback
git checkout <previous-commit>
gh workflow run deploy.yml -f service=<affected-service>
```

### Post-Rollback

- [ ] Verify services restored to previous state
- [ ] Confirm health checks passing
- [ ] Notify team of rollback
- [ ] Create incident report
- [ ] Document root cause
- [ ] Plan fix for next deployment

## Post-Deployment

### Cleanup

- [ ] Close deployment issue/ticket
- [ ] Update documentation if needed
- [ ] Archive deployment logs
- [ ] Update STATUS.md

### Communication

- [ ] Notify team of successful deployment
- [ ] Update changelog
- [ ] Announce new features (if any)
- [ ] Close related GitHub issues

### Documentation

- [ ] Update API documentation
- [ ] Update deployment notes
- [ ] Document any configuration changes
- [ ] Update runbooks if procedures changed

## Emergency Deployment

For critical hotfixes:

### Fast Track

- [ ] Identify critical bug
- [ ] Create hotfix branch from main
- [ ] Implement minimal fix
- [ ] Test locally
- [ ] Deploy directly to staging
- [ ] Quick smoke test in staging
- [ ] Deploy to production immediately
- [ ] Monitor closely
- [ ] Create post-mortem

### Skip-Staging Deployment

Only in true emergencies:

- [ ] Get approval from senior engineer
- [ ] Document reason for skipping staging
- [ ] Deploy to production
- [ ] Monitor extra closely
- [ ] Be ready for immediate rollback

## Deployment Frequency

### Recommended Schedule

- **Staging**: Multiple times per day (as needed)
- **Production**:
  - Regular: 2-3 times per week
  - Hotfixes: As needed
  - Major releases: Once per sprint

### Deployment Windows

- **Best Times**:
  - Tuesday-Thursday, 10am-4pm (your timezone)
  - Low traffic periods
- **Avoid**:
  - Friday afternoon
  - Weekends
  - Holidays
  - High traffic periods

## Rollback Decision Matrix

| Severity | Error Rate | Response Time | Action | Timeline |
|----------|-----------|---------------|--------|----------|
| Critical | >5% | >2s | Immediate rollback | <5 min |
| High | 2-5% | 1-2s | Rollback or fix forward | <15 min |
| Medium | 1-2% | 500ms-1s | Monitor, fix forward | <1 hour |
| Low | <1% | <500ms | Fix in next release | Next deploy |

## Tools and Commands

### Check Deployment Status

```bash
# View recent workflow runs
gh run list --workflow=deploy.yml --limit=5

# Watch deployment in progress
gh run watch

# View deployment logs
gh run view <run-id> --log
```

### Health Check All Services

```bash
# Production
curl -f https://api.services.do/health
curl -f https://db.workers.services.do/health
curl -f https://auth.workers.services.do/health
# ... other services

# Staging
curl -f https://staging.api.services.do/health
curl -f https://db-staging.workers.services.do/health
# ... other services
```

### Monitor Logs

```bash
# Tail logs for specific service
cd gateway
wrangler tail --env production

# Filter for errors
wrangler tail --env production --status=error
```

### Check Cloudflare Analytics

```bash
# Open Cloudflare dashboard
open https://dash.cloudflare.com

# Or use API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

## Contacts

### On-Call

- **Primary**: [Name] - [Contact]
- **Secondary**: [Name] - [Contact]
- **Manager**: [Name] - [Contact]

### Escalation

1. Primary on-call engineer
2. Team lead
3. Engineering manager
4. CTO

### Support Channels

- **Slack**: #deployments, #incidents
- **PagerDuty**: [Link]
- **Status Page**: https://status.services.do

## Additional Resources

- [Architecture Documentation](../../ARCHITECTURE.md)
- [Runbooks](../../docs/runbooks/)
- [Incident Response](../../docs/incident-response.md)
- [Cloudflare Status](https://www.cloudflarestatus.com)

---

**Last Updated:** 2025-10-03
**Version:** 1.0
**Owner:** DevOps Team

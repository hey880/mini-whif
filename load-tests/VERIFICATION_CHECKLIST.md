# Load Testing Verification Checklist

Use this checklist to verify the load testing suite is working correctly.

## Prerequisites Verification

### 1. k6 Installation
```bash
k6 version
```
Expected: `k6 v0.xx.x`

- [ ] k6 installed and working

### 2. Dependencies Installed
```bash
cd load-tests
pnpm install
```
Expected: Dependencies installed without errors

- [ ] pnpm dependencies installed

### 3. Environment Configuration
```bash
ls .env
```
Expected: `.env` file exists (copy from `.env.example` if not)

- [ ] .env file created
- [ ] SUPABASE_URL configured
- [ ] SUPABASE_SERVICE_ROLE_KEY configured
- [ ] DATABASE_URL configured
- [ ] DIRECT_URL configured

### 4. Services Running
```bash
# Terminal 1
cd apps/api
pnpm dev
```

```bash
# Terminal 2 (optional - can use mock mode)
cd apps/ai-server
fastapi dev
```

```bash
# Verify API
curl http://localhost:3000/health
```
Expected: `{"status":"ok","uptime":...}`

- [ ] API server running on port 3000
- [ ] AI server running on port 8000 (or mock mode active)
- [ ] Health check returns 200 OK

## Test Data Setup

### 5. Seed Test Database
```bash
cd load-tests
pnpm setup
```

Expected output:
```
🚀 Starting test database seeding...

📝 Creating 100 test users...
  ✓ Created user 001: loadtest-user-001@example.com
  ✓ Created user 002: loadtest-user-002@example.com
  ...

✅ Created 100 test users

💎 Initializing Gem wallets...
  ✓ Initialized wallet for loadtest-user-001@example.com
  ...

✅ Gem wallets initialized

🎭 Setting up test characters...
  ✓ Created character: 프리즘 (Haiku)
  ...

✅ Set up 10 test characters

💾 Saving test fixtures...
  ✓ Saved 100 users to fixtures/test-users.json
  ✓ Saved 10 characters to fixtures/characters.json

🎉 Test database seeding completed!
```

- [ ] Setup script completed without errors
- [ ] `fixtures/test-users.json` created
- [ ] `fixtures/characters.json` created
- [ ] Test users visible in Supabase dashboard

### 6. Verify Test Data
```bash
# Check fixtures exist
ls fixtures/
```
Expected: `test-users.json` and `characters.json`

```bash
# Count test users
cat fixtures/test-users.json | grep "email" | wc -l
```
Expected: 100 (or your configured TEST_USER_COUNT)

- [ ] Test users fixture exists
- [ ] Characters fixture exists
- [ ] Correct number of users created

## Smoke Tests

### 7. Health Check Test
```bash
pnpm smoke
```

Expected output:
```
     ✓ API health check status 200
     ✓ API health check has uptime

     checks.........................: 100%  ✓ 30   ✗ 0
     http_req_duration..............: avg=50ms  p95=100ms
     http_req_failed................: 0%    ✓ 0    ✗ 30
```

- [ ] Health check test passes
- [ ] All checks ✓
- [ ] p95 latency < 500ms
- [ ] 0% error rate

### 8. Authentication Flow Test
```bash
pnpm smoke:auth
```

Expected output:
```
     ✓ authentication successful
     ✓ received valid token
     ✓ profile fetch successful
     ✓ profile has email

     checks.........................: 100%  ✓ 200  ✗ 0
     http_req_duration..............: avg=150ms p95=300ms
```

- [ ] Auth flow test passes
- [ ] All checks ✓
- [ ] Token authentication works
- [ ] Profile retrieval works

## Load Tests

### 9. Chat Streaming Test
```bash
pnpm load:chat
```

Expected output (after 13 minutes):
```
     ✓ SSE stream connected
     ✓ SSE received chunks
     ✓ SSE stream completed

     sse_connection_time............: avg=200ms  p95=400ms
     sse_first_chunk_latency........: avg=1.2s   p95=1.8s
     sse_total_duration.............: avg=15s    p95=30s
     http_req_failed................: 0.5%   ✓ 50   ✗ 9950
     gem_balance_errors.............: 0      ✓ 0
```

- [ ] Chat streaming test completes
- [ ] SSE connection established
- [ ] Chunks received
- [ ] p95 first chunk < 2s
- [ ] p95 total duration < 35s
- [ ] 0 gem balance errors

### 10. ConnectRPC Test
```bash
pnpm load:rpc
```

Expected output (after 13 minutes):
```
     ✓ ListCharacters success
     ✓ GetCharacter success
     ✓ ListChatRooms success
     ✓ GetWallet success

     rpc_latency....................: avg=50ms   p95=150ms
     http_req_failed................: 0.3%
```

- [ ] ConnectRPC test completes
- [ ] All RPC services working
- [ ] p95 latency < 200ms
- [ ] Error rate < 1%

### 11. Mixed Workload Test (Optional)
```bash
pnpm load:mixed
```

Expected: Combination of above metrics

- [ ] Mixed workload test completes
- [ ] All scenarios execute
- [ ] Combined thresholds pass

## Cleanup and Verification

### 12. Check Results
```bash
ls results/
```

Expected: JSON/HTML files with test results

- [ ] Test results generated
- [ ] Results directory contains output files

### 13. Verify Gem Deduction
```bash
# Open Prisma Studio
cd ../apps/api
pnpm db:studio
```

Navigate to `gem_logs` table and verify:
- Entries exist for test users
- Gem amounts match model costs
- No negative balances in `gem_wallets`

- [ ] Gem logs recorded
- [ ] Gem amounts correct
- [ ] No negative balances

### 14. Cleanup Test Data
```bash
cd ../load-tests
pnpm cleanup
```

Expected output:
```
🧹 Starting test data cleanup...

🗑️  Deleting test messages...
  ✓ Deleted 500 message versions
  ✓ Deleted 300 user reactions
  ✓ Deleted 500 messages

💬 Deleting chat rooms...
  ✓ Deleted 150 chat rooms

💎 Resetting Gem wallets...
  ✓ Reset 100 Gem wallets

📜 Deleting Gem transaction logs...
  ✓ Deleted 500 Gem logs

✅ Cleanup completed!
```

- [ ] Cleanup script runs successfully
- [ ] Messages deleted
- [ ] Chat rooms deleted
- [ ] Gem wallets reset
- [ ] Gem logs deleted

### 15. Verify Cleanup
```bash
# Rerun smoke test to verify users still work
pnpm smoke:auth
```

Expected: Test still passes (users preserved)

- [ ] Smoke test passes after cleanup
- [ ] Test users still functional

## Advanced Tests (Optional)

### 16. Stress Test
```bash
pnpm stress
```

Expected: Test completes, system handles up to 200+ VUs

- [ ] Stress test completes
- [ ] System breaking point identified
- [ ] No catastrophic failures

### 17. Gem Deduction Concurrency Test
```bash
pnpm stress:gems
```

Expected:
```
     negative_balance_errors........: 0      ✓ 0
     gem_deduction_conflicts........: low number
     successful_deductions..........: high number
```

- [ ] Gem concurrency test passes
- [ ] Zero negative balance errors (CRITICAL)
- [ ] Atomic deductions verified

### 18. Spike Test
```bash
pnpm spike
```

Expected: System handles sudden traffic increases

- [ ] Spike test completes
- [ ] No service unavailable errors
- [ ] System recovers after spike

## CI/CD Integration (Optional)

### 19. GitHub Actions Workflow
Check `.github/workflows/load-test.yml` exists

- [ ] Workflow file exists
- [ ] Secrets configured in GitHub (if using)
- [ ] Manual workflow dispatch works

## Final Verification

### 20. Documentation
```bash
ls *.md
```

Expected files:
- README.md
- QUICK_START.md
- IMPLEMENTATION_SUMMARY.md
- VERIFICATION_CHECKLIST.md (this file)

- [ ] All documentation files present
- [ ] README.md comprehensive
- [ ] QUICK_START.md clear

### 21. Mock AI Mode (Cost Savings)
```bash
# In apps/api/.env, remove or comment out:
# OPENROUTER_API_KEY=...

# Restart API server
cd ../apps/api
pnpm dev

# Run chat test
cd ../load-tests
pnpm smoke
```

Expected: Test works with mock AI responses (no API costs)

- [ ] Mock mode works
- [ ] SSE streaming still functions
- [ ] No API costs incurred

## Success Criteria

All checkboxes should be checked (✓) for full verification.

**Required** (Must Pass):
- [x] k6 installed
- [x] Dependencies installed
- [x] Environment configured
- [x] Services running
- [x] Test data seeded
- [x] Smoke tests pass
- [x] Load test (chat) passes
- [x] 0 gem balance errors
- [x] Cleanup works

**Optional** (Nice to Have):
- [ ] Load test (RPC) passes
- [ ] Stress tests complete
- [ ] Spike test completes
- [ ] CI/CD configured
- [ ] Mock mode verified

## Troubleshooting

If any check fails, refer to:
1. `README.md` - Troubleshooting section
2. `QUICK_START.md` - Setup issues
3. Test script comments - Inline help
4. k6 documentation - https://k6.io/docs/

## Common Issues

### "No test users found"
**Solution**: Run `pnpm setup` again

### "API is not healthy"
**Solution**:
```bash
cd apps/api
pnpm dev
curl http://localhost:3000/health
```

### "Out of gems" during tests
**Solution**: This is expected. Run `pnpm cleanup && pnpm setup` to reset

### Threshold failures
**Solution**: Adjust thresholds in test scripts based on your system capabilities

### SSE parsing errors
**Solution**: Verify AI server is running or mock mode is active

## Report Results

After verification, document:
- [ ] Date verified: ___________
- [ ] Total checks passed: ___ / ___
- [ ] System specs: ___________
- [ ] Notes/Issues: ___________

---

**Verification Complete**: [ ] Yes / [ ] No

If "No", review failed items and troubleshooting section.
If "Yes", congratulations! Your load testing suite is ready. 🎉

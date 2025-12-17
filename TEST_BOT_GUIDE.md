# 🤖 Agility App Test Bot

## Quick Start

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run Tests

#### Quick Smoke Test (Fast - ~10 seconds)
```powershell
npm run test:smoke
```

#### Comprehensive Test Suite (Full - ~30 seconds)  
```powershell
npm run test:comprehensive
```

#### Watch Mode (Re-runs on file changes)
```powershell
npm run test:watch
```

#### With Coverage Report
```powershell
npm run test:coverage
```

---

## Test Suites Overview

### 🔥 Smoke Tests (`test/smoke.test.js`)
Quick validation that everything is working:
- Database connection
- Test data exists  
- Schema column names correct
- Status values are lowercase
- Key joins work
- CRUD operations work

### 📋 Comprehensive Tests (`test/comprehensive.test.js`)
Full test coverage across 15 categories:

| # | Category | Tests |
|---|----------|-------|
| 1 | Database Connection | 2 |
| 2 | Consultants Table | 5 |
| 3 | Clients Table | 5 |
| 4 | Projects Table | 7 |
| 5 | Time Entries Table | 7 |
| 6 | Job Types Table | 3 |
| 7 | Relational Integrity | 3 |
| 8 | Dashboard Queries | 5 |
| 9 | Billing Dashboard | 3 |
| 10 | HomePage Queries | 3 |
| 11 | CRUD Operations | 6 |
| 12 | Aggregate Queries | 3 |
| 13 | Search & Filter | 4 |
| 14 | Reporting Queries | 3 |
| 15 | Edge Cases | 4 |

**Total: ~63 tests**

---

## What's Being Tested

### Schema Validation
- ✅ Correct column names (`name` not `project_name`)
- ✅ Correct column names (`billing_date` not `expected_billing_date`)
- ✅ Lowercase status values (`active`, `ready_to_bill`, etc.)
- ✅ All required columns exist

### Data Integrity
- ✅ Foreign key relationships valid
- ✅ Test data properly seeded
- ✅ No orphaned records

### Query Patterns  
- ✅ Dashboard project counts
- ✅ Billing calculations
- ✅ Time entry aggregations
- ✅ Client/Consultant joins
- ✅ Date range filters
- ✅ Status filters

### CRUD Operations
- ✅ Create projects
- ✅ Read with joins
- ✅ Update records
- ✅ Delete records
- ✅ Time entry creation

### Error Handling
- ✅ Non-existent records
- ✅ Empty results
- ✅ Invalid columns
- ✅ Null values

---

## Prerequisites

1. **Test Data Must Be Loaded**
   ```sql
   -- Run seed_test_data.sql in Supabase SQL Editor first
   ```

2. **Environment Variables**
   Make sure `.env` file has:
   ```
   VITE_SUPABASE_URL=your-url
   VITE_SUPABASE_ANON_KEY=your-key
   ```

---

## Troubleshooting

### "Test data not found"
Run the seed script first:
```sql
-- In Supabase SQL Editor, run:
-- database/seed_test_data.sql
```

### "Missing Supabase credentials"
Check your `.env` file exists and has valid values.

### Tests timing out
Increase timeout in `vitest.config.js`:
```js
test: {
  testTimeout: 60000, // 60 seconds
}
```

---

## Cleanup Test Data

When done testing, remove test data:
```sql
DELETE FROM time_entries WHERE id::text LIKE 'b000000%';
DELETE FROM projects WHERE id::text LIKE 'a000000%';
DELETE FROM clients WHERE id::text LIKE 'd000000%';
DELETE FROM consultants WHERE id::text LIKE 'c000000%';
```

---

## Adding New Tests

1. Add to `test/comprehensive.test.js` in appropriate section
2. Or create new file `test/your-feature.test.js`
3. Import from `./setup.js` for Supabase client and test IDs
4. Run with `npm test`

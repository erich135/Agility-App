-- ============================================
-- SEED RATE REALIZATION DATA
-- Updates time_entries to show varying efficiency (Realization)
-- ============================================

-- 1. High Efficiency (Premium Billing)
-- These entries billed at higher than standard rate (e.g. Fixed Price or Rush)
UPDATE time_entries 
SET hourly_rate = 1200 
WHERE description LIKE '%Trust return%' AND consultant_id IN (SELECT id FROM consultants WHERE hourly_rate < 1000);

-- 2. Standard Efficiency (Normal Billing)
-- Ensure some match exactly (should be 100%)
UPDATE time_entries 
SET hourly_rate = (SELECT hourly_rate FROM consultants WHERE id = time_entries.consultant_id)
WHERE description LIKE '%Bookkeeping%';

-- 3. Low Efficiency (Discounted / Write-down)
-- Billed lower than standard rate
UPDATE time_entries 
SET hourly_rate = 350
WHERE description LIKE '%Bank reconciliations%' AND consultant_id IN (SELECT id FROM consultants WHERE hourly_rate > 350);

-- 4. Specific Examples matching Screenshot context
-- "Tax Services" - Sarah Jones (Std R650) -> Billed R850 (130% efficient)
UPDATE time_entries
SET hourly_rate = 850
WHERE description LIKE '%Tax%';

-- "AFS" - Sarah Jones (Std R650) -> Billed R500 (77% efficient)
UPDATE time_entries
SET hourly_rate = 500
WHERE description LIKE '%AFS%';

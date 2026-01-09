-- ============================================
-- SEED BUDGET DATA FOR DEMO
-- Run this in Supabase SQL Editor to populate efficiency metrics
-- ============================================

-- 1. Annual Financial Statements (Over Budget Example)
-- Budget: 20h, Actual: 25h -> Efficiency: 80% (Red/Yellow)
UPDATE projects 
SET estimated_hours = 20, total_hours = 25 
WHERE name LIKE '%Annual Financial Statements%';

-- 2. Monthly Bookkeeping (Efficient Example)
-- Budget: 15h, Actual: 10h -> Efficiency: 150% (Green)
UPDATE projects 
SET estimated_hours = 15, total_hours = 10 
WHERE name LIKE '%Monthly Bookkeeping%';

-- 3. Tax Returns (On Budget Example)
-- Budget: 5h, Actual: 5h -> Efficiency: 100% (Green)
UPDATE projects 
SET estimated_hours = 5, total_hours = 5 
WHERE name LIKE '%Tax Return%';

-- 4. VAT Returns (Slightly Over Budget)
-- Budget: 2h, Actual: 2.5h -> Efficiency: 80%
UPDATE projects 
SET estimated_hours = 2, total_hours = 2.5 
WHERE name LIKE '%VAT Return%';

-- 5. Payroll (Very Efficient)
-- Budget: 4h, Actual: 2h -> Efficiency: 200%
UPDATE projects 
SET estimated_hours = 4, total_hours = 2 
WHERE name LIKE '%Payroll%';

-- Quick fix to ensure specific projects from the screenshot have data
-- "Legend Aviation" (Client) -> "Tax Services"
UPDATE projects 
SET estimated_hours = 10, total_hours = 5.5
WHERE name = 'Tax Services 2024/2025';

-- "Heritage Wines" -> "Monthly Bookkeeping"
UPDATE projects
SET estimated_hours = 10, total_hours = 9
WHERE name = 'Monthly Bookkeeping Services';

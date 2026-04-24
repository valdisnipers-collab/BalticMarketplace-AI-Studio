-- 007_category_canonical_ids.sql
-- Normalize the `category` column on listings and saved_searches from Latvian
-- display labels to canonical machine identifiers. Idempotent — only rows
-- still holding a known legacy label are rewritten.
--
-- Canonical ids per src/constants/categories.ts:
--   transport, real_estate, electronics, jobs, home_garden, fashion,
--   children, sports_leisure, animals, services, food_agri, other

-- Listings
UPDATE listings SET category = 'transport'      WHERE category = 'Transports';
UPDATE listings SET category = 'real_estate'    WHERE category = 'Nekustamais īpašums';
UPDATE listings SET category = 'electronics'    WHERE category = 'Elektronika';
UPDATE listings SET category = 'jobs'           WHERE category = 'Darbs un pakalpojumi';
UPDATE listings SET category = 'home_garden'    WHERE category = 'Mājai un dārzam';
UPDATE listings SET category = 'fashion'        WHERE category = 'Mode un stils';
UPDATE listings SET category = 'children'       WHERE category = 'Bērniem';
UPDATE listings SET category = 'sports_leisure' WHERE category = 'Sports un hobiji';
UPDATE listings SET category = 'animals'        WHERE category = 'Dzīvnieki';
UPDATE listings SET category = 'services'       WHERE category = 'Pakalpojumi';
UPDATE listings SET category = 'food_agri'      WHERE category = 'Pārtika un lauksaimniecība';
UPDATE listings SET category = 'other'          WHERE category = 'Cits';

-- Saved searches
UPDATE saved_searches SET category = 'transport'      WHERE category = 'Transports';
UPDATE saved_searches SET category = 'real_estate'    WHERE category = 'Nekustamais īpašums';
UPDATE saved_searches SET category = 'electronics'    WHERE category = 'Elektronika';
UPDATE saved_searches SET category = 'jobs'           WHERE category = 'Darbs un pakalpojumi';
UPDATE saved_searches SET category = 'home_garden'    WHERE category = 'Mājai un dārzam';
UPDATE saved_searches SET category = 'fashion'        WHERE category = 'Mode un stils';
UPDATE saved_searches SET category = 'children'       WHERE category = 'Bērniem';
UPDATE saved_searches SET category = 'sports_leisure' WHERE category = 'Sports un hobiji';
UPDATE saved_searches SET category = 'animals'        WHERE category = 'Dzīvnieki';
UPDATE saved_searches SET category = 'services'       WHERE category = 'Pakalpojumi';
UPDATE saved_searches SET category = 'food_agri'      WHERE category = 'Pārtika un lauksaimniecība';
UPDATE saved_searches SET category = 'other'          WHERE category = 'Cits';

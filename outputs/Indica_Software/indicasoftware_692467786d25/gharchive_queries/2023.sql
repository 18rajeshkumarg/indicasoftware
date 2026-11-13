-- Review estimated bytes/cost and set maximum_bytes_billed before running.
-- Export raw rows as JSONL, then pass --evidence (standalone) or --provenance-evidence.
-- Repeat for every relevant year, former owner/name and provider. No results prove nothing.
SELECT id, type, repo, public, created_at, payload
FROM `githubarchive.day.*`
WHERE _TABLE_SUFFIX BETWEEN '20230101' AND '20231231'
  AND public = TRUE AND (CAST(repo.id AS STRING) = '1412747107' OR LOWER(repo.name) IN ('18rajeshkumarg/indicasoftware'))
ORDER BY created_at;

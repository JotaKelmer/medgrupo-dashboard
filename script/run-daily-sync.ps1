param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Secret = "revdata_meta_sync_2026_medgrupo"
)

$headers = @{ "x-sync-secret" = $Secret }
Invoke-RestMethod -Uri "$BaseUrl/api/sync/daily" -Method GET -Headers $headers

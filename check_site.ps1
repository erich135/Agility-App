try {
  $r = Invoke-WebRequest -Uri 'https://agility.lmwfinance.app/' -UseBasicParsing -TimeoutSec 30
  Write-Output ("HTTP $($r.StatusCode)")
  $s = $r.Content
  if ($s.Length -gt 1200) { $s = $s.Substring(0,1200) }
  Write-Output '--- HTML snippet (first 1200 chars) ---'
  Write-Output $s
} catch {
  Write-Output ("Request failed: $($_.Exception.Message)")
  try { curl.exe -s -I https://agility.lmwfinance.app/ | Select-String -Pattern 'HTTP/|Location|Content-Type' } catch { Write-Output 'curl also failed' }
}

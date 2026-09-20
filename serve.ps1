<#
  serve.ps1 - tiny local web server for testing Focus Village.

  Run it:      powershell -ExecutionPolicy Bypass -File serve.ps1
  Then open:   http://localhost:8080

  To test on your phone, make sure the phone is on the same Wi-Fi and
  open the LAN address this script prints. Press Ctrl+C to stop.
#>

param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.webp' = 'image/webp'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$Port/")

try {
  $listener.Start()
} catch {
  # Binding to all interfaces usually needs admin; fall back to localhost only.
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $listener.Start()
  Write-Host "Note: only localhost is reachable (run as admin for phone testing)."
}

$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress)

Write-Host ""
Write-Host "Focus Village is being served from: $root"
Write-Host "  On this PC:  http://localhost:$Port"
foreach ($ip in $ips) { Write-Host "  On your phone: http://${ip}:$Port" }
Write-Host ""
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch {
    break
  }

  $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  if ($path -eq '/') { $path = '/index.html' }

  $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')

  # never serve anything outside the project folder
  $full = [System.IO.Path]::GetFullPath($file)
  if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }

  if (Test-Path $full -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $ctype = $types[$ext]
    if (-not $ctype) { $ctype = 'application/octet-stream' }

    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ctx.Response.ContentType = $ctype
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes('Not found: ' + $path)
    $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
  }

  $ctx.Response.Close()
}

$listener.Stop()

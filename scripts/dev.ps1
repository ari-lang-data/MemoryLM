$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Import-DotEnv($path) {
    $vars = @{}
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
            $parts = $_ -split '=', 2
            if ($parts.Count -eq 2) { $vars[$parts[0].Trim()] = $parts[1].Trim() }
        }
    }
    return $vars
}

$envVars = Import-DotEnv "$Root\backend\.env"
$hostAddr = if ($envVars["TS_HOST"]) { $envVars["TS_HOST"] } else { "127.0.0.1" }
$port = if ($envVars["PORT"]) { $envVars["PORT"] } else { "8000" }

$backendArgs = @("backend.main:app", "--host", $hostAddr, "--port", $port, "--reload")
if ($envVars["TS_CERT_KEY"] -and $envVars["TS_CERT_CRT"]) {
    $backendArgs += @("--ssl-keyfile", $envVars["TS_CERT_KEY"], "--ssl-certfile", $envVars["TS_CERT_CRT"])
    $scheme = "https"
} else {
    $scheme = "http"
}

$backendProc  = $null
$frontendProc = $null

function Stop-All {
    Write-Host "`nShutting down..."
    if ($backendProc  -and -not $backendProc.HasExited)  { Stop-Process -Id $backendProc.Id  -Force -ErrorAction SilentlyContinue }
    if ($frontendProc -and -not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
}

trap {
    Stop-All
    break
}

try {
    $backendProc = Start-Process -FilePath "$Root\backend\.venv\Scripts\uvicorn.exe" -ArgumentList $backendArgs `
        -WorkingDirectory "$Root\backend" -NoNewWindow -PassThru

    $frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") `
        -WorkingDirectory "$Root\frontend" -NoNewWindow -PassThru

    Write-Host ""
    Write-Host "Backend  (PID $($backendProc.Id))  -> $scheme`://$hostAddr`:$port"
    Write-Host "Frontend (PID $($frontendProc.Id)) -> see the Vite output above for the exact URL"
    Write-Host "Ctrl+C to stop both."
    Write-Host ""

    Wait-Process -Id $backendProc.Id, $frontendProc.Id
}
finally {
    Stop-All
}
#Requires -Version 5.1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Root = (Resolve-Path (Join-Path $ScriptDir "..")).Path

$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

$BackendPython = Join-Path $Backend ".venv\Scripts\python.exe"
$BackendEnv = Join-Path $Backend ".env"

$BackendProcess = $null
$FrontendProcess = $null

# ── Cleanup ────────────────────────────────────────────────────────

function Stop-Processes {
    Write-Host ""
    Write-Host "Shutting down..."

    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

try {
    # ── Backend ────────────────────────────────────────────────────

    if (-not (Test-Path $BackendPython)) {
        throw "Backend virtual environment not found. Run .\scripts\install.ps1 first."
    }

    if (-not (Test-Path $BackendEnv)) {
        throw "backend\.env not found. Run .\scripts\install.ps1 first."
    }

    # Load .env into the current PowerShell process.
    Get-Content $BackendEnv |
        Where-Object {
            $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' -and
            $_ -notmatch '^\s*#'
        } |
        ForEach-Object {
            $key, $value = $_ -split '=', 2
            $key = $key.Trim()
            $value = $value.Trim()

            # Remove matching surrounding quotes.
            if (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            ) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }

    $HostAddress = if ($env:TS_HOST) {
        $env:TS_HOST
    } else {
        "127.0.0.1"
    }

    $Port = if ($env:PORT) {
        $env:PORT
    } else {
        "8000"
    }

    $UvicornArgs = @(
        "-m", "uvicorn",
        "backend.main:app",
        "--host", $HostAddress,
        "--port", $Port,
        "--reload"
    )

    $UseSSL = (
        -not [string]::IsNullOrWhiteSpace($env:TS_CERT_KEY) -and
        -not [string]::IsNullOrWhiteSpace($env:TS_CERT_CRT)
    )

    if ($UseSSL) {
        $UvicornArgs += @(
            "--ssl-keyfile", $env:TS_CERT_KEY,
            "--ssl-certfile", $env:TS_CERT_CRT
        )
    }

    $BackendProtocol = if ($UseSSL) { "https" } else { "http" }

    Write-Host "Starting backend..."

    $BackendProcess = Start-Process `
        -FilePath $BackendPython `
        -ArgumentList $UvicornArgs `
        -WorkingDirectory $Backend `
        -PassThru

    # ── Frontend ───────────────────────────────────────────────────

    Write-Host "Starting frontend..."

    $FrontendProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList "run", "dev" `
        -WorkingDirectory $Frontend `
        -PassThru

    Write-Host ""
    Write-Host "Backend  (PID $($BackendProcess.Id)) → $BackendProtocol://$HostAddress`:$Port"
    Write-Host "Frontend (PID $($FrontendProcess.Id)) → see Vite output for the exact URL"
    Write-Host "Ctrl+C to stop both."
    Write-Host ""

    # Keep this script alive while both processes are running.
    while (
        -not $BackendProcess.HasExited -and
        -not $FrontendProcess.HasExited
    ) {
        Start-Sleep -Milliseconds 500
    }

    # If one process exits unexpectedly, stop the other.
    if ($BackendProcess.HasExited) {
        Write-Host "Backend process exited."
    }

    if ($FrontendProcess.HasExited) {
        Write-Host "Frontend process exited."
    }
}
finally {
    Stop-Processes
}
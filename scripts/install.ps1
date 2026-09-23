#Requires -Version 5.1

$ErrorActionPreference = "Stop"

# ── Paths ──────────────────────────────────────────────────────────

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Root = (Resolve-Path (Join-Path $ScriptDir "..")).Path

$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "          MemoryLM Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Helpers ────────────────────────────────────────────────────────

function Test-Command {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Id,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Command "winget")) {
        Write-Host ""
        Write-Host "winget is not available." -ForegroundColor Red
        Write-Host "Please install $Name manually and run this installer again."
        exit 1
    }

    Write-Host ""
    Write-Host "$Name is not installed." -ForegroundColor Yellow
    $answer = Read-Host "Install $Name using winget? [Y/n]"

    if ($answer -and $answer -notmatch "^(y|yes)$") {
        Write-Host ""
        Write-Host "Please install $Name manually and re-run this installer." -ForegroundColor Red
        exit 1
    }

    Write-Host "Installing $Name..."
    winget install --id $Id --exact --accept-package-agreements --accept-source-agreements

    if ($LASTEXITCODE -ne 0) {
        throw "winget failed to install $Name."
    }

    Write-Host "$Name installed." -ForegroundColor Green
}

function Refresh-Path {
    # winget-installed programs may not appear in the current process PATH.
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

    $env:Path = "$machinePath;$userPath"
}

# ── Python ─────────────────────────────────────────────────────────

Write-Host "[1/4] Checking Python..." -ForegroundColor Cyan

$PythonCommand = $null

if (Test-Command "python") {
    try {
        $PythonVersion = & python --version 2>&1

        if ($PythonVersion -match "Python 3") {
            $PythonCommand = "python"
        }
    }
    catch {
        # Continue checking other possibilities.
    }
}

if (-not $PythonCommand -and (Test-Command "py")) {
    try {
        $PythonVersion = & py -3 --version 2>&1

        if ($PythonVersion -match "Python 3") {
            $PythonCommand = "py"
        }
    }
    catch {
        # Continue to installation.
    }
}

if (-not $PythonCommand) {
    Install-WingetPackage `
        -Id "Python.Python.3" `
        -Name "Python 3"

    Refresh-Path

    if (Test-Command "python") {
        $PythonCommand = "python"
    }
    elseif (Test-Command "py") {
        $PythonCommand = "py"
    }
    else {
        throw "Python was installed, but could not be found in PATH. Restart PowerShell and run this installer again."
    }
}

if ($PythonCommand -eq "py") {
    $PythonArgs = @("-3")
}
else {
    $PythonArgs = @()
}

Write-Host "Using Python:" -NoNewline
if ($PythonCommand -eq "py") {
    & py -3 --version
}
else {
    & python --version
}

# ── Backend ────────────────────────────────────────────────────────

Write-Host ""
Write-Host "[2/4] Setting up backend..." -ForegroundColor Cyan

if (-not (Test-Path $Backend)) {
    throw "Backend directory not found: $Backend"
}

Set-Location $Backend

$Venv = Join-Path $Backend ".venv"

if (-not (Test-Path $Venv)) {
    Write-Host "Creating Python virtual environment..."

    if ($PythonCommand -eq "py") {
        & py -3 -m venv ".venv"
    }
    else {
        & python -m venv ".venv"
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the Python virtual environment."
    }
}
else {
    Write-Host "Existing virtual environment found."
}

$VenvPython = Join-Path $Venv "Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    throw "Virtual environment was created, but its Python executable could not be found."
}

Write-Host "Updating pip..."
& $VenvPython -m pip install --upgrade pip

if ($LASTEXITCODE -ne 0) {
    throw "Failed to upgrade pip."
}

$Requirements = Join-Path $Backend "requirements.txt"

if (Test-Path $Requirements) {
    Write-Host "Installing Python dependencies..."
    & $VenvPython -m pip install -r $Requirements

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Python dependencies."
    }
}
else {
    Write-Host "No requirements.txt found; skipping Python dependencies." -ForegroundColor Yellow
}

$BackendEnv = Join-Path $Backend ".env"
$BackendEnvExample = Join-Path $Backend ".env.example"

if (-not (Test-Path $BackendEnv)) {
    if (Test-Path $BackendEnvExample) {
        Copy-Item $BackendEnvExample $BackendEnv

        Write-Host "Created backend\.env." -ForegroundColor Green
        Write-Host "Defaults to plain localhost; no further setup needed unless you're adding remote access."
    }
    else {
        Write-Host "backend\.env.example not found; skipping .env creation." -ForegroundColor Yellow
    }
}

# ── Node / frontend ───────────────────────────────────────────────

Write-Host ""
Write-Host "[3/4] Checking Node.js..." -ForegroundColor Cyan

if (-not (Test-Command "node")) {
    Install-WingetPackage `
        -Id "OpenJS.NodeJS.LTS" `
        -Name "Node.js LTS"

    Refresh-Path
}

if (-not (Test-Command "node")) {
    throw "Node.js was installed, but could not be found in PATH. Restart PowerShell and run this installer again."
}

if (-not (Test-Command "npm")) {
    throw "npm was not found. Your Node.js installation may be incomplete."
}

Write-Host "Node:"
& node --version

Write-Host "npm:"
& npm --version

if (-not (Test-Path $Frontend)) {
    throw "Frontend directory not found: $Frontend"
}

Set-Location $Frontend

Write-Host ""
Write-Host "Installing frontend dependencies..."
npm install

if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
}

$FrontendEnv = Join-Path $Frontend ".env"
$FrontendEnvExample = Join-Path $Frontend ".env.example"

if (-not (Test-Path $FrontendEnv)) {
    if (Test-Path $FrontendEnvExample) {
        Copy-Item $FrontendEnvExample $FrontendEnv

        Write-Host "Created frontend\.env." -ForegroundColor Green
        Write-Host "Defaults are suitable for a plain local run."
    }
    else {
        Write-Host "frontend\.env.example not found; skipping .env creation." -ForegroundColor Yellow
    }
}

# ── Complete ───────────────────────────────────────────────────────

Write-Host ""
Write-Host "[4/4] Installation complete." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "              MemoryLM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run the development servers with:"
Write-Host ""
Write-Host "    .\scripts\dev.ps1" -ForegroundColor White
Write-Host ""
<#
.SYNOPSIS
    Adds (or removes) Microsoft Defender exclusions for this repo's dev loop.

.DESCRIPTION
    Defender's real-time scanner inspects every file a bundler touches. Next.js
    dev writes thousands of small chunks into `.next` on each compile, and npm
    rewrites `node_modules` on every install, so each write pays a scan. The
    bundled Next.js guide (node_modules/next/dist/docs/01-app/02-guides/
    local-development.md) lists excluding those directories as its first
    Windows-specific recommendation.

    TRADE-OFF, read before running: an excluded path is no longer scanned in
    real time. `node_modules` is precisely where a malicious postinstall script
    would land, so this trades some protection for compile speed. It is a
    reasonable trade on a machine you control for a repo you trust; it is not a
    good default for a shared or untrusted machine. Re-run with -Remove to undo.

.PARAMETER Remove
    Removes the exclusions this script adds instead of adding them.

.EXAMPLE
    # From an elevated PowerShell prompt, at the repo root:
    powershell -ExecutionPolicy Bypass -File .\scripts\dev-defender-exclusions.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\dev-defender-exclusions.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error @'
This script must run elevated, because Defender exclusions are a machine-wide setting.

Open PowerShell as Administrator, then from the repo root run:
  powershell -ExecutionPolicy Bypass -File .\scripts\dev-defender-exclusions.ps1
'@
    exit 1
}

if (-not (Get-Command Get-MpPreference -ErrorAction SilentlyContinue)) {
    Write-Error 'The Defender PowerShell module is unavailable. Nothing to do (another AV product may be managing this machine).'
    exit 1
}

# Resolve the repo root from this script's location so the paths stay correct if
# the checkout moves. `.next` and `node_modules` both live under it.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$npmCache = (& npm config get cache).Trim()

$pathExclusions = @($repoRoot)
if ($npmCache -and (Test-Path $npmCache)) {
    $pathExclusions += $npmCache
}

# Turbopack, the dev server, and every npm lifecycle script run as node.exe.
$processExclusions = @('node.exe')

if ($Remove) {
    foreach ($path in $pathExclusions) {
        Remove-MpPreference -ExclusionPath $path
        Write-Host "removed path exclusion: $path"
    }
    foreach ($proc in $processExclusions) {
        Remove-MpPreference -ExclusionProcess $proc
        Write-Host "removed process exclusion: $proc"
    }
    Write-Host ''
    Write-Host 'Defender exclusions removed. Real-time scanning covers these paths again.'
    exit 0
}

foreach ($path in $pathExclusions) {
    Add-MpPreference -ExclusionPath $path
    Write-Host "added path exclusion: $path"
}
foreach ($proc in $processExclusions) {
    Add-MpPreference -ExclusionProcess $proc
    Write-Host "added process exclusion: $proc"
}

Write-Host ''
Write-Host 'Current exclusions:'
$prefs = Get-MpPreference
Write-Host ('  paths:     ' + (($prefs.ExclusionPath | Sort-Object) -join '; '))
Write-Host ('  processes: ' + (($prefs.ExclusionProcess | Sort-Object) -join '; '))
Write-Host ''
Write-Host 'Restart `npm run dev:app` to pick up the change.'
Write-Host 'Undo with: .\scripts\dev-defender-exclusions.ps1 -Remove'

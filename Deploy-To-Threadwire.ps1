# Deploy-To-Threadwire.ps1
# ----------------------------------------------------------------------------
# Uploads the contents of "D:\Documents\Claude\Projects\AI UI Ideas\" to
# https://github.com/amphisocial/Threadwire on branch Threadwire-AI-Test.
#
# What it does:
#   1. Clones the Threadwire repo into a temp folder.
#   2. Checks out the existing branch Threadwire-AI-Test.
#   3. Copies the AI UI Ideas project tree into the clone, excluding:
#        - Word lock files (~$*.docx)
#        - Any nested .git directories (so the inner mendix-ai-interaction-
#          framework repo's history is NOT carried in as a submodule)
#        - *.tmp scratch files
#   4. Stages, commits, and pushes.
#
# Usage:
#   .\Deploy-To-Threadwire.ps1                   # additive: branch files preserved unless overwritten
#   .\Deploy-To-Threadwire.ps1 -Replace          # wipe branch working tree (keeping .git, .github) first
#   .\Deploy-To-Threadwire.ps1 -DryRun           # stage + show what WOULD push, but skip the push
#
# Prerequisites:
#   - git on PATH (`git --version` works).
#   - You have push access to amphisocial/Threadwire. If HTTPS prompts for
#     credentials, your Windows Credential Manager / Git Credential Manager
#     will pop up for the token. Personal access token must include `repo`.
# ----------------------------------------------------------------------------

[CmdletBinding()]
param(
  [switch] $Replace,
  [switch] $DryRun,
  [string] $Source   = "D:\Documents\Claude\Projects\AI UI Ideas",
  [string] $RepoUrl  = "https://github.com/amphisocial/Threadwire.git",
  [string] $Branch   = "Threadwire-AI-Test",
  [string] $WorkRoot = (Join-Path $env:TEMP "threadwire-deploy"),
  [string] $CommitMessage = "Deploy AI UI Ideas project snapshot"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host " Threadwire deploy" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor DarkCyan
Write-Host (" Source : {0}" -f $Source)
Write-Host (" Repo   : {0}" -f $RepoUrl)
Write-Host (" Branch : {0}" -f $Branch)
$mode = if ($Replace) { "REPLACE  (wipe branch working tree first)" } else { "additive (preserve existing branch files)" }
if ($DryRun) { $mode += "  +  DRY RUN (no push)" }
Write-Host (" Mode   : {0}" -f $mode)
Write-Host ""

# --- 0. sanity ----------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source folder not found: $Source"
}
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { throw "git is not on PATH. Install Git for Windows from https://git-scm.com/download/win" }

# --- 1. clone -----------------------------------------------------------------
Write-Step "1/5  Cloning $RepoUrl ($Branch)"
if (Test-Path -LiteralPath $WorkRoot) { Remove-Item -LiteralPath $WorkRoot -Recurse -Force }
New-Item -ItemType Directory -Path $WorkRoot | Out-Null
$ClonePath = Join-Path $WorkRoot "Threadwire"

& git clone --branch $Branch --single-branch $RepoUrl $ClonePath
if ($LASTEXITCODE -ne 0) {
  throw "git clone failed. Check that the branch '$Branch' exists and that you have access."
}

Push-Location $ClonePath
try {

  # --- 2. (optional) wipe working tree --------------------------------------
  if ($Replace) {
    Write-Step "2/5  Replace mode -- removing existing branch files (keeping .git and .github)"
    Get-ChildItem -Force | Where-Object {
      $_.Name -notin @('.git', '.github')
    } | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
  } else {
    Write-Step "2/5  Additive mode -- existing branch files preserved unless overwritten by source"
  }

  # --- 3. copy in ------------------------------------------------------------
  Write-Step "3/5  Copying $Source -> $ClonePath"
  $rcArgs = @(
    "`"$Source`"", "`"$ClonePath`"",
    "/E",                              # recurse including empty subdirs
    "/XD", ".git",                     # exclude any nested .git directories
    "/XF", "~`$*", "*.tmp",            # exclude Word lock files and tmp scratch
    "/R:1", "/W:1",                    # 1 retry, 1s wait
    "/NFL", "/NDL", "/NJH", "/NJS",    # less noise
    "/NP"
  )
  $rcCmd = "robocopy " + ($rcArgs -join " ")
  Write-Host "    $rcCmd"
  $null = & cmd /c $rcCmd
  $rc = $LASTEXITCODE
  # Robocopy: 0=no change, 1=files copied, 2=extras, 3=copied+extras. 8+ is failure.
  if ($rc -ge 8) {
    throw "robocopy failed with exit code $rc"
  } else {
    Write-Host "    robocopy exit=$rc (0=no change, 1=copied, 3=copied+extras; <8 is OK)"
  }

  # --- 4. stage + commit -----------------------------------------------------
  Write-Step "4/5  Staging changes"
  & git add -A
  $porcelain = & git status --porcelain
  if (-not $porcelain) {
    Write-Host "    Nothing to commit -- branch already matches source." -ForegroundColor Yellow
    return
  }
  Write-Host ""
  Write-Host "    Pending changes:" -ForegroundColor White
  & git status --short | ForEach-Object { Write-Host ("      " + $_) }
  Write-Host ""
  Write-Host ("    Commit message: " + $CommitMessage) -ForegroundColor White
  & git commit -m $CommitMessage | Out-Null

  # --- 5. push ---------------------------------------------------------------
  if ($DryRun) {
    Write-Step "5/5  DRY RUN -- skipping push"
    Write-Host "    Clone left at: $ClonePath" -ForegroundColor Yellow
    Write-Host "    Inspect, then push manually with:" -ForegroundColor Yellow
    Write-Host ("      cd `"$ClonePath`"") -ForegroundColor Yellow
    Write-Host ("      git push origin $Branch") -ForegroundColor Yellow
  } else {
    Write-Step "5/5  Pushing to origin/$Branch"
    & git push origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    Write-Host ""
    Write-Host "Deploy succeeded." -ForegroundColor Green
    Write-Host ("View at: https://github.com/amphisocial/Threadwire/tree/{0}" -f $Branch) -ForegroundColor Green
  }
}
finally {
  Pop-Location
}

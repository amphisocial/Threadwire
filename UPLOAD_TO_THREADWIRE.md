# Upload AI UI Ideas → amphisocial/Threadwire (branch `Threadwire-AI-Test`)

This folder contains a one-shot deploy script that uploads the entire `AI UI Ideas` project to the existing `Threadwire-AI-Test` branch of `https://github.com/amphisocial/Threadwire`.

## Prerequisites

1. Git for Windows installed (`git --version` returns a version).
2. Push access to `amphisocial/Threadwire`. When you run the script, Windows Credential Manager / Git Credential Manager will prompt for your GitHub credentials the first time. If you use a personal access token, it must include the `repo` scope.

## Run the deploy

Open PowerShell (regular, not admin), then:

```powershell
cd "D:\Documents\Claude\Projects\AI UI Ideas"

# Recommended: dry run first to see exactly what will be committed
.\Deploy-To-Threadwire.ps1 -DryRun

# Real deploy (additive — preserves existing files on the branch unless overwritten by same-named files in this folder)
.\Deploy-To-Threadwire.ps1

# OR: replace mode — wipe the branch's working tree first, then upload (keeps .git and .github)
.\Deploy-To-Threadwire.ps1 -Replace
```

If PowerShell blocks the script with an execution-policy error, either run it once via:

```powershell
powershell -ExecutionPolicy Bypass -File .\Deploy-To-Threadwire.ps1
```

…or relax the policy for your user account once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## What gets uploaded

Everything under `D:\Documents\Claude\Projects\AI UI Ideas\` **except**:

- `~$*.docx` — Word lock files (open-in-Word artifacts).
- Any nested `.git/` directory — specifically, the inner `mendix-ai-interaction-framework\.git` is excluded so the inner repo's history is not pulled in as a submodule. The inner repo's working files (READMEs, primitive templates, etc.) are still uploaded as plain files.
- `*.tmp` scratch files.

That covers all the project deliverables:

- `AI_Interaction_Apps_AD_Portfolio.docx` (and v2, v3) — Aerospace & Defense portfolio.
- `AI_Interaction_Apps_Nuclear_Portfolio.docx` — Nuclear / fusion portfolio.
- `AI_Interaction_Framework_Technical_Design.docx` — Mendix technical design.
- `Document_Extract_Primitive_Design.docx` — Primitive design doc.
- `ENG-06_*` — ECO Impact Analyzer (design + HTML mockup).
- `SCM-05_*` — Pegging Explorer (design + HTML mockup).
- `mendix-ai-interaction-framework/` — README, LICENSE, CHANGELOG, CONTRIBUTING, and the prompt-template registry under `primitives/templates/`.
- `mendix-ai-interaction-framework.bundle` — portable git bundle of the inner repo.
- `primitives/templates/` — top-level mirror of the template registry.

## Modes

| Flag | Behavior |
| --- | --- |
| (none) | **Additive.** Files on the branch that aren't replaced by same-named files in this folder are kept. |
| `-Replace` | Wipes the branch's working tree (keeping `.git` and `.github`), then uploads. Use only if you want the branch to look exactly like this folder. |
| `-DryRun` | Stages and commits to a temp clone but **does not** push. Inspect the temp clone, then push manually if it looks right. |

## After it pushes

It prints the URL to view the result:

```
https://github.com/amphisocial/Threadwire/tree/Threadwire-AI-Test
```

If anything goes wrong, the temp clone is left at `%TEMP%\threadwire-deploy\Threadwire` so you can inspect or fix and push by hand.

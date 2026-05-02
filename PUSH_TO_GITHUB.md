# Push this repo to GitHub

The repository is already initialized as a git repo with nine clean commits across two tags (`v0.1.0-wave1` and `v0.2.0-wave2-preview`). You just need to attach a GitHub remote and push.

## Recommended repo name

`mendix-ai-interaction-framework`

(Short, descriptive, matches the README. Public or private \u2014 your call. Private is appropriate while Wave 1 is in pre-release; flip to public when you publish to the Marketplace.)

## Option A \u2014 GitHub CLI (one command)

If you have the GitHub CLI installed and authenticated (`gh auth status` shows logged in):

```powershell
cd "D:\Documents\Claude\Projects\AI UI Ideas\mendix-ai-interaction-framework"
gh repo create mendix-ai-interaction-framework --private --source=. --remote=origin --push
git push origin --tags
```

This creates the repo on GitHub under your account, pushes `main`, and pushes both tags. Switch `--private` to `--public` if you want it public.

## Option B \u2014 Plain git (after you create the repo on github.com manually)

1. Go to https://github.com/new and create an empty repo named `mendix-ai-interaction-framework`. **Do not** initialize it with a README, .gitignore, or LICENSE \u2014 those are already in this repo and any pre-init would conflict.
2. From PowerShell:

   ```powershell
   cd "D:\Documents\Claude\Projects\AI UI Ideas\mendix-ai-interaction-framework"
   git remote add origin https://github.com/<your-username>/mendix-ai-interaction-framework.git
   git push -u origin main
   git push origin v0.1.0-wave1
   ```

   Replace `<your-username>` with your GitHub username (or org name).

## Option C \u2014 SSH

If you authenticate with SSH:

```powershell
git remote add origin git@github.com:<your-username>/mendix-ai-interaction-framework.git
git push -u origin main
git push origin v0.1.0-wave1
```

## What's in the initial push

```
9218bb6  chore: initialize repo with README, LICENSE, and contributor guide
d1a2714  feat(framework): add PromptTemplate entity model and library README
25d8c13  feat(scm-02): RFQ / SOW intake extractor template v1.0.0
d2cc56c  feat(eng-01): customer-spec requirements extractor template v1.0.0
71a55a8  feat(mfg-01): work-instruction source extractor template v1.0.0   (tag: v0.1.0-wave1)
2020008  docs: scope README for Wave 1/2/3, add CHANGELOG
43fd91c  feat(scm-05): PCN/EOL/LTB extractor template v1.0.0
93d2362  feat(scm-05): Pegging Copilot stub v0.1.0-stub
3c57152  feat(scm-05): Pegging Risk Scorer stub v0.1.0-stub               (tag: v0.2.0-wave2-preview)
28b4e39  docs: add ENG-06 to scope tables and CHANGELOG
172be2e  feat(eng-06): ECO extractor template v1.0.0
ac06016  feat(eng-06): Impact Copilot stub v0.1.0-stub
2553049  feat(eng-06): Impact Scorer stub v0.1.0-stub                     (tag: v0.3.0-wave2-preview)
```

13 commits, 3 tags, branch `main`. After pushing `main`, push all tags with `git push origin --tags`.

## After the first push

Recommended on the GitHub side:

- **Branch protection** on `main`: require PR review, require status checks to pass, restrict who can push directly.
- **CODEOWNERS file** if more contributors join \u2014 designate Template Owners as required reviewers for any change under `primitives/templates/`.
- **GitHub Actions** for JSON validity + few-shot example schema validation on every PR (small CI script can mirror the verification I ran locally).
- **Release** on the tag: cut a GitHub Release from `v0.1.0-wave1` so consumers get a stable artifact pointer.

## Backup: portable bundle

A git bundle (`mendix-ai-interaction-framework.bundle`) is provided alongside the repo folder. If you ever need to re-clone or hand the repo to someone offline:

```powershell
git clone "D:\Documents\Claude\Projects\AI UI Ideas\mendix-ai-interaction-framework.bundle" mendix-ai-interaction-framework
```

This recovers the full history and tag without any network access.

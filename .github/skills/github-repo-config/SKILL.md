---
name: github-repo-config
description: 'Update GitHub repository configuration safely. Use when changing repository settings, branch protection, rulesets, Actions settings, labels, templates, CODEOWNERS, Dependabot, release configuration, or other .github files; inspect the current state, apply the smallest requested change, and verify the result.'
argument-hint: 'Describe the GitHub repository configuration to update and the desired final state.'
user-invocable: true
---

# GitHub Repository Configuration

## What This Skill Produces

A verified, minimal update to GitHub repository configuration, with a concise record of what changed, what was checked, and any access or platform limitations.

## Scope

Use this skill for either of these configuration surfaces:

- **Repository files:** `.github/` workflows, issue and pull request templates, `CODEOWNERS`, Dependabot configuration, release configuration, and related checked-in metadata.
- **GitHub settings:** repository visibility, features, merge settings, Actions permissions, environments, branch protection, rulesets, labels, collaborators, webhooks, and similar settings managed through GitHub tooling or APIs.

Do not guess undocumented repository settings or silently broaden a request. If the target is unclear, identify the likely surface and ask for the missing repository, branch, environment, or desired end state.

## Procedure

1. **Parse the requested end state.**
   - Extract the repository owner/name, target branch or environment, setting to change, desired value, and any constraints.
   - Distinguish a checked-in file change from a GitHub-hosted setting.
   - Treat requests that could remove access, delete configuration, change visibility, or weaken protection as high impact and require explicit confirmation before applying them.

2. **Inspect the current state.**
   - Check repository status and locate relevant `.github` files without overwriting unrelated user changes.
   - For hosted settings, inspect the current value and effective scope using the available GitHub integration, `gh`, or the documented API.
   - Check authentication, repository permissions, and whether organization-level policy may override the repository setting.
   - Record the smallest set of facts needed to choose the correct update path.

3. **Choose the narrowest update path.**
   - Edit a checked-in file when the configuration is version-controlled and the request concerns file content.
   - Use the GitHub integration, `gh`, or API only for hosted settings that cannot be represented by repository files.
   - Preserve existing formatting, unrelated settings, local changes, and public interfaces.
   - Prefer idempotent operations so rerunning the procedure produces the same result.

4. **Apply the change.**
   - Make the smallest edit or API mutation that reaches the requested end state.
   - Do not commit, push, merge, delete, change visibility, remove protections, or alter access unless explicitly requested.
   - For branch protection, rulesets, Actions permissions, environments, collaborators, or webhooks, confirm the target scope before mutation.
   - If the requested mutation is unavailable or blocked by permissions, report the exact blocker and provide the safest actionable alternative.

5. **Validate the result.**
   - For file changes, validate syntax and repository-specific checks; inspect the final diff for scope and accidental changes.
   - For hosted settings, read the setting back and verify the effective value, target, and relevant restrictions.
   - For workflows, validate YAML and check referenced actions, permissions, secrets, environments, and branch filters where practical.
   - Confirm that no unrelated working-tree changes were modified.

6. **Report completion.**
   - State the repository and configuration surface updated.
   - Summarize the exact final state and validation performed.
   - Call out skipped checks, permission limitations, organization policy, or follow-up actions.
   - Never claim a remote setting changed unless a read-back or successful API response confirms it.

## Decision Points

- **File or hosted setting?** Use the version-controlled file for repository-as-code configuration; use GitHub tooling/API for settings stored by GitHub.
- **Repository or organization policy?** If a repository value is inherited or locked by organization policy, do not try repeated mutations; report the governing scope.
- **Safe or high impact?** Read-only inspection and additive edits can proceed. Destructive, access-affecting, visibility-changing, or protection-weakening changes need explicit confirmation.
- **Target known?** Never apply a branch, environment, label, team, or repository-wide change when the target is ambiguous.
- **Verification available?** Prefer a read-back or focused validation. If verification is unavailable, say so rather than inferring success.

## Completion Checklist

- [ ] Requested repository and target scope are identified.
- [ ] Current configuration was inspected before mutation.
- [ ] Existing user changes were preserved.
- [ ] The smallest appropriate update was applied.
- [ ] High-impact changes had explicit confirmation.
- [ ] Syntax, focused tests, or a remote read-back passed.
- [ ] Final state and limitations were reported accurately.

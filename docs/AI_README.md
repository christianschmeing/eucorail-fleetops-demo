# AI Observable Project State

Maschinenlesbarer Zustands-Snapshot wird auf dem Branch gh-pages unter state/ veröffentlicht.

- Project State (JSON): https://raw.githubusercontent.com/<owner>/<repo>/gh-pages/state/project-state.json
- Badge (Shields endpoint): https://raw.githubusercontent.com/<owner>/<repo>/gh-pages/state/badge.json

Felder in project-state.json:

- repo, branch, commit (sha, message, author, timestamp)
- ci (status: success|failed|skipped, workflow, run_id)
- changes (apps_web, packages_api, scripts, docs)
- issues (p0_open, p1_open, all_open), prs (open)
- data_version (optional, falls STAGING_META_URL konfiguriert)
- release.latest_tag, generated_at

Aktualität: Datei wird bei jedem Push/PR neu generiert; Veröffentlichung auf gh-pages/state/ bei Push auf Default-Branch.

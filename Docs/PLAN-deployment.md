# PLAN-deployment

## Goal
Perform a full commit, deployment, and make the BDQ Social Platform live. We will ensure that the git repository is clean and devoid of any testing-related files.

## Task Breakdown

### 1. File Cleanup & Test File Relocation
- Create a directory `tests_archive` in the root.
- Move all testing files and folders into `tests_archive`. This includes:
  - `e2e/`
  - `test-results/`
  - `playwright.config.ts`
  - `vitest.config.ts`
  - All `*.test.ts` / `*.test.tsx` files located within `src/`
- Ensure the original folder structure within `src/` is maintained inside `tests_archive/src/` to prevent data loss.

### 2. Update .gitignore
- Append `tests_archive/` to `.gitignore`.
- Append `.agents/` to `.gitignore` to avoid committing local AI agent configs.

### 3. Git Initialization & Commit
- Run `git init`.
- Add all files: `git add .`.
- Create the initial commit: `git commit -m "feat: initial clean commit for BDQ Social Platform"`.

### 4. GitHub Repository Creation
- Use GitHub CLI to create the repository:
  `gh repo create "BDQ Social Platform" --public --source=. --remote=origin --push`
- The user has already switched to `devbdqsocial`.

### 5. Deployment
- The project has a `vercel.json`. We will use Vercel for deployment.
- Run `npx vercel deploy --prod --yes` to make the site live.

## Agent Assignments
- `orchestrator` / `project-planner`: Responsible for file moving, git commands, and running the deployment scripts.

## Verification Checklist
- [ ] Test files successfully moved to `tests_archive`.
- [ ] `.gitignore` updated correctly.
- [ ] Git repository initialized and clean of tests.
- [ ] Code pushed successfully to `devbdqsocial`'s GitHub account.
- [ ] Vercel deployment successful and live URL provided.

# GitHub + Git Workflow

## Normal flow

**ASCII Version:**
```
   Issue/Feature
         ↓
  Pull recent main
         ↓
       Create 
  feature/fix/docs
       branch
         ↓
     Implement
(+ tests if needed)
         ↓
   git commit/push
         ↓
   Create Pull Request
         ↓
       Review ←──────────────────────────────────────────────────────────────────────┐
       Process                                                                       │
         ↓                                                                           │
      ┌──────┐                                                                       │
      │  OK? │                                                                       │
      └─┬──┬─┘                                                                       │
    no  │  │  yes                                                                    │
        │  │                                                                         │
        │  └──────────────→ Auto-merge → main                                        │
        │                                                                            │
        │                                                                            │
        │                                                                            │
        │                                                                            │
        │                                                                            │
        └────────────────→ Update                                                    │
                         code/tests                                                  │
                             ↓                                                       │
                       git commit/push ──────────────────────────────────────────────┘
                      (update existing)          (Repeat until [OK?] is 'yes' →)
                            
                
```

**Step-by-step:**
```bash
# 1. Pull recent main
git checkout main
git pull origin main

# 2. Create feature/fix branch
git checkout -b feature/task-name

# 3. Implement changes (+ tests if needed)
# ... make changes ...

# 4. Commit and push
git add -A
git commit -m "feat: add feature description

- Brief description of what was done
- Reference any issues/PRs if applicable"
git push -u origin feature/task-name

# 5. Create pull request on GitHub
# 6. Go through review process
# 7. After approval: Auto-merge to main
# 8. Clean up
git checkout main
git branch -d feature/task-name
git push origin --delete feature/task-name
```

## Common commands

| Action | Command |
|--------|---------|
| Create new branch | `git checkout -b feature/task-name` |
| Create pull request | Push to remote, then create PR on GitHub |
| Update existing PR | make changes → `git add -A` → `git commit -m "update: description"` → `git push` |
| Amend commit message | `git commit --amend` → `git push --force-with-lease` |
| Rebase onto main | `git rebase main` |
| Force push (use carefully) | `git push --force-with-lease` |

## Mistakes & fixes

**Accidentally committed to main instead of feature branch:**
```bash
git reset HEAD~1                    # undo last commit
git checkout -b feature/task-name   # create new branch
git add -A && git commit -m "..."   # re-commit
git push -u origin feature/task-name
```

**Need to update PR after main has changed:**
```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

**Forgot to create branch before working:**
```bash
git checkout -b feature/task-name
git add -A && git commit -m "..."
git push -u origin feature/task-name
```

**Force push to specific PR branch:**
```bash
git push --force-with-lease origin feature/task-name
```

## Keeping Branches Clean

### Always Branch from Main

Never branch from an existing feature branch - always start from main to avoid carrying over unwanted commits:

```bash
# CORRECT - starts fresh from main
git checkout main
git pull origin main
git checkout -b feature/issue-description

# WRONG - inherits commits from old branch
git checkout feature/old-branch
git checkout -b new-branch  # carries over old commits
```

### Syncing with Remote

```bash
# Fetch latest and prune deleted branches
git fetch --all --prune

# View current remote branches
git branch -r

# Clean stale local tracking branches
git remote prune origin
```

### Handling Uncommitted Work

If you have work in progress that needs to be moved to a new branch:

```bash
# 1. Commit the work first
git add .
git commit -m "WIP: work description"

# 2. Update main to latest
git checkout main
git pull origin main

# 3. Create new clean branch from main
git checkout -b feature/issue-description

# 4. Cherry-pick only needed commit(s)
git cherry-pick <commit-hash>

# 5. Push new branch
git push -u origin feature/issue-description
```

### One Issue = One Branch = One PR

- Each GitHub issue should have its own branch
- Each branch should only contain changes for that specific issue
- Never mix multiple issues in one branch

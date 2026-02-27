# Reviewing a Pull Request Locally

## Quick reference

```bash
# 1. Pull the PR branch locally
git fetch origin
git checkout -b pr-branch-name origin/pr-branch-name

# 2. Review the changes
# Open files in IDE, check functionality

# 3. Clean up when done
git checkout main
git branch -D pr-branch-name
```

## Detailed review process

**1. Fetch and checkout PR branch:**
```bash
git fetch origin
git checkout -b feature/task-name origin/feature/task-name
```

**2. Review the code:**
- Open the files in your IDE
- Check for code quality and style consistency
- Look for potential bugs or security issues
- Verify the changes match the PR description
- Navigate through the affected areas

**3. Test functionality:**
- Start development server if needed (`docker compose up --build`)
- Navigate to affected areas in the application
- Test edge cases
- Verify no obvious regressions

**4. Leave review comments:**
- Use GitHub's review interface
- Be specific about issues found
- Suggest improvements
- Approve when ready

**5. Clean up:**
```bash
git checkout main
git branch -D feature/task-name
```

## Review checklist

- [ ] Code follows project conventions
- [ ] Changes are well-documented
- [ ] No sensitive information exposed
- [ ] Functionality works as expected
- [ ] No obvious breaking changes
- [ ] Code is readable and maintainable
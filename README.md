# GoatMouth UI Deployment Guide

Use these steps to apply local changes from this repository to your GitHub project.

## 1) Verify your worktree
```bash
git status
```
Ensure all intended files are staged or ready to stage.

## 2) Stage and commit changes
```bash
git add <files>
git commit -m "Your commit message"
```
Replace `<files>` with `.` to stage everything. This repository currently uses the `work` branch; stay on it unless you explicitly create a new branch.

## 3) Add your GitHub remote (if missing)
```bash
git remote add origin git@github.com:<your-user>/<your-repo>.git
```
Use your repository URL and confirm with `git remote -v`.

## 4) Push to GitHub
```bash
git push -u origin work
```
If you use a different branch name, substitute it above.

## 5) Open a Pull Request
After pushing, open a PR on GitHub from `work` (or your branch) into your default branch (often `main`). Include a clear summary of the UI updates and any testing performed.

## 6) Sync future changes
When new commits land on the remote branch, pull them locally to stay current:
```bash
git pull
```

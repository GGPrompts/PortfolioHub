# PortfolioHub - Human's Guide 👨‍💻

*The practical, no-nonsense guide for actually using this thing*

## 🎯 Quick Reference (Because who reads docs?)

### Start Everything
```powershell
.\scripts\start-all-tabbed.ps1
```
Then go to http://localhost:5173

### Kill Everything
```powershell
.\scripts\kill-all-servers.ps1
```

### 💡 PowerShell Command Reference
**Windows users**: Use `;` instead of `&&` for command chaining:
```powershell
# ✅ PowerShell (Windows)
cd projects/ggprompts; git add .; git commit -m "updates"; git push; cd ../..

# ❌ Bash (Linux/Mac) - Won't work in PowerShell
cd projects/ggprompts && git add . && git commit -m "updates" && git push && cd ../..
```

### That's it. You're probably good now. 

---

## 📚 For When Things Get Complicated

### 🔄 Working on Projects Inside the Portfolio

Each project in the `projects/` folder has its own git repo. Here's how to not mess it up:

#### Quick Project Work
```bash
# Jump into a project
cd projects/ggprompts

# Do your thing
git status
git add .
git commit -m "fix: Whatever you fixed"
git push

# Get back to portfolio
cd ../..
```

#### The "I'm Too Lazy to CD" Method
Create these PowerShell aliases in your profile:
```powershell
# Add to your PowerShell profile (run: notepad $PROFILE)
function gg { cd D:\ClaudeWindows\claude-dev-portfolio\projects\ggprompts }
function mc { cd D:\ClaudeWindows\claude-dev-portfolio\projects\matrix-cards }
function sc { cd D:\ClaudeWindows\claude-dev-portfolio\projects\sleak-card }
function gsg { cd D:\ClaudeWindows\claude-dev-portfolio\projects\ggprompts-style-guide }
function port { cd D:\ClaudeWindows\claude-dev-portfolio }
```

Now just type `gg` to jump to GGPrompts, `port` to go back to portfolio, etc.

### 🚀 Adding a New Project

1. **Drop your project in the projects folder**
   ```bash
   cp -r ../my-cool-project ./projects/
   ```

2. **Add it to `projects/manifest.json`**
   ```json
   {
     "id": "my-cool-project",
     "title": "My Cool Project",
     "description": "It does cool stuff",
     "displayType": "external",
     "localPort": 3010,
     "buildCommand": "npm run dev",
     "tech": ["React", "TypeScript"],
     "tags": ["frontend"],
     "status": "active"
   }
   ```

3. **Tell the port manager about it**
   Edit `src/utils/portManager.ts`:
   ```typescript
   export const DEFAULT_PORTS = {
     // ... other ports
     'my-cool-project': 3010
   }
   ```

4. **Start it up and see if it works**

### 🎮 Common Workflows

#### "I changed something in GGPrompts and want to see it"
1. Click the 🔄 Refresh button in the portfolio header
2. That's it. No page reload needed.

#### "I want to work on a project in a new tab"
1. Click "Open in New Tab ↗" button
2. Work on it normally
3. Use the Refresh button in portfolio to see changes

#### "The sidebar is too big/small"
- Click ◀ to collapse to icons
- Click ▶ to normal size  
- Click ▶▶ for detailed view
- Click ◀◀ to go back to normal

#### "I made changes to multiple projects"
```bash
# Quick and dirty update all
cd projects/ggprompts; git add .; git commit -m "updates"; git push; cd ../..
cd projects/matrix-cards; git add .; git commit -m "updates"; git push; cd ../..
# etc...
```

Or use the fancy script (create `scripts/commit-all-projects.ps1`):
```powershell
param(
    [string]$message = "updates"
)

$projects = @("ggprompts", "matrix-cards", "sleak-card", "ggprompts-style-guide")

foreach ($project in $projects) {
    $projectPath = "projects/$project"
    if (Test-Path "$projectPath/.git") {
        Write-Host "Checking $project..." -ForegroundColor Cyan
        Push-Location $projectPath
        
        $status = git status --porcelain
        if ($status) {
            Write-Host "  Changes found! Committing..." -ForegroundColor Yellow
            git add .
            git commit -m $message
            git push
            Write-Host "  ✅ Pushed!" -ForegroundColor Green
        } else {
            Write-Host "  No changes" -ForegroundColor Gray
        }
        
        Pop-Location
    }
}
```

### 🔧 Troubleshooting

#### "My project won't show in the iframe"
Check the browser console. If you see CORS or X-Frame-Options errors:
1. Find the `vite.config.js` (or webpack config)
2. Remove/comment out: `'X-Frame-Options': 'SAMEORIGIN'`
3. Restart the dev server

#### "Port conflicts" 
Just say Y when it asks to use another port, or update the port in:
- Project's config file
- `projects/manifest.json`
- `src/utils/portManager.ts`

#### "I committed to the wrong repo"
```bash
git reset --soft HEAD~1  # Undo last commit, keep changes
# Now you're in the right folder, right? RIGHT?
```

#### "The portfolio is showing old content"
1. Try the Refresh button first
2. Check if the project is actually running: `.\scripts\check-servers.ps1`
3. Hard refresh the portfolio: Ctrl+Shift+R
4. Nuclear option: Kill all servers and start again

### 🎯 VS Code Setup

1. **Open the portfolio folder** - VS Code will detect all git repos
2. **Use the Source Control panel** - It shows all repos with changes
3. **Install these extensions:**
   - GitLens (see who broke what)
   - Git Graph (visualize the mess)
   - PowerShell (for the scripts)

### 📝 Git Workflow Cheat Sheet

```bash
# See what's changed where
git status                    # Current repo
git status --porcelain       # Just the facts

# Update everything
git pull                     # Current repo
git submodule update --remote --merge  # If using submodules (you're not)

# The "I touched everything" commit
git add -A                   # Stage everything
git commit -m "feat: Lots of stuff"
git push

# The "Oops" commands
git stash                    # Hide changes temporarily
git stash pop               # Bring them back
git reset --hard HEAD       # Nuclear option - lose all changes
git clean -fd               # Remove untracked files
```

### 🚨 Don't Do These Things

1. **Don't commit node_modules** - It's in .gitignore for a reason
2. **Don't commit .env files** - Secrets bad
3. **Don't force push to main** - Unless you like angry teammates
4. **Don't commit to portfolio when you mean project** - Check your pwd
5. **Don't forget to push** - Commit without push = work only on your machine

### 💡 Pro Tips

1. **Use multiple terminals** - One for portfolio, one for current project
2. **Set up aliases** - Typing is for suckers
3. **Check which repo** - `git remote -v` before committing
4. **Use the sidebar** - Collapsed mode = more screen space
5. **Refresh button** - Your best friend for iframe updates

### 🎉 That's It!

You now know everything you need to:
- Run the portfolio
- Work on projects
- Not mess up git
- Look like you know what you're doing

Remember: When in doubt, kill all servers and start fresh. It's the developer way.

---

*P.S. - If you're reading this months later and forgot everything, just run `.\scripts\start-all-tabbed.ps1` and click buttons until something works.*
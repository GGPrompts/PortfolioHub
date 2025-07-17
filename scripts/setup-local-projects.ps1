# PowerShell script to set up local project symlinks
# Run as Administrator for symlink creation

Write-Host "Setting up local project links..." -ForegroundColor Green

$portfolioRoot = "D:\ClaudeWindows\Projects\portfolio-showcase\projects"
$projectsRoot = "D:\ClaudeWindows\Projects"

# Create projects directory if it doesn't exist
if (!(Test-Path $portfolioRoot)) {
    New-Item -ItemType Directory -Path $portfolioRoot
}

# Function to create symlink
function Create-ProjectLink {
    param($source, $linkName)
    
    $sourcePath = Join-Path $projectsRoot $source
    $linkPath = Join-Path $portfolioRoot $linkName
    
    if (Test-Path $sourcePath) {
        if (Test-Path $linkPath) {
            Write-Host "Link already exists: $linkName" -ForegroundColor Yellow
        } else {
            New-Item -ItemType SymbolicLink -Path $linkPath -Target $sourcePath
            Write-Host "Created link: $linkName -> $source" -ForegroundColor Green
        }
    } else {
        Write-Host "Source not found: $source" -ForegroundColor Red
    }
}

# Add your projects here
Create-ProjectLink "3d-Matrix-Cards" "3d-matrix-cards"
Create-ProjectLink "matrix-game-hall" "matrix-game-hall"
Create-ProjectLink "MatrixCards" "matrix-cards-original"

Write-Host "`nDone! Now update the manifest.json with your project details." -ForegroundColor Cyan
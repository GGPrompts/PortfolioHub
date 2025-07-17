# PowerShell script to create symbolic links to existing projects
# Run as Administrator!

$portfolioRoot = "D:\ClaudeWindows\Projects\portfolio-showcase\projects"
$projectsRoot = "D:\ClaudeWindows\Projects"

# Create symbolic links to existing projects
New-Item -ItemType SymbolicLink -Path "$portfolioRoot\3d-matrix-cards" -Target "$projectsRoot\3d-Matrix-Cards"
New-Item -ItemType SymbolicLink -Path "$portfolioRoot\particle-sim" -Target "$projectsRoot\particle-sim"
# Add more projects...

Write-Host "Symlinks created! Your portfolio now references your actual project folders."
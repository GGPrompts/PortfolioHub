# PowerShell script to set up git submodules for portfolio

# Initialize git repo if not already
git init

# Add projects as submodules
git submodule add https://github.com/yourusername/3d-matrix-cards.git projects/3d-matrix-cards
git submodule add https://github.com/yourusername/particle-sim.git projects/particle-sim
# Add more projects...

# Update all submodules
git submodule update --init --recursive

Write-Host "Submodules added! To update all projects in the future, run:"
Write-Host "git submodule update --remote --merge"
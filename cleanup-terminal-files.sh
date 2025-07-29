#!/bin/bash

# Quick terminal file cleanup script

echo "Moving terminal files from dev portfolio..."

# Define base paths
PORTFOLIO_SRC="D:/ClaudeWindows/claude-dev-portfolio/src"
ARCHIVE_SRC="D:/ClaudeWindows/claude-dev-portfolio/archive-terminal-integration/src"

# Terminal files to move from CenterArea
TERMINAL_FILES=(
    "components/CenterArea/CompactTerminalSelector.tsx"
    "components/CenterArea/SimpleTerminal.module.css"
    "components/CenterArea/SimpleTerminal.tsx"
    "components/CenterArea/TerminalGrid.tsx"
    "components/CenterArea/TerminalHeader.tsx"
    "components/CenterArea/TerminalSelector.tsx"
    "components/CenterArea/terminalTestHelper.ts"
    "components/TerminalGrid.tsx"
    "components/VSCodeTerminal.css"
    "components/VSCodeTerminal.tsx"
    "hooks/useTerminalSessions.ts"
    "hooks/useTerminalState.ts"
    "services/terminalWebSocketService.ts"
    "store/terminalStore.ts"
    "stores/terminalStore.js"
    "types/terminal.ts"
)

for file in "${TERMINAL_FILES[@]}"; do
    source_path="${PORTFOLIO_SRC}/${file}"
    dest_dir="${ARCHIVE_SRC}/$(dirname "$file")"
    dest_path="${ARCHIVE_SRC}/${file}"
    
    if [ -f "$source_path" ]; then
        mkdir -p "$dest_dir"
        mv "$source_path" "$dest_path"
        echo "Moved: $file"
    fi
done

echo "Terminal file cleanup complete!"

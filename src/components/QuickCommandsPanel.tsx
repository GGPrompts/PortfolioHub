import React, { useState } from 'react';
import SvgIcon from './SvgIcon';
import { copyToClipboard, executeCommand, isVSCodeEnvironment } from '../utils/vsCodeIntegration';
import styles from './QuickCommandsPanel.module.css';

interface Command {
    label: string;
    command: string;
    description: string;
    category: string;
    type: 'vscode' | 'terminal';
}

interface QuickCommandsPanelProps {
    className?: string;
}

export const QuickCommandsPanel: React.FC<QuickCommandsPanelProps> = ({ className = '' }) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['VS Code', 'Development']));
    const [lastCopied, setLastCopied] = useState<string | null>(null);

    const commands: Command[] = [
        // VS Code Commands (executable)
        { label: 'Open Folder', command: 'workbench.action.files.openFolder', description: 'Open a folder in VS Code', category: 'VS Code', type: 'vscode' },
        { label: 'New Terminal', command: 'terminal.new', description: 'Create a new terminal', category: 'VS Code', type: 'vscode' },
        { label: 'Split Terminal', command: 'terminal.split', description: 'Split the terminal', category: 'VS Code', type: 'vscode' },
        { label: 'Reload Window', command: 'workbench.action.reloadWindow', description: 'Reload VS Code window', category: 'VS Code', type: 'vscode' },
        { label: 'Command Palette', command: 'workbench.action.showCommands', description: 'Show command palette (Ctrl+Shift+P)', category: 'VS Code', type: 'vscode' },
        
        // Git Commands (executable)
        { label: 'Git: Status', command: 'git.status', description: 'Show git status', category: 'Git', type: 'vscode' },
        { label: 'Git: Pull', command: 'git.pull', description: 'Pull from remote', category: 'Git', type: 'vscode' },
        { label: 'Git: Push', command: 'git.push', description: 'Push to remote', category: 'Git', type: 'vscode' },
        { label: 'Git: Commit', command: 'git.commit', description: 'Commit changes', category: 'Git', type: 'vscode' },
        { label: 'Git: Add All', command: 'git.stageAll', description: 'Stage all changes', category: 'Git', type: 'vscode' },
        { label: 'Git: Sync', command: 'git.sync', description: 'Sync with remote (pull & push)', category: 'Git', type: 'vscode' },
        
        // Development Commands (use terminal commands instead of non-existent VS Code commands)
        { label: 'Start Dev Server', command: 'npm run dev', description: 'Start development server', category: 'Development', type: 'terminal' },
        { label: 'Build React App', command: 'npm run build', description: 'Build for production', category: 'Development', type: 'terminal' },
        { label: 'Install Dependencies', command: 'npm install', description: 'Install node modules', category: 'Development', type: 'terminal' },
        { label: 'Kill All Servers', command: '.\\\\scripts\\\\kill-all-servers.ps1', description: 'Kill all running dev servers', category: 'Development', type: 'terminal' },
        { label: 'Start All Projects', command: '.\\\\scripts\\\\start-all-tabbed.ps1', description: 'Start all project servers', category: 'Development', type: 'terminal' },
        
        // PowerShell Commands (copy to clipboard)
        { label: 'Navigate to folder', command: 'Set-Location "D:\\\\ClaudeWindows\\\\claude-dev-portfolio"', description: 'Change to portfolio directory', category: 'PowerShell', type: 'terminal' },
        { label: 'List files', command: 'Get-ChildItem', description: 'List directory contents (ls equivalent)', category: 'PowerShell', type: 'terminal' },
        { label: 'List with details', command: 'Get-ChildItem -Force | Format-Table Name, LastWriteTime, Length', description: 'Detailed file listing', category: 'PowerShell', type: 'terminal' },
        { label: 'Create folder', command: 'New-Item -ItemType Directory -Name "new-folder"', description: 'Create new directory', category: 'PowerShell', type: 'terminal' },
        { label: 'Create file', command: 'New-Item -ItemType File -Name "newfile.txt"', description: 'Create new file', category: 'PowerShell', type: 'terminal' },
        { label: 'Delete folder', command: 'Remove-Item -Recurse -Force "folder-name"', description: 'Delete directory recursively', category: 'PowerShell', type: 'terminal' },
        { label: 'Open Explorer', command: 'explorer.exe .', description: 'Open current folder in Windows Explorer', category: 'PowerShell', type: 'terminal' },
        { label: 'Open VS Code', command: 'code .', description: 'Open current folder in VS Code', category: 'PowerShell', type: 'terminal' },
        
        // Git Terminal Commands
        { label: 'Check status', command: 'git status', description: 'Show working tree status', category: 'Git Terminal', type: 'terminal' },
        { label: 'Stage all', command: 'git add .', description: 'Stage all changes', category: 'Git Terminal', type: 'terminal' },
        { label: 'Commit', command: 'git commit -m "message"', description: 'Commit with message', category: 'Git Terminal', type: 'terminal' },
        { label: 'New branch', command: 'git checkout -b feature-branch', description: 'Create and switch branch', category: 'Git Terminal', type: 'terminal' },
        { label: 'Push', command: 'git push origin main', description: 'Push to remote', category: 'Git Terminal', type: 'terminal' },
        
        // npm Terminal Commands  
        { label: 'Install deps', command: 'npm install', description: 'Install dependencies', category: 'npm', type: 'terminal' },
        { label: 'Start dev', command: 'npm run dev', description: 'Start development server', category: 'npm', type: 'terminal' },
        { label: 'Start portfolio', command: 'npm run dev', description: 'Start portfolio development server', category: 'npm', type: 'terminal' },
        { label: 'Build', command: 'npm run build', description: 'Build for production', category: 'npm', type: 'terminal' },
        { label: 'Clean install', command: 'Remove-Item -Recurse -Force node_modules; npm install', description: 'Delete node_modules and reinstall', category: 'npm', type: 'terminal' },
        { label: 'Check outdated', command: 'npm outdated', description: 'Check for outdated packages', category: 'npm', type: 'terminal' },
        { label: 'Create React app', command: 'npx create-react-app myapp --template typescript', description: 'Create new TypeScript React app', category: 'npm', type: 'terminal' },
        
        // Claude Code Commands
        { label: 'Start Claude', command: 'claude', description: 'Start Claude Code session', category: 'Claude Code', type: 'terminal' },
        { label: 'Continue session', command: 'claude -c', description: 'Continue last Claude Code session', category: 'Claude Code', type: 'terminal' },
        { label: 'Persistent session', command: 'claude --session-id portfolio-dev-session', description: 'Start persistent Claude session with ID', category: 'Claude Code', type: 'terminal' },
        { label: 'Resume session', command: 'claude --resume portfolio-dev-session', description: 'Resume persistent Claude session', category: 'Claude Code', type: 'terminal' },
        { label: 'List MCP servers', command: 'claude mcp list', description: 'List configured MCP servers', category: 'Claude Code', type: 'terminal' },
        { label: 'AI commit', command: 'claude commit', description: 'AI-assisted git commit', category: 'Claude Code', type: 'terminal' },
        
        // Portfolio-Specific Commands
        { label: 'Start all projects', command: '.\\\\scripts\\\\start-all-tabbed.ps1', description: 'Start all portfolio projects in tabs', category: 'Portfolio', type: 'terminal' },
        { label: 'Kill all servers', command: '.\\\\scripts\\\\kill-all-servers.ps1', description: 'Stop all running development servers', category: 'Portfolio', type: 'terminal' },
        { label: 'Create new project', command: '.\\\\scripts\\\\create-project.ps1 -ProjectName "new-project" -Description "Description"', description: 'Create new project with template', category: 'Portfolio', type: 'terminal' },
        { label: 'Check ports', command: 'netstat -ano | Select-String ":300[0-9]"', description: 'Check which portfolio ports are in use', category: 'Portfolio', type: 'terminal' },
        { label: 'Reinstall extension', command: 'Set-Location vscode-extension\\\\claude-portfolio; .\\\\reinstall.ps1', description: 'Rebuild and reinstall VS Code extension', category: 'Portfolio', type: 'terminal' },
        
        // AI Assistants
        { label: 'Open Copilot Chat', command: 'workbench.action.openChat', description: 'Open GitHub Copilot chat (Ctrl+Alt+I)', category: 'AI Assistants', type: 'vscode' },
        { label: 'Copilot: Explain', command: 'github.copilot.explainThis', description: 'Explain selected code', category: 'AI Assistants', type: 'vscode' },
        { label: 'Copilot: Fix', command: 'github.copilot.fixThis', description: 'Fix selected code', category: 'AI Assistants', type: 'vscode' }
    ];

    const categories = [...new Set(commands.map(c => c.category))];

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const handleCommandClick = async (command: Command) => {
        if (isVSCodeEnvironment() && command.type === 'vscode') {
            // Execute VS Code command directly
            try {
                await executeCommand(command.command);
                setLastCopied(`Executed: ${command.label}`);
                setTimeout(() => setLastCopied(null), 2000);
            } catch (error) {
                console.error('Failed to execute command:', error);
                // Fallback to copying
                await copyToClipboard(command.command);
                setLastCopied(`Copied: ${command.command}`);
                setTimeout(() => setLastCopied(null), 3000);
            }
        } else {
            // Copy terminal command to clipboard
            await copyToClipboard(command.command);
            setLastCopied(`Copied: ${command.command}`);
            setTimeout(() => setLastCopied(null), 3000);
        }
    };

    const getCommandIcon = (command: Command) => {
        if (command.type === 'vscode') {
            return isVSCodeEnvironment() ? 'play' : 'copy';
        }
        return 'terminal';
    };

    const getCommandAction = (command: Command) => {
        if (command.type === 'vscode' && isVSCodeEnvironment()) {
            return 'Execute';
        }
        return 'Copy';
    };

    return (
        <div className={`${styles.quickCommandsPanel} ${className}`}>
            <div className={styles.header}>
                <SvgIcon name="terminal" className={styles.headerIcon} />
                <h3>Quick Commands & Cheat Sheet</h3>
                {isVSCodeEnvironment() && (
                    <div className={styles.vscodeIndicator}>
                        <SvgIcon name="code" size={12} />
                        <span>VS Code Mode</span>
                    </div>
                )}
            </div>

            {lastCopied && (
                <div className={styles.notification}>
                    <SvgIcon name="check" size={14} />
                    <span>{lastCopied}</span>
                </div>
            )}

            <div className={styles.commandsContainer}>
                {categories.map(category => {
                    const categoryCommands = commands.filter(c => c.category === category);
                    const isExpanded = expandedCategories.has(category);

                    return (
                        <div key={category} className={styles.categorySection}>
                            <div 
                                className={styles.categoryHeader}
                                onClick={() => toggleCategory(category)}
                            >
                                <SvgIcon 
                                    name={isExpanded ? "chevronDown" : "chevronRight"} 
                                    size={12}
                                    className={styles.categoryIcon}
                                />
                                <span className={styles.categoryTitle}>{category}</span>
                                <span className={styles.categoryCount}>({categoryCommands.length})</span>
                            </div>

                            {isExpanded && (
                                <div className={styles.categoryCommands}>
                                    {categoryCommands.map((command, index) => (
                                        <div 
                                            key={index}
                                            className={styles.commandItem}
                                            onClick={() => handleCommandClick(command)}
                                            title={`${getCommandAction(command)}: ${command.command}`}
                                        >
                                            <div className={styles.commandInfo}>
                                                <div className={styles.commandLabel}>
                                                    <SvgIcon 
                                                        name={getCommandIcon(command)} 
                                                        size={12}
                                                        className={styles.commandIcon}
                                                    />
                                                    <span>{command.label}</span>
                                                </div>
                                                <div className={styles.commandDescription}>
                                                    {command.description}
                                                </div>
                                                <div className={styles.commandCode}>
                                                    <code>{command.command}</code>
                                                </div>
                                            </div>
                                            <div className={styles.commandAction}>
                                                <SvgIcon name={getCommandIcon(command)} size={14} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickCommandsPanel;
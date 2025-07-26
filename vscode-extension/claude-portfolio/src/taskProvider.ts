import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VSCodeSecurityService } from './securityService';

export class PortfolioTaskProvider implements vscode.TaskProvider {
    static taskType = 'portfolio';
    
    constructor(private portfolioPath: string) {}

    async provideTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];
        
        // Portfolio-level tasks
        tasks.push(
            ...this.createPortfolioTasks(),
            ...await this.createProjectTasks(),
            ...this.createUtilityTasks(),
            ...this.createExtensionTasks()
        );
        
        return tasks;
    }

    resolveTask(task: vscode.Task): vscode.Task | undefined {
        const definition = task.definition;
        
        if (definition.type === PortfolioTaskProvider.taskType) {
            return this.createTask(
                definition,
                task.scope ?? vscode.TaskScope.Workspace,
                definition.label,
                definition.script,
                definition.cwd || this.portfolioPath,
                definition.env || {}
            );
        }
        
        return undefined;
    }

    private createPortfolioTasks(): vscode.Task[] {
        return [
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'dev' },
                vscode.TaskScope.Workspace,
                'Portfolio: Start Dev Server',
                'npm run dev',
                this.portfolioPath,
                { BROWSER: 'none' },
                vscode.TaskGroup.Build
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'build' },
                vscode.TaskScope.Workspace,
                'Portfolio: Build',
                'npm run build',
                this.portfolioPath,
                {},
                vscode.TaskGroup.Build
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'test' },
                vscode.TaskScope.Workspace,
                'Portfolio: Run Tests',
                'npm run test',
                this.portfolioPath,
                {},
                vscode.TaskGroup.Test
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'test:coverage' },
                vscode.TaskScope.Workspace,
                'Portfolio: Test Coverage',
                'npm run test:coverage',
                this.portfolioPath,
                {},
                vscode.TaskGroup.Test
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'lint' },
                vscode.TaskScope.Workspace,
                'Portfolio: Lint',
                'npm run lint',
                this.portfolioPath,
                {},
                vscode.TaskGroup.Test
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'portfolio', command: 'type-check' },
                vscode.TaskScope.Workspace,
                'Portfolio: Type Check',
                'npm run type-check',
                this.portfolioPath,
                {},
                vscode.TaskGroup.Test
            )
        ];
    }

    private async createProjectTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];
        const projectsDir = path.join(this.portfolioPath, 'projects');
        
        if (!fs.existsSync(projectsDir)) {
            return tasks;
        }

        try {
            const projects = await this.loadProjectManifest();
            
            for (const project of projects) {
                const projectPath = path.join(projectsDir, project.id);
                
                if (fs.existsSync(projectPath)) {
                    tasks.push(
                        ...this.createProjectSpecificTasks(project, projectPath)
                    );
                }
            }
        } catch (error) {
            console.error('Error loading project manifest:', error);
        }
        
        return tasks;
    }

    private createProjectSpecificTasks(project: any, projectPath: string): vscode.Task[] {
        const tasks: vscode.Task[] = [];
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return tasks;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            
            // Create tasks for common scripts
            const commonScripts = ['dev', 'start', 'build', 'test', 'lint'];
            
            for (const scriptName of commonScripts) {
                if (scripts[scriptName]) {
                    const env = this.getProjectEnvironment(project, scriptName);
                    
                    tasks.push(
                        this.createTask(
                            { 
                                type: PortfolioTaskProvider.taskType, 
                                category: 'project', 
                                project: project.id,
                                command: scriptName 
                            },
                            vscode.TaskScope.Workspace,
                            `${project.title}: ${scriptName}`,
                            `npm run ${scriptName}`,
                            projectPath,
                            env,
                            this.getTaskGroup(scriptName)
                        )
                    );
                }
            }
            
            // Create install task
            tasks.push(
                this.createTask(
                    { 
                        type: PortfolioTaskProvider.taskType, 
                        category: 'project', 
                        project: project.id,
                        command: 'install' 
                    },
                    vscode.TaskScope.Workspace,
                    `${project.title}: Install Dependencies`,
                    'npm install',
                    projectPath,
                    {},
                    undefined
                )
            );
            
        } catch (error) {
            console.error(`Error reading package.json for project ${project.id}:`, error);
        }
        
        return tasks;
    }

    private createUtilityTasks(): vscode.Task[] {
        return [
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'utility', command: 'start-all' },
                vscode.TaskScope.Workspace,
                'Utility: Start All Projects',
                'powershell -ExecutionPolicy Bypass -File .\\scripts\\start-all-enhanced.ps1',
                this.portfolioPath
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'utility', command: 'kill-all' },
                vscode.TaskScope.Workspace,
                'Utility: Kill All Servers',
                'powershell -ExecutionPolicy Bypass -File .\\scripts\\kill-all-servers.ps1',
                this.portfolioPath
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'utility', command: 'check-ports' },
                vscode.TaskScope.Workspace,
                'Utility: Check Ports',
                'powershell -ExecutionPolicy Bypass -File .\\scripts\\check-ports.ps1',
                this.portfolioPath
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'utility', command: 'monitor-performance' },
                vscode.TaskScope.Workspace,
                'Utility: Monitor Performance',
                'powershell -ExecutionPolicy Bypass -File .\\scripts\\monitor-performance.ps1',
                this.portfolioPath
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'utility', command: 'monitor-watch' },
                vscode.TaskScope.Workspace,
                'Utility: Watch Performance',
                'powershell -ExecutionPolicy Bypass -File .\\scripts\\monitor-performance.ps1 -Watch',
                this.portfolioPath
            )
        ];
    }

    private createExtensionTasks(): vscode.Task[] {
        const extensionPath = path.join(this.portfolioPath, 'vscode-extension', 'claude-portfolio');
        
        return [
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'extension', command: 'build' },
                vscode.TaskScope.Workspace,
                'Extension: Build',
                'npm run compile',
                extensionPath,
                {},
                vscode.TaskGroup.Build
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'extension', command: 'watch' },
                vscode.TaskScope.Workspace,
                'Extension: Watch',
                'npm run watch',
                extensionPath
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'extension', command: 'package' },
                vscode.TaskScope.Workspace,
                'Extension: Package',
                'npx vsce package',
                extensionPath,
                {},
                vscode.TaskGroup.Build
            ),
            this.createTask(
                { type: PortfolioTaskProvider.taskType, category: 'extension', command: 'install' },
                vscode.TaskScope.Workspace,
                'Extension: Install',
                'code --install-extension claude-portfolio-0.0.1.vsix --force',
                extensionPath
            )
        ];
    }

    private createTask(
        definition: any,
        scope: vscode.TaskScope | vscode.WorkspaceFolder,
        name: string,
        command: string,
        cwd: string,
        env: { [key: string]: string } = {},
        group?: vscode.TaskGroup
    ): vscode.Task {
        // SECURITY: Validate command before creating task
        if (!VSCodeSecurityService.validateCommand(command)) {
            throw new Error(`Task command blocked by security validation: ${command}`);
        }

        // SECURITY: Validate and sanitize working directory path
        const workspaceRoot = path.join(this.portfolioPath, '..');  // D:\ClaudeWindows
        let sanitizedCwd: string;
        try {
            // Use synchronous path validation since tasks are created synchronously
            const normalized = path.normalize(cwd);
            const resolved = path.resolve(workspaceRoot, normalized);
            const workspaceAbsolute = path.resolve(workspaceRoot);
            
            if (!resolved.startsWith(workspaceAbsolute)) {
                throw new Error(`Task path traversal detected: ${cwd} resolves outside workspace`);
            }
            sanitizedCwd = resolved;
        } catch (error) {
            throw new Error(`Task path validation failed: ${error}`);
        }

        const execution = new vscode.ShellExecution(command, {
            cwd: sanitizedCwd,
            env: Object.fromEntries(
                Object.entries({ ...process.env, ...env })
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, String(value)])
            )
        });
        
        const task = new vscode.Task(
            definition,
            scope,
            name,
            PortfolioTaskProvider.taskType,
            execution
        );
        
        if (group) {
            task.group = group;
        }
        
        // Set presentation options
        task.presentationOptions = {
            echo: true,
            reveal: vscode.TaskRevealKind.Always,
            focus: false,
            panel: vscode.TaskPanelKind.Shared,
            showReuseMessage: false,
            clear: definition.category === 'utility'
        };
        
        // Set problem matchers
        if (definition.command === 'build' || definition.command === 'compile') {
            task.problemMatchers = ['$tsc'];
        } else if (definition.command === 'lint') {
            task.problemMatchers = ['$eslint-stylish'];
        } else if (definition.command === 'test') {
            task.problemMatchers = ['$tsc'];
        }
        
        return task;
    }

    private async loadProjectManifest(): Promise<any[]> {
        const manifestPath = path.join(this.portfolioPath, 'projects', 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(content);
            return manifest.projects || [];
        }
        
        return [];
    }

    private getProjectEnvironment(project: any, scriptName: string): { [key: string]: string } {
        const env: { [key: string]: string } = {};
        
        if (project.localPort) {
            env.PORT = project.localPort.toString();
        }
        
        if (scriptName === 'dev' || scriptName === 'start') {
            env.BROWSER = 'none';
            env.OPEN_BROWSER = 'false';
        }
        
        return env;
    }

    private getTaskGroup(scriptName: string): vscode.TaskGroup | undefined {
        switch (scriptName) {
            case 'build':
                return vscode.TaskGroup.Build;
            case 'test':
                return vscode.TaskGroup.Test;
            default:
                return undefined;
        }
    }
}
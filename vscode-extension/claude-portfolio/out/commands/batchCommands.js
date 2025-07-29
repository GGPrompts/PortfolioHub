"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchCommands = void 0;
const vscode = __importStar(require("vscode"));
const securityService_1 = require("../securityService");
const path = __importStar(require("path"));
/**
 * Multi-project batch operation commands
 */
class BatchCommands {
    constructor(projectService, configService, projectProvider) {
        this.projectService = projectService;
        this.configService = configService;
        this.projectProvider = projectProvider;
    }
    /**
     * Register all batch commands
     */
    registerCommands(context) {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.batchStartProjects', this.batchStartProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchStopProjects', this.batchStopProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchOpenBrowser', this.batchOpenBrowserCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startAllProjects', this.startAllProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.killAllServers', this.killAllServersCommand.bind(this)),
            // New batch commands with VSCodeSecurityService integration
            vscode.commands.registerCommand('claude-portfolio.batchAddToWorkspace', this.batchAddToWorkspaceCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchNpmInstall', this.batchNpmInstallCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchNpmBuild', this.batchNpmBuildCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchNpmTest', this.batchNpmTestCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchGitStatus', this.batchGitStatusCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchGitPull', this.batchGitPullCommand.bind(this))
        ];
        commands.forEach(command => context.subscriptions.push(command));
    }
    /**
     * Start selected projects in batch
     */
    async batchStartProjectsCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Start ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStartProjects(selectedProjects);
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    const progressPercent = ((index + 1) / results.length) * 100;
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Started' : 'Failed'}`
                    });
                    if (result.success) {
                        successCount++;
                        console.log(`Started: ${project.title}`);
                    }
                    else {
                        failureCount++;
                        console.error(`Failed to start: ${project.title} - ${result.error || result.message}`);
                    }
                });
                // Show summary
                const summary = `Batch start complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch start: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch start command error:', error);
        }
    }
    /**
     * Stop selected projects in batch
     */
    async batchStopProjectsCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Stop ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Stopping ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStopProjects(selectedProjects);
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Stopped' : 'Failed'}`
                    });
                    if (result.success) {
                        successCount++;
                        console.log(`Stopped: ${project.title}`);
                    }
                    else {
                        failureCount++;
                        console.error(`Failed to stop: ${project.title} - ${result.error || result.message}`);
                    }
                });
                // Show summary
                const summary = `Batch stop complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch stop: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch stop command error:', error);
        }
    }
    /**
     * Open selected projects in browser (batch)
     */
    async batchOpenBrowserCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Open ${selectedProjects.length} selected project(s) in browser?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Opening ${selectedProjects.length} projects in browser...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchOpenBrowser(selectedProjects);
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Opened' : 'Failed'}`
                    });
                    if (result.success) {
                        successCount++;
                        console.log(`Opened in browser: ${project.title}`);
                    }
                    else {
                        failureCount++;
                        console.error(`Failed to open: ${project.title} - ${result.error || result.message}`);
                    }
                });
                // Show summary
                const summary = `Batch browser open complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch browser open: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch browser open command error:', error);
        }
    }
    /**
     * Start all projects (not just selected ones)
     */
    async startAllProjectsCommand() {
        try {
            const allProjects = await this.projectProvider.getProjects();
            if (allProjects.length === 0) {
                vscode.window.showInformationMessage('No projects found');
                return;
            }
            // Show confirmation
            const confirmation = await vscode.window.showInformationMessage(`Start all ${allProjects.length} projects? This may consume significant system resources.`, { modal: true }, 'Yes', 'No');
            if (confirmation !== 'Yes') {
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting all ${allProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStartProjects(allProjects);
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                results.forEach((result, index) => {
                    const project = allProjects[index];
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Started' : 'Failed'}`
                    });
                    if (result.success) {
                        successCount++;
                    }
                    else {
                        failureCount++;
                        console.error(`❌ Failed to start: ${project.title} - ${result.error || result.message}`);
                    }
                });
                // Show summary
                const summary = `Start all complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
        }
        catch (error) {
            const message = `Error starting all projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start all projects command error:', error);
        }
    }
    /**
     * Kill all development servers
     */
    async killAllServersCommand() {
        try {
            // Show confirmation
            const confirmation = await vscode.window.showWarningMessage('Kill ALL development servers on ports 3000-3099, 5000-5999, 8000-8099, 9000-9999?', { modal: true }, 'Yes', 'No');
            if (confirmation !== 'Yes') {
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Killing all development servers...',
                cancellable: false
            }, async (progress) => {
                const portRanges = [
                    { start: 3000, end: 3099 },
                    { start: 5000, end: 5999 },
                    { start: 8000, end: 8099 },
                    { start: 9000, end: 9999 }
                ];
                let killedCount = 0;
                let totalPorts = 0;
                // Count total ports to scan for progress
                portRanges.forEach(range => {
                    totalPorts += (range.end - range.start + 1);
                });
                let processedPorts = 0;
                for (const range of portRanges) {
                    for (let port = range.start; port <= range.end; port++) {
                        try {
                            // Use netstat to find process using this port
                            const success = await this.killProcessOnPort(port);
                            if (success) {
                                killedCount++;
                                console.log(`Killed process on port ${port}`);
                            }
                        }
                        catch (error) {
                            // Ignore individual port errors
                        }
                        processedPorts++;
                        const progressPercent = (processedPorts / totalPorts) * 100;
                        progress.report({
                            increment: 100 / totalPorts,
                            message: `Scanning port ${port}... (${killedCount} killed)`
                        });
                    }
                }
                const summary = `Killed ${killedCount} development server process(es)`;
                if (killedCount > 0) {
                    vscode.window.showInformationMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage('No development servers found to kill');
                }
            });
        }
        catch (error) {
            const message = `Error killing servers: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Kill all servers command error:', error);
        }
    }
    /**
     * Helper method to kill process on specific port
     */
    async killProcessOnPort(port) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            // Use PowerShell 7.5 Get-NetTCPConnection for Windows 11
            const pwshCommand = `$conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Output 'success' } else { Write-Output 'notfound' }`;
            const pwsh = spawn('pwsh.exe', ['-Command', pwshCommand], { shell: true });
            let output = '';
            pwsh.stdout.on('data', (data) => {
                output += data.toString();
            });
            pwsh.on('close', (code) => {
                const result = output.trim();
                if (result === 'success') {
                    resolve(true);
                }
                else if (result === 'notfound') {
                    resolve(false);
                }
                else {
                    // Fallback to traditional method for compatibility
                    this.killProcessOnPortFallback(port).then(resolve);
                }
            });
            pwsh.on('error', () => {
                // Fallback to traditional method if PowerShell fails
                this.killProcessOnPortFallback(port).then(resolve);
            });
        });
    }
    /**
     * Fallback method using traditional netstat/taskkill
     */
    async killProcessOnPortFallback(port) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const netstat = spawn('netstat', ['-ano'], { shell: true });
            let output = '';
            netstat.stdout.on('data', (data) => {
                output += data.toString();
            });
            netstat.on('close', async (code) => {
                if (code !== 0) {
                    resolve(false);
                    return;
                }
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.match(new RegExp(`^\\s*TCP\\s+.*:${port}\\s+.*LISTENING\\s+(\\d+)`));
                    if (match) {
                        const pid = parseInt(match[1]);
                        try {
                            const taskkill = spawn('taskkill', ['/PID', pid.toString(), '/F'], { shell: true });
                            taskkill.on('close', (killCode) => {
                                resolve(killCode === 0);
                            });
                            return;
                        }
                        catch (error) {
                            resolve(false);
                            return;
                        }
                    }
                }
                resolve(false);
            });
            netstat.on('error', () => {
                resolve(false);
            });
        });
    }
    /**
     * Add selected projects to VS Code workspace
     */
    async batchAddToWorkspaceCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Add projects to workspace')) {
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Add ${selectedProjects.length} selected project(s) to workspace?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Adding ${selectedProjects.length} projects to workspace...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        // Sanitize path
                        const sanitizedPath = await securityService_1.VSCodeSecurityService.sanitizePath(projectPath, portfolioPath);
                        // Add to workspace
                        const workspaceFolder = {
                            uri: vscode.Uri.file(sanitizedPath),
                            name: project.title
                        };
                        const success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, workspaceFolder);
                        if (success) {
                            successCount++;
                            console.log(`Added to workspace: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`Failed to add to workspace: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error adding ${project.title} to workspace:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Added' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `Workspace update complete: ${successCount} added, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch workspace add: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch workspace add command error:', error);
        }
    }
    /**
     * Run npm install on selected projects
     */
    async batchNpmInstallCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Run npm install on projects')) {
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Run npm install on ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running npm install on ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, 'npm install', `${project.title} - Install`, portfolioPath);
                        if (success) {
                            successCount++;
                            console.log(`npm install completed: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`npm install failed: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error running npm install on ${project.title}:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Installed' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `npm install complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch npm install: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch npm install command error:', error);
        }
    }
    /**
     * Run npm run build on selected projects
     */
    async batchNpmBuildCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Run npm build on projects')) {
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Run npm run build on ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Building ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, 'npm run build', `${project.title} - Build`, portfolioPath);
                        if (success) {
                            successCount++;
                            console.log(`Build completed: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`Build failed: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error building ${project.title}:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Built' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `Build complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch build: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch build command error:', error);
        }
    }
    /**
     * Run npm test on selected projects
     */
    async batchNpmTestCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Run npm test on projects')) {
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Run npm test on ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Testing ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, 'npm test', `${project.title} - Test`, portfolioPath);
                        if (success) {
                            successCount++;
                            console.log(`Tests completed: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`Tests failed: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error testing ${project.title}:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Tested' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `Testing complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch test: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch test command error:', error);
        }
    }
    /**
     * Run git status on selected projects
     */
    async batchGitStatusCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Check git status on projects')) {
                return;
            }
            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(`Check git status on ${selectedProjects.length} selected project(s)?`, { modal: true }, 'Yes', 'No');
                if (confirmation !== 'Yes') {
                    return;
                }
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Checking git status on ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, 'git status', `${project.title} - Git Status`, portfolioPath);
                        if (success) {
                            successCount++;
                            console.log(`Git status checked: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`Git status failed: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error checking git status on ${project.title}:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Checked' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `Git status check complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch git status: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch git status command error:', error);
        }
    }
    /**
     * Run git pull on selected projects
     */
    async batchGitPullCommand() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }
            // Check workspace trust first
            if (!await securityService_1.VSCodeSecurityService.requireWorkspaceTrust('Run git pull on projects')) {
                return;
            }
            // Show confirmation if enabled - always confirm for git pull as it modifies repositories
            const confirmation = await vscode.window.showWarningMessage(`Run git pull on ${selectedProjects.length} selected project(s)? This will update all repositories.`, { modal: true }, 'Yes', 'No');
            if (confirmation !== 'Yes') {
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running git pull on ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                let successCount = 0;
                let failureCount = 0;
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    try {
                        // Get project path
                        const portfolioPath = this.configService.getPortfolioPath();
                        let projectPath;
                        if (project.path?.startsWith('D:\\')) {
                            projectPath = project.path;
                        }
                        else if (project.path?.startsWith('../Projects/')) {
                            projectPath = path.resolve(portfolioPath, project.path);
                        }
                        else {
                            projectPath = path.join(portfolioPath, 'projects', project.path || project.id);
                        }
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, 'git pull', `${project.title} - Git Pull`, portfolioPath);
                        if (success) {
                            successCount++;
                            console.log(`Git pull completed: ${project.title}`);
                        }
                        else {
                            failureCount++;
                            console.error(`Git pull failed: ${project.title}`);
                        }
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`Error running git pull on ${project.title}:`, error);
                    }
                    progress.report({
                        increment: 100 / selectedProjects.length,
                        message: `${project.title}: ${i < successCount + failureCount && i >= failureCount ? 'Updated' : 'Failed'}`
                    });
                }
                // Show summary
                const summary = `Git pull complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                }
                else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            // Clear selections after batch operation
            this.projectProvider.clearSelection();
        }
        catch (error) {
            const message = `Error in batch git pull: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch git pull command error:', error);
        }
    }
}
exports.BatchCommands = BatchCommands;
//# sourceMappingURL=batchCommands.js.map
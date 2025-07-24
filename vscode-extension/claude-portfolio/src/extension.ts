import * as vscode from 'vscode';
import { ProjectProvider, ProjectItem } from './projectProvider';
import { DashboardPanel } from './dashboardPanel';
// ProjectCommandsProvider removed - commands now accessible via command palette only
import { MultiProjectCommandsProvider } from './multiProjectCommandsProvider';
import { TerminalCommandsProvider } from './terminalCommandsProvider';
// PortfolioWebviewProvider removed - replaced with WebSocket bridge
import { PortfolioTaskProvider } from './taskProvider';
import { VSCodePageProvider } from './vscodePageProvider';
import { ChatPanel } from './panels/ChatPanel';
// CheatSheetProvider removed - functionality available in QuickCommandsPanel

// Services
import { ProjectService } from './services/projectService';
import { ConfigurationService } from './services/configurationService';
import { PortDetectionService } from './services/portDetectionService';
import { WebSocketBridgeService } from './services/websocketBridge';

// Command handlers
import { ProjectCommands } from './commands/projectCommands';
import { BatchCommands } from './commands/batchCommands';
import { SelectionCommands } from './commands/selectionCommands';
import { WorkspaceCommands } from './commands/workspaceCommands';
import { TerminalCommands } from './commands/terminalCommands';

/**
 * Services container for dependency injection
 */
interface ExtensionServices {
    configService: ConfigurationService;
    projectService: ProjectService;
    portDetectionService: PortDetectionService;
    websocketBridgeService: WebSocketBridgeService;
}

/**
 * Providers container
 */
interface ExtensionProviders {
    projectProvider: ProjectProvider;
    // projectCommandsProvider removed - commands now accessible via command palette only
    multiProjectCommandsProvider: MultiProjectCommandsProvider;
    terminalCommandsProvider: TerminalCommandsProvider;
    // portfolioWebviewProvider removed - replaced with WebSocket bridge
    taskProvider: PortfolioTaskProvider;
    vscodePageProvider: VSCodePageProvider;
    // cheatSheetProvider removed - functionality in QuickCommandsPanel
}

/**
 * Command handlers container
 */
interface ExtensionCommands {
    projectCommands: ProjectCommands;
    batchCommands: BatchCommands;
    selectionCommands: SelectionCommands;
    workspaceCommands: WorkspaceCommands;
    terminalCommands: TerminalCommands;
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Claude Portfolio extension is now active!');

    try {
        // Initialize services
        const services = initializeServices();
        console.log('✅ Services initialized');

        // Create providers
        const providers = createProviders(services, context);
        console.log('✅ Providers created');

        // Register providers with VS Code
        registerProviders(context, providers);
        console.log('✅ Providers registered');

        // Create command handlers
        const commands = createCommandHandlers(services, providers, context);
        console.log('✅ Command handlers created');

        // Register all commands
        registerCommands(context, commands, providers);
        console.log('✅ Commands registered');

        // Set up cross-provider communication
        setupProviderCommunication(providers);
        console.log('✅ Provider communication setup');

        // Set up periodic refresh
        setupPeriodicRefresh(context, providers, services);
        console.log('✅ Periodic refresh setup');

        // Start WebSocket bridge service
        services.websocketBridgeService.start().then(success => {
            if (success) {
                console.log('✅ WebSocket bridge started on ws://localhost:8123');
                vscode.window.showInformationMessage('💡 Portfolio React app can now connect to VS Code at ws://localhost:8123');
            } else {
                console.warn('⚠️ WebSocket bridge failed to start - React app will use clipboard mode');
            }
        });

        console.log('🎉 Claude Portfolio extension fully activated!');

    } catch (error) {
        console.error('❌ Extension activation failed:', error);
        vscode.window.showErrorMessage(
            `Claude Portfolio extension failed to activate: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('👋 Claude Portfolio extension is deactivating...');
    
    // Note: WebSocket bridge will be cleaned up automatically when VS Code closes
    // Individual service cleanup is handled by VS Code's disposal system
}

/**
 * Initialize all services
 */
function initializeServices(): ExtensionServices {
    const configService = ConfigurationService.getInstance();
    const portfolioPath = configService.getPortfolioPath();
    const projectService = new ProjectService(portfolioPath);
    const portDetectionService = PortDetectionService.getInstance();
    
    // Initialize WebSocket bridge service
    const websocketBridgeService = new WebSocketBridgeService(
        portfolioPath, 
        projectService, 
        portDetectionService
    );

    return {
        configService,
        projectService,
        portDetectionService,
        websocketBridgeService
    };
}

/**
 * Create all providers
 */
function createProviders(services: ExtensionServices, context: vscode.ExtensionContext): ExtensionProviders {
    const portfolioPath = services.configService.getPortfolioPath();

    const projectProvider = new ProjectProvider(portfolioPath);
    // projectCommandsProvider removed - commands now accessible via command palette only
    const multiProjectCommandsProvider = new MultiProjectCommandsProvider(projectProvider);
    const terminalCommandsProvider = new TerminalCommandsProvider();
    // portfolioWebviewProvider removed - replaced with WebSocket bridge
    const taskProvider = new PortfolioTaskProvider(portfolioPath);
    const vscodePageProvider = new VSCodePageProvider();
    // cheatSheetProvider removed - functionality in QuickCommandsPanel

    return {
        projectProvider,
        // projectCommandsProvider removed
        multiProjectCommandsProvider,
        terminalCommandsProvider,
        // portfolioWebviewProvider removed
        taskProvider,
        vscodePageProvider,
        // cheatSheetProvider removed
    };
}

/**
 * Register providers with VS Code
 */
function registerProviders(context: vscode.ExtensionContext, providers: ExtensionProviders): void {
    // Register tree data providers
    const projectTreeView = vscode.window.createTreeView('claudeProjects', {
        treeDataProvider: providers.projectProvider,
        canSelectMany: true
    });
    
    // Handle checkbox state changes
    projectTreeView.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, state]) => {
            if (item instanceof ProjectItem) {
                const projectId = item.project.id;
                const isChecked = state === vscode.TreeItemCheckboxState.Checked;
                
                // Update provider's selection state to match checkbox
                if (isChecked && !providers.projectProvider.isProjectSelected(projectId)) {
                    providers.projectProvider.toggleProjectSelection(projectId);
                } else if (!isChecked && providers.projectProvider.isProjectSelected(projectId)) {
                    providers.projectProvider.toggleProjectSelection(projectId);
                }
            }
        });
    });
    
    context.subscriptions.push(projectTreeView);
    
    // claudeProjectCommands panel removed - commands now accessible via command palette only
    vscode.window.registerTreeDataProvider('claudeMultiProjectCommands', providers.multiProjectCommandsProvider);
    vscode.window.registerTreeDataProvider('claudeTerminalCommands', providers.terminalCommandsProvider);
    vscode.window.registerTreeDataProvider('claudeVSCodePages', providers.vscodePageProvider);
    // cheatSheetProvider registration removed - functionality in QuickCommandsPanel

    // Register task provider
    const taskProviderDisposable = vscode.tasks.registerTaskProvider(
        PortfolioTaskProvider.taskType,
        providers.taskProvider
    );
    context.subscriptions.push(taskProviderDisposable);
}

/**
 * Create command handlers
 */
function createCommandHandlers(
    services: ExtensionServices,
    providers: ExtensionProviders,
    context: vscode.ExtensionContext
): ExtensionCommands {
    const projectCommands = new ProjectCommands(
        services.projectService
        // projectCommandsProvider removed - commands now accessible via command palette only
    );
    
    // Inject project provider for selection management
    projectCommands.setProjectProvider(providers.projectProvider);

    const batchCommands = new BatchCommands(
        services.projectService,
        services.configService,
        providers.projectProvider
    );

    const selectionCommands = new SelectionCommands(
        providers.projectProvider
    );
    
    // Inject project commands provider for unified behavior
    // projectCommandsProvider removed - commands now accessible via command palette only

    const workspaceCommands = new WorkspaceCommands(
        services.configService,
        null, // portfolioWebviewProvider removed - replaced with WebSocket bridge
        context,
        providers.projectProvider,
        providers.multiProjectCommandsProvider
    );

    const terminalCommands = new TerminalCommands(
        services.websocketBridgeService.getTerminalService()
    );

    return {
        projectCommands,
        batchCommands,
        selectionCommands,
        workspaceCommands,
        terminalCommands
    };
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext, commands: ExtensionCommands, providers: ExtensionProviders): void {
    commands.projectCommands.registerCommands(context);
    commands.batchCommands.registerCommands(context);
    commands.selectionCommands.registerCommands(context);
    commands.workspaceCommands.registerCommands(context);
    commands.terminalCommands.registerCommands(context);
    providers.terminalCommandsProvider.registerCommands(context);
    
    // Register Chat Panel command
    const chatCommand = vscode.commands.registerCommand('claudePortfolio.openChat', () => {
        ChatPanel.createOrShow(context.extensionUri, context);
    });
    context.subscriptions.push(chatCommand);
}

/**
 * Set up cross-provider communication with enhanced port detection
 */
function setupProviderCommunication(providers: ExtensionProviders): void {
    // When project provider refreshes, also refresh webview data AND multi-project commands
    const originalRefresh = providers.projectProvider.refresh.bind(providers.projectProvider);
    providers.projectProvider.refresh = async () => {
        // Use enhanced port detection during refresh
        const portDetectionService = PortDetectionService.getInstance();
        const projects = await providers.projectProvider.getProjects();
        
        console.log('🔄 Provider communication: Enhanced refresh triggered');
        await portDetectionService.refreshAll(projects);
        
        // Now call the original refresh
        originalRefresh();
        
        // Trigger refresh after a short delay to allow project status to update
        setTimeout(() => {
            // portfolioWebviewProvider removed - WebSocket bridge handles refreshes
            providers.multiProjectCommandsProvider.refresh();
        }, 1000);
    };

    // Also hook into project selection changes to update multi-project commands immediately
    const originalToggleSelection = providers.projectProvider.toggleProjectSelection.bind(providers.projectProvider);
    providers.projectProvider.toggleProjectSelection = (projectId: string) => {
        originalToggleSelection(projectId);
        // Immediately refresh multi-project commands when selection changes
        providers.multiProjectCommandsProvider.refresh();
    };

    const originalClearSelection = providers.projectProvider.clearSelection.bind(providers.projectProvider);
    providers.projectProvider.clearSelection = () => {
        originalClearSelection();
        // Immediately refresh multi-project commands when selection is cleared
        providers.multiProjectCommandsProvider.refresh();
    };

    const originalSelectAll = providers.projectProvider.selectAll.bind(providers.projectProvider);
    providers.projectProvider.selectAll = () => {
        originalSelectAll();
        // Immediately refresh multi-project commands when all are selected
        providers.multiProjectCommandsProvider.refresh();
    };

    // Hook into single project selection for commands panel
    const originalSetCurrentSelectedProject = providers.projectProvider.setCurrentSelectedProject.bind(providers.projectProvider);
    providers.projectProvider.setCurrentSelectedProject = (project: any) => {
        originalSetCurrentSelectedProject(project);
        // Project commands panel removed - commands now accessible via command palette only
    };

    // Hook into clearing project selection for commands panel
    const originalClearCurrentSelection = providers.projectProvider.clearCurrentSelection.bind(providers.projectProvider);
    providers.projectProvider.clearCurrentSelection = () => {
        originalClearCurrentSelection();
        // Project commands panel removed - commands now accessible via command palette only
    };
}

/**
 * Set up periodic refresh for project status
 */
function setupPeriodicRefresh(
    context: vscode.ExtensionContext,
    providers: ExtensionProviders,
    services: ExtensionServices
): void {
    const refreshInterval = services.configService.getRefreshInterval();
    
    const intervalId = setInterval(() => {
        if (services.configService.isDebugLogsEnabled()) {
            console.log('🔄 Periodic refresh triggered');
        }
        
        providers.projectProvider.refresh();
        // portfolioWebviewProvider removed - WebSocket bridge handles data refresh
    }, refreshInterval);

    // Ensure interval is cleared when extension deactivates
    context.subscriptions.push({
        dispose: () => {
            clearInterval(intervalId);
            console.log('🛑 Periodic refresh stopped');
        }
    });
}

/**
 * Helper function to get project path (used by legacy code - can be removed later)
 */
export function getProjectPath(portfolioPath: string, project: any): string {
    const path = require('path');
    
    if (project.path?.startsWith('D:\\')) {
        // External project path (absolute)
        return project.path;
    } else if (project.path === '.') {
        // Self-reference to portfolio root
        return portfolioPath;
    } else if (project.path?.startsWith('../Projects/')) {
        // External project path (relative to portfolio)
        return path.resolve(portfolioPath, project.path);
    } else if (project.path?.startsWith('projects/')) {
        // Internal project path (relative to portfolio root)
        return path.join(portfolioPath, project.path);
    } else {
        // Default: assume internal project
        return path.join(portfolioPath, 'projects', project.path || project.id);
    }
}

/**
 * Helper function to check workspace trust (used by legacy code - can be removed later)
 */
function requireWorkspaceTrust(): boolean {
    return vscode.workspace.isTrusted;
}
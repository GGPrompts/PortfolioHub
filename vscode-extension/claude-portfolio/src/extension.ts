import * as vscode from 'vscode';
import { ProjectProvider } from './projectProvider';
import { DashboardPanel } from './dashboardPanel';
import { ProjectCommandsProvider } from './projectCommandsProvider';
import { MultiProjectCommandsProvider } from './multiProjectCommandsProvider';
import { PortfolioWebviewProvider } from './portfolioWebviewProvider';
import { PortfolioTaskProvider } from './taskProvider';
// CheatSheetProvider removed - functionality available in QuickCommandsPanel

// Services
import { ProjectService } from './services/projectService';
import { ConfigurationService } from './services/configurationService';
import { PortDetectionService } from './services/portDetectionService';

// Command handlers
import { ProjectCommands } from './commands/projectCommands';
import { BatchCommands } from './commands/batchCommands';
import { SelectionCommands } from './commands/selectionCommands';
import { WorkspaceCommands } from './commands/workspaceCommands';

/**
 * Services container for dependency injection
 */
interface ExtensionServices {
    configService: ConfigurationService;
    projectService: ProjectService;
    portDetectionService: PortDetectionService;
}

/**
 * Providers container
 */
interface ExtensionProviders {
    projectProvider: ProjectProvider;
    projectCommandsProvider: ProjectCommandsProvider;
    multiProjectCommandsProvider: MultiProjectCommandsProvider;
    portfolioWebviewProvider: PortfolioWebviewProvider;
    taskProvider: PortfolioTaskProvider;
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
        registerCommands(context, commands);
        console.log('✅ Commands registered');

        // Set up cross-provider communication
        setupProviderCommunication(providers);
        console.log('✅ Provider communication setup');

        // Set up periodic refresh
        setupPeriodicRefresh(context, providers, services);
        console.log('✅ Periodic refresh setup');

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
}

/**
 * Initialize all services
 */
function initializeServices(): ExtensionServices {
    const configService = ConfigurationService.getInstance();
    const portfolioPath = configService.getPortfolioPath();
    const projectService = new ProjectService(portfolioPath);
    const portDetectionService = PortDetectionService.getInstance();

    return {
        configService,
        projectService,
        portDetectionService
    };
}

/**
 * Create all providers
 */
function createProviders(services: ExtensionServices, context: vscode.ExtensionContext): ExtensionProviders {
    const portfolioPath = services.configService.getPortfolioPath();

    const projectProvider = new ProjectProvider(portfolioPath);
    const projectCommandsProvider = new ProjectCommandsProvider();
    const multiProjectCommandsProvider = new MultiProjectCommandsProvider(projectProvider);
    const portfolioWebviewProvider = new PortfolioWebviewProvider(context.extensionUri, portfolioPath);
    const taskProvider = new PortfolioTaskProvider(portfolioPath);
    // cheatSheetProvider removed - functionality in QuickCommandsPanel

    return {
        projectProvider,
        projectCommandsProvider,
        multiProjectCommandsProvider,
        portfolioWebviewProvider,
        taskProvider,
        // cheatSheetProvider removed
    };
}

/**
 * Register providers with VS Code
 */
function registerProviders(context: vscode.ExtensionContext, providers: ExtensionProviders): void {
    // Register tree data providers
    vscode.window.registerTreeDataProvider('claudeProjects', providers.projectProvider);
    vscode.window.registerTreeDataProvider('claudeProjectCommands', providers.projectCommandsProvider);
    vscode.window.registerTreeDataProvider('claudeMultiProjectCommands', providers.multiProjectCommandsProvider);
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
        services.projectService,
        providers.projectCommandsProvider
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
    selectionCommands.setProjectCommandsProvider(providers.projectCommandsProvider);

    const workspaceCommands = new WorkspaceCommands(
        services.configService,
        providers.portfolioWebviewProvider,
        context
    );

    return {
        projectCommands,
        batchCommands,
        selectionCommands,
        workspaceCommands
    };
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext, commands: ExtensionCommands): void {
    commands.projectCommands.registerCommands(context);
    commands.batchCommands.registerCommands(context);
    commands.selectionCommands.registerCommands(context);
    commands.workspaceCommands.registerCommands(context);
}

/**
 * Set up cross-provider communication
 */
function setupProviderCommunication(providers: ExtensionProviders): void {
    // When project provider refreshes, also refresh webview data AND multi-project commands
    const originalRefresh = providers.projectProvider.refresh.bind(providers.projectProvider);
    providers.projectProvider.refresh = () => {
        originalRefresh();
        // Trigger webview refresh after a short delay to allow project status to update
        setTimeout(() => {
            providers.portfolioWebviewProvider.refreshProjectData();
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
        // Update project commands panel when a single project is selected
        providers.projectCommandsProvider.setSelectedProject(project);
    };

    // Hook into clearing project selection for commands panel
    const originalClearCurrentSelection = providers.projectProvider.clearCurrentSelection.bind(providers.projectProvider);
    providers.projectProvider.clearCurrentSelection = () => {
        originalClearCurrentSelection();
        // Clear project commands panel when no project is selected
        providers.projectCommandsProvider.clearSelection();
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
        providers.portfolioWebviewProvider.refreshProjectData();
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
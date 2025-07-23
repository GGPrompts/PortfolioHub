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
exports.activate = activate;
exports.deactivate = deactivate;
exports.getProjectPath = getProjectPath;
const vscode = __importStar(require("vscode"));
const projectProvider_1 = require("./projectProvider");
const projectCommandsProvider_1 = require("./projectCommandsProvider");
const multiProjectCommandsProvider_1 = require("./multiProjectCommandsProvider");
const portfolioWebviewProvider_1 = require("./portfolioWebviewProvider");
const taskProvider_1 = require("./taskProvider");
// CheatSheetProvider removed - functionality available in QuickCommandsPanel
// Services
const projectService_1 = require("./services/projectService");
const configurationService_1 = require("./services/configurationService");
const portDetectionService_1 = require("./services/portDetectionService");
// Command handlers
const projectCommands_1 = require("./commands/projectCommands");
const batchCommands_1 = require("./commands/batchCommands");
const selectionCommands_1 = require("./commands/selectionCommands");
const workspaceCommands_1 = require("./commands/workspaceCommands");
/**
 * Extension activation
 */
function activate(context) {
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
    }
    catch (error) {
        console.error('❌ Extension activation failed:', error);
        vscode.window.showErrorMessage(`Claude Portfolio extension failed to activate: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Extension deactivation
 */
function deactivate() {
    console.log('👋 Claude Portfolio extension is deactivating...');
}
/**
 * Initialize all services
 */
function initializeServices() {
    const configService = configurationService_1.ConfigurationService.getInstance();
    const portfolioPath = configService.getPortfolioPath();
    const projectService = new projectService_1.ProjectService(portfolioPath);
    const portDetectionService = portDetectionService_1.PortDetectionService.getInstance();
    return {
        configService,
        projectService,
        portDetectionService
    };
}
/**
 * Create all providers
 */
function createProviders(services, context) {
    const portfolioPath = services.configService.getPortfolioPath();
    const projectProvider = new projectProvider_1.ProjectProvider(portfolioPath);
    const projectCommandsProvider = new projectCommandsProvider_1.ProjectCommandsProvider();
    const multiProjectCommandsProvider = new multiProjectCommandsProvider_1.MultiProjectCommandsProvider(projectProvider);
    const portfolioWebviewProvider = new portfolioWebviewProvider_1.PortfolioWebviewProvider(context.extensionUri, portfolioPath);
    const taskProvider = new taskProvider_1.PortfolioTaskProvider(portfolioPath);
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
function registerProviders(context, providers) {
    // Register tree data providers
    vscode.window.registerTreeDataProvider('claudeProjects', providers.projectProvider);
    vscode.window.registerTreeDataProvider('claudeProjectCommands', providers.projectCommandsProvider);
    vscode.window.registerTreeDataProvider('claudeMultiProjectCommands', providers.multiProjectCommandsProvider);
    // cheatSheetProvider registration removed - functionality in QuickCommandsPanel
    // Register task provider
    const taskProviderDisposable = vscode.tasks.registerTaskProvider(taskProvider_1.PortfolioTaskProvider.taskType, providers.taskProvider);
    context.subscriptions.push(taskProviderDisposable);
}
/**
 * Create command handlers
 */
function createCommandHandlers(services, providers, context) {
    const projectCommands = new projectCommands_1.ProjectCommands(services.projectService, providers.projectCommandsProvider);
    // Inject project provider for selection management
    projectCommands.setProjectProvider(providers.projectProvider);
    const batchCommands = new batchCommands_1.BatchCommands(services.projectService, services.configService, providers.projectProvider);
    const selectionCommands = new selectionCommands_1.SelectionCommands(providers.projectProvider);
    // Inject project commands provider for unified behavior
    selectionCommands.setProjectCommandsProvider(providers.projectCommandsProvider);
    const workspaceCommands = new workspaceCommands_1.WorkspaceCommands(services.configService, providers.portfolioWebviewProvider, context);
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
function registerCommands(context, commands) {
    commands.projectCommands.registerCommands(context);
    commands.batchCommands.registerCommands(context);
    commands.selectionCommands.registerCommands(context);
    commands.workspaceCommands.registerCommands(context);
}
/**
 * Set up cross-provider communication
 */
function setupProviderCommunication(providers) {
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
    providers.projectProvider.toggleProjectSelection = (projectId) => {
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
    providers.projectProvider.setCurrentSelectedProject = (project) => {
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
function setupPeriodicRefresh(context, providers, services) {
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
function getProjectPath(portfolioPath, project) {
    if (project.path?.startsWith('D:\\')) {
        // External project path (absolute)
        return project.path;
    }
    else {
        // Internal project path (relative to projects folder)
        return require('path').join(portfolioPath, 'projects', project.path || project.id);
    }
}
/**
 * Helper function to check workspace trust (used by legacy code - can be removed later)
 */
function requireWorkspaceTrust() {
    return vscode.workspace.isTrusted;
}
//# sourceMappingURL=extension.js.map
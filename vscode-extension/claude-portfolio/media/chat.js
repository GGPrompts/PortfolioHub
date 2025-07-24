// AI Chat Interface - Frontend JavaScript
// Termux-style interface with VS Code integration

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // DOM Elements
    const messageHistory = document.getElementById('message-history');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const queueButton = document.getElementById('queue-message');
    const variableButton = document.getElementById('variable-helper');
    const processQueueButton = document.getElementById('process-queue');
    const queueCount = document.getElementById('queue-count');
    const variableHints = document.getElementById('variable-hints');
    const templateButtons = document.querySelectorAll('.template-btn');
    const targetCheckboxes = document.querySelectorAll('input[name="target"]');

    // State
    let messageQueue = [];
    let messageHistory_data = [];
    let currentTemplate = null;
    let fillableFields = {};

    // VS Code Variables
    const vsCodeVariables = [
        '${workspaceFolder}',
        '${workspaceFolderBasename}',
        '${file}',
        '${fileBasename}',
        '${fileBasenameNoExtension}',
        '${fileDirname}',
        '${fileExtname}',
        '${selectedText}',
        '${lineNumber}',
        '${currentDateTime}',
        '${gitBranch}',
        '${projectName}'
    ];

    // Initialize
    init();

    function init() {
        setupEventListeners();
        updateQueueDisplay();
        focusInput();
    }

    function setupEventListeners() {
        // Send message
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keydown', handleInputKeydown);

        // Queue management
        queueButton.addEventListener('click', queueMessage);
        processQueueButton.addEventListener('click', processQueue);

        // Variable helper
        variableButton.addEventListener('click', toggleVariableHints);
        messageInput.addEventListener('input', handleInputChange);

        // Template buttons
        templateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.dataset.template;
                loadTemplate(templateId);
            });
        });

        // Target selection
        targetCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateTargetSelection);
        });

        // VS Code messages
        window.addEventListener('message', handleVSCodeMessage);

        // Variable hints
        document.addEventListener('click', (e) => {
            if (!variableHints.contains(e.target)) {
                hideVariableHints();
            }
        });
    }

    function handleInputKeydown(e) {
        // Ctrl+Enter to send
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
            return;
        }

        // Tab for autocomplete
        if (e.key === 'Tab') {
            const cursorPos = messageInput.selectionStart;
            const text = messageInput.value;
            const beforeCursor = text.substring(0, cursorPos);
            
            // Check if we're typing a variable
            const varMatch = beforeCursor.match(/\$\{([^}]*)$/);
            if (varMatch) {
                e.preventDefault();
                showVariableHints(varMatch[1]);
                return;
            }
        }

        // Escape to hide hints
        if (e.key === 'Escape') {
            hideVariableHints();
        }
    }

    function handleInputChange(e) {
        const cursorPos = messageInput.selectionStart;
        const text = messageInput.value;
        const beforeCursor = text.substring(0, cursorPos);
        
        // Auto-show variable hints when typing ${
        const varMatch = beforeCursor.match(/\$\{([^}]*)$/);
        if (varMatch) {
            showVariableHints(varMatch[1]);
        } else {
            hideVariableHints();
        }
    }

    function showVariableHints(partial = '') {
        const filtered = vsCodeVariables.filter(variable => 
            variable.toLowerCase().includes(partial.toLowerCase())
        );

        if (filtered.length === 0) {
            hideVariableHints();
            return;
        }

        variableHints.innerHTML = filtered.map(variable => 
            `<div class="variable-hint" data-variable="${variable}">${variable}</div>`
        ).join('');

        // Add click handlers
        variableHints.querySelectorAll('.variable-hint').forEach(hint => {
            hint.addEventListener('click', () => {
                insertVariable(hint.dataset.variable);
                hideVariableHints();
            });
        });

        variableHints.classList.add('show');
    }

    function hideVariableHints() {
        variableHints.classList.remove('show');
    }

    function insertVariable(variable) {
        const cursorPos = messageInput.selectionStart;
        const text = messageInput.value;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        // Find the start of the current variable being typed
        const varMatch = beforeCursor.match(/\$\{([^}]*)$/);
        if (varMatch) {
            const startPos = cursorPos - varMatch[0].length;
            const newText = text.substring(0, startPos) + variable + afterCursor;
            messageInput.value = newText;
            messageInput.setSelectionRange(startPos + variable.length, startPos + variable.length);
        } else {
            // Insert at cursor
            const newText = beforeCursor + variable + afterCursor;
            messageInput.value = newText;
            messageInput.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);
        }
        
        messageInput.focus();
    }

    function toggleVariableHints() {
        if (variableHints.classList.contains('show')) {
            hideVariableHints();
        } else {
            showVariableHints();
        }
    }

    function getSelectedTargets() {
        return Array.from(targetCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    function updateTargetSelection() {
        const selected = getSelectedTargets();
        // Visual feedback could be added here
    }

    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content) return;

        const targets = getSelectedTargets();
        if (targets.length === 0) {
            showErrorMessage('Please select at least one target');
            return;
        }

        // Add user message to history
        const userMessage = {
            id: generateId(),
            type: 'user',
            content: content,
            targets: targets,
            timestamp: new Date()
        };

        addMessageToHistory(userMessage);
        
        // Clear input
        messageInput.value = '';
        
        // Send to VS Code
        vscode.postMessage({
            type: 'sendMessage',
            content: content,
            targets: targets,
            variables: extractVariables(content)
        });

        // Show loading states
        targets.forEach(target => {
            const loadingMessage = {
                id: generateId(),
                type: target,
                content: 'Processing...',
                timestamp: new Date(),
                loading: true
            };
            addMessageToHistory(loadingMessage);
        });

        focusInput();
    }

    function queueMessage() {
        const content = messageInput.value.trim();
        if (!content) return;

        const targets = getSelectedTargets();
        if (targets.length === 0) {
            showErrorMessage('Please select at least one target');
            return;
        }

        const queuedMessage = {
            id: generateId(),
            content: content,
            targets: targets,
            timestamp: new Date(),
            variables: extractVariables(content)
        };

        messageQueue.push(queuedMessage);
        updateQueueDisplay();
        
        // Clear input
        messageInput.value = '';
        
        // Show queued message
        showSuccessMessage(`Message queued for ${targets.join(', ')}`);
        
        focusInput();
    }

    function processQueue() {
        if (messageQueue.length === 0) return;

        // Process all queued messages
        messageQueue.forEach(message => {
            vscode.postMessage({
                type: 'sendMessage',
                content: message.content,
                targets: message.targets,  
                variables: message.variables
            });

            // Add to history
            addMessageToHistory({
                ...message,
                type: 'user'
            });
        });

        // Clear queue
        messageQueue = [];
        updateQueueDisplay();
        
        showSuccessMessage(`Processed ${messageQueue.length} queued messages`);
    }

    function updateQueueDisplay() {
        queueCount.textContent = `Queue: ${messageQueue.length}`;
        processQueueButton.style.opacity = messageQueue.length > 0 ? '1' : '0.5';
    }

    function extractVariables(content) {
        const variables = {};
        const matches = content.match(/\$\{([^}]+)\}/g);
        
        if (matches) {
            matches.forEach(match => {
                const varName = match.slice(2, -1); // Remove ${ and }
                variables[varName] = ''; // Will be filled by VS Code
            });
        }
        
        return variables;
    }

    function loadTemplate(templateId) {
        vscode.postMessage({
            type: 'executeTemplate',
            templateId: templateId,
            targets: getSelectedTargets(),
            fillableFields: fillableFields
        });

        // Show template loading message
        showSuccessMessage(`Loading ${templateId} template...`);
    }

    function addMessageToHistory(message) {
        const messageEl = createMessageElement(message);
        messageHistory.appendChild(messageEl);
        
        // Scroll to bottom
        messageHistory.scrollTop = messageHistory.scrollHeight;
        
        // Add to data
        messageHistory_data.push(message);
    }

    function createMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}${message.loading ? ' loading' : ''}${message.error ? ' error' : ''}`;
        messageEl.dataset.messageId = message.id;

        const header = document.createElement('div');
        header.className = 'message-header';
        
        const sender = document.createElement('span');
        sender.className = 'message-sender';
        sender.textContent = message.type.toUpperCase();
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTime(message.timestamp);
        
        header.appendChild(sender);
        header.appendChild(time);

        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message.content;

        messageEl.appendChild(header);
        messageEl.appendChild(content);

        // Add targets if present
        if (message.targets && message.targets.length > 0) {
            const targets = document.createElement('div');
            targets.className = 'message-targets';
            
            message.targets.forEach(target => {
                const badge = document.createElement('span');
                badge.className = 'target-badge';
                badge.textContent = target;
                targets.appendChild(badge);
            });
            
            messageEl.appendChild(targets);
        }

        return messageEl;
    }

    function updateMessageElement(messageId, updates) {
        const messageEl = messageHistory.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        if (updates.content) {
            const contentEl = messageEl.querySelector('.message-content');
            contentEl.textContent = updates.content;
        }

        if (updates.loading === false) {
            messageEl.classList.remove('loading');
        }

        if (updates.error) {
            messageEl.classList.add('error');
        }

        if (updates.success) {
            messageEl.classList.add('success');
        }
    }

    function showErrorMessage(message) {
        const errorMsg = {
            id: generateId(),
            type: 'system',
            content: `❌ ${message}`,
            timestamp: new Date(),
            error: true
        };
        addMessageToHistory(errorMsg);
    }

    function showSuccessMessage(message) {
        const successMsg = {
            id: generateId(),
            type: 'system',
            content: `✅ ${message}`,
            timestamp: new Date(),
            success: true
        };
        addMessageToHistory(successMsg);
    }

    function handleVSCodeMessage(event) {
        const message = event.data;

        switch (message.type) {
            case 'messageResults':
                handleMessageResults(message.results);
                break;
                
            case 'variableResolved':
                handleVariableResolved(message.variableType, message.value);
                break;
                
            case 'templateLoaded':
                handleTemplateLoaded(message.template, message.fields);
                break;
        }
    }

    function handleMessageResults(results) {
        // Remove loading messages and add actual responses
        const loadingMessages = messageHistory.querySelectorAll('.message.loading');
        loadingMessages.forEach(el => el.remove());

        results.forEach(result => {
            const responseMessage = {
                id: generateId(),
                type: result.target,
                content: result.success ? result.response : `Error: ${result.error}`,
                timestamp: new Date(),
                error: !result.success,
                success: result.success
            };
            
            addMessageToHistory(responseMessage);
        });
    }

    function handleVariableResolved(variableType, value) {
        // Insert resolved variable into input
        const currentValue = messageInput.value;
        const placeholder = `\${${variableType}}`;
        const newValue = currentValue.replace(placeholder, value);
        messageInput.value = newValue;
    }

    function handleTemplateLoaded(template, fields) {
        messageInput.value = template;
        currentTemplate = template;
        fillableFields = fields;
        
        // Focus on first fillable field if present
        focusInput();
        
        // Highlight template variables for easy editing
        messageInput.select();
    }

    function focusInput() {
        setTimeout(() => {
            messageInput.focus();
        }, 100);
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function generateId() {
        return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Global shortcuts
        if (e.ctrlKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    toggleTarget('claude');
                    break;
                case '2':
                    e.preventDefault();
                    toggleTarget('copilot');
                    break;
                case '3':
                    e.preventDefault();
                    toggleTarget('terminal');
                    break;
                case 'q':
                    e.preventDefault();
                    queueMessage();
                    break;
                case 'Enter':
                    // Handled in input keydown
                    break;
            }
        }

        // Focus input on any typing (if not already focused)
        if (!e.ctrlKey && !e.altKey && e.key.length === 1 && document.activeElement !== messageInput) {
            messageInput.focus();
        }
    });

    function toggleTarget(targetValue) {
        const checkbox = document.querySelector(`input[value="${targetValue}"]`);
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            updateTargetSelection();
        }
    }

    // Add some helpful startup messages
    setTimeout(() => {
        showSuccessMessage('AI Chat Interface ready! Use Ctrl+Enter to send, Ctrl+Q to queue.');
        showSuccessMessage('Try templates, VS Code variables like ${selectedText}, or type ${} for hints.');
    }, 500);

})();
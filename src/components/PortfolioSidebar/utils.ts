import { isVSCodeEnvironment, executeCommand, showNotification, copyToClipboard } from '../../utils/vsCodeIntegration'

// Helper function to check if we're in VS Code and execute commands directly
export const executeOrCopyCommand = async (command: string, successMessage: string, commandName?: string) => {
  if (isVSCodeEnvironment()) {
    // Execute directly in VS Code terminal
    await executeCommand(command, commandName || 'Portfolio Command')
    showNotification(successMessage)
  } else {
    // Fallback to clipboard for web version
    try {
      await copyToClipboard(command)
      alert(successMessage + ' (copied to clipboard)')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Command ready, but clipboard copy failed.')
    }
  }
}
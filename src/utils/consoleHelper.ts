/**
 * Console Helper Utilities
 * Helper functions to manage console output and reduce development noise
 */

export class ConsoleHelper {
  private static isDebugMode = process.env.NODE_ENV === 'development';
  private static logCounts = new Map<string, number>();

  /**
   * Clear console and show a clean startup message
   */
  static clearAndShowStatus() {
    console.clear();
    console.log('🚀 Claude Portfolio - Development Mode');
    console.log('📱 To reduce console spam, check the filter buttons (ℹ️ ⚠️ ❌)');
    console.log('🔇 To silence port detection: ConsoleHelper.silencePortDetection()');
    console.log('─'.repeat(60));
  }

  /**
   * Silence repetitive port detection messages
   */
  static silencePortDetection() {
    // Override console methods for port-related messages
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';
      
      // Don't log favicon.ico requests (port detection)
      if (url.includes('favicon.ico') && url.includes('localhost:')) {
        return originalFetch(...args).catch(() => new Response(null, { status: 404 }));
      }
      
      return originalFetch(...args);
    };

    console.log('🔇 Port detection logging silenced');
  }

  /**
   * Filter console messages by type
   */
  static setConsoleFilter(showInfo = false, showWarn = true, showError = true) {
    const style = `
      .console-info { display: ${showInfo ? 'block' : 'none'} !important; }
      .console-warn { display: ${showWarn ? 'block' : 'none'} !important; }
      .console-error { display: ${showError ? 'block' : 'none'} !important; }
    `;
    
    // Inject style to hide console message types
    const styleElement = document.createElement('style');
    styleElement.textContent = style;
    document.head.appendChild(styleElement);
  }

  /**
   * Rate-limited logging to prevent spam
   */
  static rateLimitedLog(key: string, message: string, maxPerMinute = 5) {
    const now = Date.now();
    const count = this.logCounts.get(key) || 0;
    
    if (count < maxPerMinute) {
      console.log(message);
      this.logCounts.set(key, count + 1);
      
      // Reset counter after 1 minute
      setTimeout(() => {
        this.logCounts.set(key, 0);
      }, 60000);
    } else if (count === maxPerMinute) {
      console.log(`🔇 "${key}" messages rate-limited (${maxPerMinute}/min)`);
      this.logCounts.set(key, count + 1);
    }
  }

  /**
   * Debug-only logging (only shows in development)
   */
  static debug(message: string, ...args: any[]) {
    if (this.isDebugMode) {
      console.log(`🐛 ${message}`, ...args);
    }
  }

  /**
   * Show helpful development tips
   */
  static showDevTips() {
    console.group('💡 Console Tips for Portfolio Development');
    console.log('• Use the filter buttons at top of console: ℹ️ Info, ⚠️ Warnings, ❌ Errors');
    console.log('• Right-click in console → "Group similar messages" to reduce duplicates');
    console.log('• Press Ctrl+L to clear console');
    console.log('• Use ConsoleHelper.silencePortDetection() to stop port checking spam');
    console.log('• Network tab shows the favicon.ico requests causing spam');
    console.groupEnd();
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  // Make helper available globally for easy access
  (window as any).ConsoleHelper = ConsoleHelper;
  
  // Clear and show status on load
  setTimeout(() => {
    ConsoleHelper.clearAndShowStatus();
    ConsoleHelper.showDevTips();
  }, 1000);
}
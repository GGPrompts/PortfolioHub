/**
 * Terminal Performance and Load Testing Suite
 * 
 * Tests performance characteristics of the multi-terminal system:
 * - Concurrent session handling
 * - Message throughput
 * - Memory usage patterns
 * - Connection stability under load
 * 
 * Usage: node tests/terminal-performance-tests.js
 */

const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');

// Performance test configuration
const PERF_CONFIG = {
  wsPort: 8123,
  maxConcurrentSessions: 20,
  messageLoadTest: {
    messagesPerSecond: 100,
    testDurationMs: 30000,
    maxPendingMessages: 1000
  },
  stressTest: {
    sessionCreationRate: 5, // sessions per second
    commandExecutionRate: 10, // commands per second
    testDurationMs: 60000
  },
  memoryProfile: {
    sampleIntervalMs: 1000,
    maxSamples: 120 // 2 minutes worth
  }
};

// Performance metrics collector
class PerformanceMetrics extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      connections: {
        total: 0,
        successful: 0,
        failed: 0,
        averageConnectionTime: 0,
        connectionTimes: []
      },
      sessions: {
        created: 0,
        destroyed: 0,
        creationTimes: [],
        averageCreationTime: 0,
        concurrent: 0,
        maxConcurrent: 0
      },
      messages: {
        sent: 0,
        received: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: [],
        throughput: 0
      },
      memory: {
        samples: [],
        peak: { heapUsed: 0, heapTotal: 0, timestamp: 0 },
        average: { heapUsed: 0, heapTotal: 0 }
      },
      errors: [],
      startTime: Date.now(),
      endTime: null
    };
    
    this.startMemoryProfiling();
  }

  recordConnection(success, duration) {
    this.metrics.connections.total++;
    if (success) {
      this.metrics.connections.successful++;
      this.metrics.connections.connectionTimes.push(duration);
      this.updateAverageConnectionTime();
    } else {
      this.metrics.connections.failed++;
    }
    this.emit('connectionRecorded', { success, duration });
  }

  recordSession(action, success, duration, sessionId) {
    if (action === 'created' && success) {
      this.metrics.sessions.created++;
      this.metrics.sessions.concurrent++;
      this.metrics.sessions.maxConcurrent = Math.max(
        this.metrics.sessions.maxConcurrent, 
        this.metrics.sessions.concurrent
      );
      if (duration) {
        this.metrics.sessions.creationTimes.push(duration);
        this.updateAverageSessionCreationTime();
      }
    } else if (action === 'destroyed' && success) {
      this.metrics.sessions.destroyed++;
      this.metrics.sessions.concurrent = Math.max(0, this.metrics.sessions.concurrent - 1);
    }
    this.emit('sessionRecorded', { action, success, duration, sessionId });
  }

  recordMessage(success, responseTime) {
    this.metrics.messages.sent++;
    if (success) {
      this.metrics.messages.received++;
      if (responseTime) {
        this.metrics.messages.responseTimes.push(responseTime);
        this.updateAverageResponseTime();
      }
    } else {
      this.metrics.messages.failed++;
    }
    this.updateThroughput();
    this.emit('messageRecorded', { success, responseTime });
  }

  recordError(error, context) {
    this.metrics.errors.push({
      error: error.message,
      context,
      timestamp: Date.now()
    });
    this.emit('errorRecorded', { error, context });
  }

  updateAverageConnectionTime() {
    const times = this.metrics.connections.connectionTimes;
    if (times.length > 0) {
      this.metrics.connections.averageConnectionTime = 
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  }

  updateAverageSessionCreationTime() {
    const times = this.metrics.sessions.creationTimes;
    if (times.length > 0) {
      this.metrics.sessions.averageCreationTime = 
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  }

  updateAverageResponseTime() {
    const times = this.metrics.messages.responseTimes;
    if (times.length > 0) {
      this.metrics.messages.averageResponseTime = 
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  }

  updateThroughput() {
    const elapsedMs = Date.now() - this.metrics.startTime;
    const elapsedSec = elapsedMs / 1000;
    this.metrics.messages.throughput = this.metrics.messages.received / elapsedSec;
  }

  startMemoryProfiling() {
    this.memoryProfilingInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const sample = {
        ...memUsage,
        timestamp: Date.now()
      };
      
      this.metrics.memory.samples.push(sample);
      
      // Update peak
      if (memUsage.heapUsed > this.metrics.memory.peak.heapUsed) {
        this.metrics.memory.peak = sample;
      }
      
      // Limit samples to prevent memory bloat
      if (this.metrics.memory.samples.length > PERF_CONFIG.memoryProfile.maxSamples) {
        this.metrics.memory.samples.shift();
      }
      
      this.updateAverageMemory();
      this.emit('memorySampled', sample);
      
    }, PERF_CONFIG.memoryProfile.sampleIntervalMs);
  }

  updateAverageMemory() {
    const samples = this.metrics.memory.samples;
    if (samples.length > 0) {
      const totalHeapUsed = samples.reduce((sum, sample) => sum + sample.heapUsed, 0);
      const totalHeapTotal = samples.reduce((sum, sample) => sum + sample.heapTotal, 0);
      
      this.metrics.memory.average = {
        heapUsed: totalHeapUsed / samples.length,
        heapTotal: totalHeapTotal / samples.length
      };
    }
  }

  stopProfiling() {
    if (this.memoryProfilingInterval) {
      clearInterval(this.memoryProfilingInterval);
      this.memoryProfilingInterval = null;
    }
    this.metrics.endTime = Date.now();
  }

  generateReport() {
    const totalDuration = (this.metrics.endTime || Date.now()) - this.metrics.startTime;
    
    return {
      summary: {
        testDuration: totalDuration,
        totalConnections: this.metrics.connections.total,
        connectionSuccessRate: this.metrics.connections.total > 0 ? 
          (this.metrics.connections.successful / this.metrics.connections.total * 100).toFixed(1) : 0,
        averageConnectionTime: Math.round(this.metrics.connections.averageConnectionTime),
        
        totalSessions: this.metrics.sessions.created,
        maxConcurrentSessions: this.metrics.sessions.maxConcurrent,
        averageSessionCreationTime: Math.round(this.metrics.sessions.averageCreationTime),
        
        totalMessages: this.metrics.messages.sent,
        messageSuccessRate: this.metrics.messages.sent > 0 ? 
          (this.metrics.messages.received / this.metrics.messages.sent * 100).toFixed(1) : 0,
        averageResponseTime: Math.round(this.metrics.messages.averageResponseTime),
        throughput: Math.round(this.metrics.messages.throughput * 100) / 100,
        
        peakMemoryMB: Math.round(this.metrics.memory.peak.heapUsed / 1024 / 1024 * 100) / 100,
        averageMemoryMB: Math.round(this.metrics.memory.average.heapUsed / 1024 / 1024 * 100) / 100,
        
        totalErrors: this.metrics.errors.length
      },
      detailed: this.metrics
    };
  }
}

// Performance test utilities
class PerformanceTestUtils {
  static async createWebSocketConnection(url, timeout = 5000) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, timeout);
      
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        const duration = performance.now() - startTime;
        resolve({ ws, duration });
      });
      
      ws.addEventListener('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  static async sendMessageWithTiming(ws, message, timeout = 10000) {
    const startTime = performance.now();
    const messageId = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    message.id = messageId;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);
      
      const messageHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.id === messageId) {
            clearTimeout(timer);
            ws.removeEventListener('message', messageHandler);
            const duration = performance.now() - startTime;
            resolve({ response, duration });
          }
        } catch (error) {
          // Not our message, ignore
        }
      };
      
      ws.addEventListener('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }

  static generateTestWorkbranchId() {
    return `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main performance test suite
class TerminalPerformanceTests {
  constructor() {
    this.metrics = new PerformanceMetrics();
    this.connections = new Map();
    this.sessions = new Map();
    this.isRunning = false;
  }

  async runPerformanceTests() {
    console.log('🚀 Starting Terminal Performance Tests');
    console.log('=====================================');
    
    this.isRunning = true;
    
    try {
      // Connection performance tests
      await this.testConnectionPerformance();
      
      // Session creation performance
      await this.testSessionCreationPerformance();
      
      // Message throughput tests
      await this.testMessageThroughput();
      
      // Concurrent session handling
      await this.testConcurrentSessions();
      
      // Stress testing
      await this.testSystemUnderStress();
      
      // Memory leak detection
      await this.testMemoryLeaks();
      
    } catch (error) {
      console.error('🔥 Performance test suite failed:', error);
      this.metrics.recordError(error, 'test-suite');
    } finally {
      this.isRunning = false;
      await this.cleanup();
      this.metrics.stopProfiling();
      this.generatePerformanceReport();
    }
  }

  async testConnectionPerformance() {
    console.log('\n🔌 Testing Connection Performance...');
    
    const connectionCount = 10;
    const connectionPromises = [];
    
    for (let i = 0; i < connectionCount; i++) {
      const promise = PerformanceTestUtils.createWebSocketConnection(
        `ws://localhost:${PERF_CONFIG.wsPort}`
      ).then(({ ws, duration }) => {
        this.metrics.recordConnection(true, duration);
        this.connections.set(`conn-${i}`, ws);
        console.log(`✅ Connection ${i + 1}/${connectionCount} established in ${Math.round(duration)}ms`);
        return { success: true, duration };
      }).catch(error => {
        this.metrics.recordConnection(false, 0);
        console.log(`❌ Connection ${i + 1}/${connectionCount} failed: ${error.message}`);
        return { success: false, error };
      });
      
      connectionPromises.push(promise);
    }
    
    const results = await Promise.all(connectionPromises);
    const successful = results.filter(r => r.success).length;
    
    console.log(`📊 Connection Performance: ${successful}/${connectionCount} successful`);
    console.log(`📊 Average connection time: ${Math.round(this.metrics.metrics.connections.averageConnectionTime)}ms`);
  }

  async testSessionCreationPerformance() {
    console.log('\n🖥️ Testing Session Creation Performance...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      console.log('❌ No WebSocket connection available for session tests');
      return;
    }

    const sessionCount = 15;
    const sessionPromises = [];
    
    for (let i = 0; i < sessionCount; i++) {
      const workbranchId = PerformanceTestUtils.generateTestWorkbranchId();
      const sessionId = `perf-session-${i}`;
      
      const promise = PerformanceTestUtils.sendMessageWithTiming(ws, {
        type: 'terminal-create',
        terminalId: sessionId,
        data: {
          workbranchId,
          projectId: `perf-project-${i}`,
          title: `Performance Test Session ${i}`,
          shell: 'powershell'
        }
      }).then(({ response, duration }) => {
        const success = response.success && response.result?.sessionId;
        this.metrics.recordSession('created', success, duration, sessionId);
        
        if (success) {
          this.sessions.set(sessionId, {
            terminalId: sessionId,
            sessionId: response.result.sessionId,
            workbranchId
          });
          console.log(`✅ Session ${i + 1}/${sessionCount} created in ${Math.round(duration)}ms`);
        } else {
          console.log(`❌ Session ${i + 1}/${sessionCount} creation failed`);
        }
        
        return { success, duration };
      }).catch(error => {
        this.metrics.recordSession('created', false, 0, sessionId);
        console.log(`❌ Session ${i + 1}/${sessionCount} error: ${error.message}`);
        return { success: false, error };
      });
      
      sessionPromises.push(promise);
      
      // Small delay to prevent overwhelming the server
      await PerformanceTestUtils.delay(50);
    }
    
    const results = await Promise.all(sessionPromises);
    const successful = results.filter(r => r.success).length;
    
    console.log(`📊 Session Creation Performance: ${successful}/${sessionCount} successful`);
    console.log(`📊 Average session creation time: ${Math.round(this.metrics.metrics.sessions.averageCreationTime)}ms`);
  }

  async testMessageThroughput() {
    console.log('\n📡 Testing Message Throughput...');
    
    const ws = this.connections.values().next().value;
    const sessions = Array.from(this.sessions.values()).slice(0, 5); // Use first 5 sessions
    
    if (!ws || sessions.length === 0) {
      console.log('❌ No WebSocket connection or sessions available for throughput test');
      return;
    }

    const testDuration = 15000; // 15 seconds
    const targetMessagesPerSecond = 20;
    const messageInterval = 1000 / targetMessagesPerSecond;
    
    let messagesSent = 0;
    const startTime = Date.now();
    
    console.log(`📊 Sending ${targetMessagesPerSecond} messages/second for ${testDuration/1000} seconds...`);
    
    const throughputTest = new Promise((resolve) => {
      const sendMessage = async () => {
        if (Date.now() - startTime >= testDuration) {
          resolve();
          return;
        }
        
        const session = sessions[messagesSent % sessions.length];
        const command = `echo "Throughput test message ${messagesSent}"`;
        
        try {
          const { response, duration } = await PerformanceTestUtils.sendMessageWithTiming(ws, {
            type: 'terminal-command',
            terminalId: session.terminalId,
            data: { command }
          }, 5000);
          
          this.metrics.recordMessage(response.success, duration);
          messagesSent++;
          
          if (messagesSent % 50 === 0) {
            console.log(`📤 Sent ${messagesSent} messages, current throughput: ${Math.round(this.metrics.metrics.messages.throughput)} msg/s`);
          }
          
        } catch (error) {
          this.metrics.recordMessage(false, 0);
          this.metrics.recordError(error, 'throughput-test');
        }
        
        setTimeout(sendMessage, messageInterval);
      };
      
      sendMessage();
    });
    
    await throughputTest;
    
    console.log(`📊 Throughput Test Results:`);
    console.log(`   Messages sent: ${messagesSent}`);
    console.log(`   Success rate: ${this.metrics.metrics.messages.messageSuccessRate}%`);
    console.log(`   Average response time: ${Math.round(this.metrics.metrics.messages.averageResponseTime)}ms`);
    console.log(`   Final throughput: ${Math.round(this.metrics.metrics.messages.throughput)} msg/s`);
  }

  async testConcurrentSessions() {
    console.log('\n⚡ Testing Concurrent Session Handling...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      console.log('❌ No WebSocket connection available');
      return;
    }

    const maxConcurrent = Math.min(PERF_CONFIG.maxConcurrentSessions, 15);
    const concurrentSessions = [];
    
    console.log(`📊 Creating ${maxConcurrent} concurrent sessions...`);
    
    // Create sessions concurrently
    const creationPromises = [];
    for (let i = 0; i < maxConcurrent; i++) {
      const sessionId = `concurrent-${i}`;
      const workbranchId = PerformanceTestUtils.generateTestWorkbranchId();
      
      const promise = PerformanceTestUtils.sendMessageWithTiming(ws, {
        type: 'terminal-create',
        terminalId: sessionId,
        data: {
          workbranchId,
          projectId: `concurrent-project-${i}`,
          title: `Concurrent Session ${i}`,
          shell: 'powershell'
        }
      }).then(({ response, duration }) => {
        if (response.success) {
          concurrentSessions.push({
            terminalId: sessionId,
            sessionId: response.result.sessionId,
            workbranchId
          });
          this.metrics.recordSession('created', true, duration, sessionId);
          return { success: true, sessionId };
        } else {
          this.metrics.recordSession('created', false, 0, sessionId);
          return { success: false, sessionId };
        }
      }).catch(error => {
        this.metrics.recordSession('created', false, 0, sessionId);
        return { success: false, error: error.message };
      });
      
      creationPromises.push(promise);
    }
    
    const creationResults = await Promise.all(creationPromises);
    const successfulCreations = creationResults.filter(r => r.success).length;
    
    console.log(`✅ Created ${successfulCreations}/${maxConcurrent} concurrent sessions`);
    
    // Test concurrent command execution
    if (concurrentSessions.length > 0) {
      console.log(`📊 Testing concurrent command execution...`);
      
      const commandPromises = concurrentSessions.map((session, index) => {
        return PerformanceTestUtils.sendMessageWithTiming(ws, {
          type: 'terminal-command',
          terminalId: session.terminalId,
          data: { command: `echo "Concurrent command ${index}"` }
        }).then(({ response, duration }) => {
          this.metrics.recordMessage(response.success, duration);
          return { success: response.success, duration };
        }).catch(error => {
          this.metrics.recordMessage(false, 0);
          return { success: false, error: error.message };
        });
      });
      
      const commandResults = await Promise.all(commandPromises);
      const successfulCommands = commandResults.filter(r => r.success).length;
      
      console.log(`✅ Executed ${successfulCommands}/${concurrentSessions.length} concurrent commands`);
    }
    
    // Store sessions for cleanup
    concurrentSessions.forEach(session => {
      this.sessions.set(session.terminalId, session);
    });
  }

  async testSystemUnderStress() {
    console.log('\n🔥 Testing System Under Stress...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      console.log('❌ No WebSocket connection available');
      return;
    }

    const stressDuration = 20000; // 20 seconds
    const startTime = Date.now();
    let operationsPerformed = 0;
    
    console.log(`📊 Running stress test for ${stressDuration/1000} seconds...`);
    
    const stressTest = new Promise((resolve) => {
      const performOperation = async () => {
        if (Date.now() - startTime >= stressDuration) {
          resolve();
          return;
        }
        
        const operation = Math.random();
        
        try {
          if (operation < 0.3) {
            // Create session (30% of operations)
            const sessionId = `stress-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const workbranchId = PerformanceTestUtils.generateTestWorkbranchId();
            
            const { response } = await PerformanceTestUtils.sendMessageWithTiming(ws, {
              type: 'terminal-create',
              terminalId: sessionId,
              data: {
                workbranchId,
                projectId: 'stress-test',
                title: `Stress Test Session`,
                shell: 'powershell'
              }
            }, 3000);
            
            if (response.success) {
              this.sessions.set(sessionId, {
                terminalId: sessionId,
                sessionId: response.result.sessionId,
                workbranchId
              });
            }
            
          } else if (operation < 0.8 && this.sessions.size > 0) {
            // Send command (50% of operations)
            const sessions = Array.from(this.sessions.values());
            const randomSession = sessions[Math.floor(Math.random() * sessions.length)];
            
            await PerformanceTestUtils.sendMessageWithTiming(ws, {
              type: 'terminal-command',
              terminalId: randomSession.terminalId,
              data: { command: `echo "Stress test ${operationsPerformed}"` }
            }, 3000);
            
          } else if (this.sessions.size > 5) {
            // Destroy session (20% of operations, only if we have enough sessions)
            const sessions = Array.from(this.sessions.values());
            const randomSession = sessions[Math.floor(Math.random() * sessions.length)];
            
            const { response } = await PerformanceTestUtils.sendMessageWithTiming(ws, {
              type: 'terminal-destroy',
              id: randomSession.sessionId,
              data: { sessionId: randomSession.sessionId }
            }, 3000);
            
            if (response.success) {
              this.sessions.delete(randomSession.terminalId);
            }
          }
          
          operationsPerformed++;
          
          if (operationsPerformed % 100 === 0) {
            console.log(`📊 Performed ${operationsPerformed} operations, ${this.sessions.size} active sessions`);
          }
          
        } catch (error) {
          this.metrics.recordError(error, 'stress-test');
        }
        
        // Small delay to prevent overwhelming
        setTimeout(performOperation, 50 + Math.random() * 100);
      };
      
      performOperation();
    });
    
    await stressTest;
    
    console.log(`📊 Stress Test Results:`);
    console.log(`   Operations performed: ${operationsPerformed}`);
    console.log(`   Final active sessions: ${this.sessions.size}`);
    console.log(`   Operations per second: ${Math.round(operationsPerformed / (stressDuration / 1000))}`);
    console.log(`   Errors recorded: ${this.metrics.metrics.errors.length}`);
  }

  async testMemoryLeaks() {
    console.log('\n🧠 Testing Memory Leak Detection...');
    
    const initialMemory = process.memoryUsage();
    console.log(`📊 Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
    
    // Wait for memory to stabilize
    await PerformanceTestUtils.delay(5000);
    
    const finalMemory = process.memoryUsage();
    const memoryChange = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryChangeMB = Math.round(memoryChange / 1024 / 1024 * 100) / 100;
    
    console.log(`📊 Final memory usage: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    console.log(`📊 Memory change: ${memoryChangeMB}MB`);
    console.log(`📊 Peak memory: ${Math.round(this.metrics.metrics.memory.peak.heapUsed / 1024 / 1024)}MB`);
    
    // Consider test passed if memory increase is reasonable (< 50MB)
    const memoryLeakDetected = Math.abs(memoryChangeMB) > 50;
    if (memoryLeakDetected) {
      console.log('⚠️ Potential memory leak detected');
      this.metrics.recordError(new Error(`Excessive memory usage: ${memoryChangeMB}MB`), 'memory-leak');
    } else {
      console.log('✅ Memory usage within acceptable range');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up performance test resources...');
    
    const ws = this.connections.values().next().value;
    let cleanupCount = 0;
    
    if (ws) {
      // Clean up sessions
      for (const session of this.sessions.values()) {
        try {
          await PerformanceTestUtils.sendMessageWithTiming(ws, {
            type: 'terminal-destroy',
            id: session.sessionId,
            data: { sessionId: session.sessionId }
          }, 2000);
          cleanupCount++;
        } catch (error) {
          console.warn(`Failed to cleanup session ${session.sessionId}`);
        }
      }
    }
    
    // Close connections
    for (const connection of this.connections.values()) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    }
    
    console.log(`✅ Cleaned up ${cleanupCount} sessions and ${this.connections.size} connections`);
    
    this.sessions.clear();
    this.connections.clear();
  }

  generatePerformanceReport() {
    const report = this.metrics.generateReport();
    
    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('==========================');
    console.log(`Test Duration: ${Math.round(report.summary.testDuration / 1000)}s`);
    console.log('\n🔌 CONNECTION PERFORMANCE:');
    console.log(`  Total Connections: ${report.summary.totalConnections}`);
    console.log(`  Success Rate: ${report.summary.connectionSuccessRate}%`);
    console.log(`  Average Connection Time: ${report.summary.averageConnectionTime}ms`);
    
    console.log('\n🖥️ SESSION PERFORMANCE:');
    console.log(`  Total Sessions Created: ${report.summary.totalSessions}`);
    console.log(`  Max Concurrent Sessions: ${report.summary.maxConcurrentSessions}`);
    console.log(`  Average Creation Time: ${report.summary.averageSessionCreationTime}ms`);
    
    console.log('\n📡 MESSAGE PERFORMANCE:');
    console.log(`  Total Messages: ${report.summary.totalMessages}`);
    console.log(`  Success Rate: ${report.summary.messageSuccessRate}%`);
    console.log(`  Average Response Time: ${report.summary.averageResponseTime}ms`);
    console.log(`  Throughput: ${report.summary.throughput} msg/s`);
    
    console.log('\n🧠 MEMORY PERFORMANCE:');
    console.log(`  Peak Memory Usage: ${report.summary.peakMemoryMB}MB`);
    console.log(`  Average Memory Usage: ${report.summary.averageMemoryMB}MB`);
    
    console.log('\n❌ ERRORS:');
    console.log(`  Total Errors: ${report.summary.totalErrors}`);
    
    // Save detailed report
    const fs = require('fs');
    const reportPath = require('path').join(__dirname, 'terminal-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved: ${reportPath}`);
    
    // Performance analysis
    console.log('\n📈 PERFORMANCE ANALYSIS:');
    if (report.summary.connectionSuccessRate < 95) {
      console.log('⚠️ Connection success rate below 95% - investigate connection stability');
    }
    if (report.summary.averageConnectionTime > 1000) {
      console.log('⚠️ Average connection time over 1s - potential network or server issues');
    }
    if (report.summary.averageResponseTime > 500) {
      console.log('⚠️ Average response time over 500ms - potential performance bottleneck');
    }
    if (report.summary.throughput < 10) {
      console.log('⚠️ Throughput below 10 msg/s - system may be overloaded');
    }
    if (report.summary.totalErrors > report.summary.totalMessages * 0.05) {
      console.log('⚠️ Error rate above 5% - investigate error patterns');
    }
    
    return report;
  }
}

// Run performance tests if this file is executed directly
if (require.main === module) {
  const performanceTests = new TerminalPerformanceTests();
  
  process.on('SIGINT', async () => {
    console.log('\n⚠️ Performance tests interrupted, cleaning up...');
    await performanceTests.cleanup();
    performanceTests.metrics.stopProfiling();
    process.exit(1);
  });
  
  performanceTests.runPerformanceTests()
    .then(() => {
      console.log('🎉 Performance tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('🔥 Performance tests failed:', error);
      process.exit(1);
    });
}

module.exports = { TerminalPerformanceTests, PerformanceMetrics, PerformanceTestUtils };
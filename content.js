console.log('LinkedIn Connection Helper v3.1 loading...');

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE 1: CORE INFRASTRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Foundation classes that provide memory management, operation coordination,
 * and error handling infrastructure for the entire extension.
 */

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 1.1 ResourceManager - Memory Leak Prevention System                        │
// └─────────────────────────────────────────────────────────────────────────────┘
class ResourceManager {
  constructor() {
    this.listeners = new Set();
    this.observers = new Set();
    this.timers = new Set();
    this.cleanup = this.cleanup.bind(this);
    
    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', this.cleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cleanup();
    });
  }

  addListener(element, event, handler, options = {}) {
    const listenerData = { element, event, handler, options };
    element.addEventListener(event, handler, options);
    this.listeners.add(listenerData);
    return () => this.removeListener(listenerData);
  }

  removeListener(listenerData) {
    const { element, event, handler, options } = listenerData;
    element.removeEventListener(event, handler, options);
    this.listeners.delete(listenerData);
  }

  addObserver(observer, target, options) {
    observer.observe(target, options);
    this.observers.add(observer);
    return () => this.removeObserver(observer);
  }

  removeObserver(observer) {
    observer.disconnect();
    this.observers.delete(observer);
  }

  addTimer(timerId) {
    this.timers.add(timerId);
    return () => this.removeTimer(timerId);
  }

  removeTimer(timerId) {
    clearTimeout(timerId);
    this.timers.delete(timerId);
  }

  cleanup() {
    console.log('[LI Helper] Cleaning up resources...');
    
    // Remove all event listeners
    this.listeners.forEach(listenerData => {
      this.removeListener(listenerData);
    });
    
    // Disconnect all observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    
    // Clear all timers
    this.timers.forEach(timerId => {
      clearTimeout(timerId);
    });
    
    console.log(`[LI Helper] Cleaned up ${this.listeners.size + this.observers.size + this.timers.size} resources`);
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 1.2 ResilientElementFinder - Adaptive DOM Detection System                 │
// └─────────────────────────────────────────────────────────────────────────────┘
class ResilientElementFinder {
  constructor(resourceManager) {
    this.resourceManager = resourceManager;
    this.selectorCache = new Map(); // Cache successful selectors
    this.failureLog = new Map(); // Track failed selectors
    this.adaptiveStrategies = new Map(); // Learning strategies
    this.debug = true;
    
    // Initialize strategy success rates
    this.strategyStats = {
      'primary': { success: 0, attempts: 0 },
      'fallback': { success: 0, attempts: 0 },
      'semantic': { success: 0, attempts: 0 },
      'structural': { success: 0, attempts: 0 }
    };
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[Resilient Finder] ${message}`, data || '');
    }
  }

  // Main method - finds elements with resilience strategies
  async findElement(elementConfig, options = {}) {
    const { 
      maxAttempts = 15, 
      delay = 200, 
      timeout = 3000,
      validator = () => true 
    } = options;

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(elementConfig);
    
    // Try cached successful selector first
    const cachedResult = await this.tryCachedSelector(cacheKey, validator);
    if (cachedResult) {
      this.log(`✓ Found using cached selector: ${cachedResult.selector}`);
      return cachedResult;
    }

    // Get ordered strategies based on success rates
    const strategies = this.getOrderedStrategies(elementConfig);
    
    return new Promise((resolve) => {
      let attempts = 0;
      
      const tryStrategies = async () => {
        attempts++;
        
        for (const strategy of strategies) {
          try {
            this.strategyStats[strategy.type].attempts++;
            
            const result = await this.executeStrategy(strategy, validator);
            if (result) {
              this.strategyStats[strategy.type].success++;
              this.cacheSuccessfulSelector(cacheKey, result);
              
              this.log(`✓ Found using ${strategy.type} strategy: ${result.selector}`);
              return resolve(result);
            }
          } catch (error) {
            this.log(`Strategy ${strategy.type} failed:`, error.message);
            this.recordFailure(strategy, error);
          }
        }
        
        // Retry if not found and time/attempts remaining
        const elapsed = Date.now() - startTime;
        if (attempts < maxAttempts && elapsed < timeout) {
          const timeoutId = setTimeout(tryStrategies, delay);
          this.resourceManager.addTimer(timeoutId);
        } else {
          this.log(`✗ Element not found after ${attempts} attempts (${elapsed}ms)`);
          this.recordElementNotFound(elementConfig, strategies);
          resolve(null);
        }
      };
      
      tryStrategies();
    });
  }

  // Generate cache key from element configuration
  generateCacheKey(config) {
    return `${config.type}_${config.purpose || 'default'}`;
  }

  // Try cached selector if available
  async tryCachedSelector(cacheKey, validator) {
    const cached = this.selectorCache.get(cacheKey);
    if (!cached) return null;
    
    try {
      const element = document.querySelector(cached.selector);
      if (element && validator(element)) {
        cached.hits++;
        return { element, selector: cached.selector, strategy: 'cached' };
      } else {
        // Cached selector failed, remove it
        this.selectorCache.delete(cacheKey);
        this.log(`Cached selector failed, removed: ${cached.selector}`);
      }
    } catch (error) {
      this.selectorCache.delete(cacheKey);
    }
    
    return null;
  }

  // Get strategies ordered by success rate
  getOrderedStrategies(config) {
    const strategies = this.buildStrategies(config);
    
    // Sort by success rate (success/attempts ratio)
    return strategies.sort((a, b) => {
      const aRate = this.strategyStats[a.type].attempts > 0 
        ? this.strategyStats[a.type].success / this.strategyStats[a.type].attempts 
        : 0.5;
      const bRate = this.strategyStats[b.type].attempts > 0 
        ? this.strategyStats[b.type].success / this.strategyStats[b.type].attempts 
        : 0.5;
      
      return bRate - aRate; // Higher success rate first
    });
  }

  // Build strategies for different element types
  buildStrategies(config) {
    const strategies = [];
    
    switch (config.type) {
      case 'addNoteButton':
        strategies.push(
          {
            type: 'primary',
            selectors: [
              'button[aria-label="Add a note"]',
              'button[data-test-modal-add-note-btn]',
              '[data-test*="add-note"] button'
            ]
          },
          {
            type: 'semantic',
            selectors: [
              'button:contains("Add a note")',
              'button[aria-label*="note"]',
              '[role="button"]:contains("Add a note")'
            ]
          },
          {
            type: 'structural',
            selectors: [
              '.artdeco-modal button[aria-label*="note"]',
              '[role="dialog"] button:contains("Add")',
              '.send-invite button'
            ]
          },
          {
            type: 'fallback',
            selectors: ['button'],
            validator: (el) => el.textContent?.trim() === 'Add a note'
          }
        );
        break;
        
      case 'nameElement':
        strategies.push(
          {
            type: 'primary',
            selectors: [
              '.send-invite__title',
              '.artdeco-modal__header h1',
              '.artdeco-modal__header h2'
            ]
          },
          {
            type: 'semantic',
            selectors: [
              '.artdeco-modal h1:first-child',
              '.artdeco-modal h2:first-child',
              '[data-test-modal-title]'
            ]
          },
          {
            type: 'structural',
            selectors: [
              '.artdeco-modal strong',
              '[role="dialog"] strong',
              '.invitation-card__title'
            ]
          },
          {
            type: 'fallback',
            selectors: ['h1', 'h2', 'strong'],
            validator: (el) => this.isValidName(el.textContent?.trim())
          }
        );
        break;
        
      case 'messageTextarea':
        strategies.push(
          {
            type: 'primary',
            selectors: [
              'textarea[name="message"]',
              '#custom-message',
              'textarea[id*="message"]'
            ]
          },
          {
            type: 'semantic',
            selectors: [
              '.send-invite__custom-message textarea',
              '.artdeco-modal textarea',
              '[role="dialog"] textarea'
            ]
          },
          {
            type: 'structural',
            selectors: [
              '.artdeco-modal textarea',
              '[data-test*="message"] textarea'
            ]
          },
          {
            type: 'fallback',
            selectors: ['textarea'],
            validator: (el) => {
              const modal = el.closest('.artdeco-modal') || el.closest('[role="dialog"]');
              return modal !== null && !el.disabled;
            }
          }
        );
        break;
    }
    
    return strategies;
  }

  // Execute a specific strategy
  async executeStrategy(strategy, validator) {
    for (const selector of strategy.selectors) {
      try {
        const element = this.findElementWithCustomSelectors(selector, strategy);
        if (element && validator(element) && (!strategy.validator || strategy.validator(element))) {
          return { element, selector, strategy: strategy.type };
        }
      } catch (error) {
        this.log(`Selector failed: ${selector}`, error.message);
      }
    }
    return null;
  }

  // Enhanced element finding with custom pseudo-selectors
  findElementWithCustomSelectors(selector, strategy) {
    // Handle :contains() pseudo-selector
    if (selector.includes(':contains(')) {
      return this.findByContainsText(selector);
    }
    
    // Standard querySelector
    return document.querySelector(selector);
  }

  // Custom :contains() implementation
  findByContainsText(selector) {
    const match = selector.match(/^(.+):contains\("([^"]+)"\)$/);
    if (!match) return null;
    
    const [, baseSelector, text] = match;
    const elements = document.querySelectorAll(baseSelector || '*');
    
    for (const element of elements) {
      if (element.textContent?.includes(text)) {
        return element;
      }
    }
    
    return null;
  }

  // Validate if text looks like a person's name
  isValidName(text) {
    if (!text || text.length < 2 || text.length > 50) return false;
    
    const excludeWords = ['add', 'note', 'connect', 'invite', 'send', 'message', 'save', 'cancel', 'close'];
    const isExcluded = excludeWords.some(word => text.toLowerCase().includes(word));
    
    return !isExcluded && 
           /^[A-Za-z\s\.\-']{2,}$/.test(text) && 
           text.split(' ').length <= 4 &&
           !text.includes('@');
  }

  // Cache successful selector
  cacheSuccessfulSelector(cacheKey, result) {
    this.selectorCache.set(cacheKey, {
      selector: result.selector,
      strategy: result.strategy,
      timestamp: Date.now(),
      hits: 1
    });
    
    this.log(`Cached successful selector: ${result.selector}`);
  }

  // Record strategy failure
  recordFailure(strategy, error) {
    const key = `${strategy.type}_${strategy.selectors.join(',')}`;
    if (!this.failureLog.has(key)) {
      this.failureLog.set(key, []);
    }
    
    this.failureLog.get(key).push({
      error: error.message,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  // Record element not found
  recordElementNotFound(config, strategies) {
    this.log(`Element not found: ${config.type}`, {
      strategies: strategies.map(s => s.type),
      strategyStats: this.strategyStats,
      cacheSize: this.selectorCache.size,
      failures: this.failureLog.size
    });
  }

  // Get performance statistics
  getStats() {
    const stats = {
      strategies: { ...this.strategyStats },
      cache: {
        size: this.selectorCache.size,
        entries: Array.from(this.selectorCache.entries()).map(([key, value]) => ({
          key,
          selector: value.selector,
          hits: value.hits,
          age: Date.now() - value.timestamp
        }))
      },
      failures: this.failureLog.size
    };
    
    // Calculate success rates
    Object.keys(stats.strategies).forEach(strategy => {
      const stat = stats.strategies[strategy];
      stat.successRate = stat.attempts > 0 ? (stat.success / stat.attempts * 100).toFixed(1) + '%' : '0%';
    });
    
    return stats;
  }

  // Clear cache and reset stats (for testing)
  reset() {
    this.selectorCache.clear();
    this.failureLog.clear();
    Object.keys(this.strategyStats).forEach(key => {
      this.strategyStats[key] = { success: 0, attempts: 0 };
    });
    this.log('Reset selector cache and statistics');
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 1.3 OperationQueue - Race Condition Prevention System                     │
// └─────────────────────────────────────────────────────────────────────────────┘
class OperationQueue {
  constructor(resourceManager) {
    this.resourceManager = resourceManager;
    this.queue = [];
    this.isProcessing = false;
    this.activeOperations = new Map();
    this.operationHistory = [];
    this.maxHistorySize = 100;
    this.debug = true;
    
    // Operation types and their priorities
    this.operationPriorities = {
      'connect_button_click': 10,
      'modal_detection': 8,
      'textarea_detection': 6,
      'message_insertion': 4,
      'cleanup': 2
    };
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 8000,  // 8 seconds max
      backoffMultiplier: 2
    };
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[Operation Queue] ${message}`, data || '');
    }
  }

  // Add operation to queue with priority and retry logic
  async enqueue(operationType, operation, options = {}) {
    const {
      priority = this.operationPriorities[operationType] || 5,
      timeout = 10000,
      retryable = true,
      onRetry = null,
      onSuccess = null,
      onFailure = null,
      metadata = {}
    } = options;

    const operationId = this.generateOperationId();
    
    const queuedOperation = {
      id: operationId,
      type: operationType,
      operation,
      priority,
      timeout,
      retryable,
      attempts: 0,
      maxRetries: this.retryConfig.maxRetries,
      onRetry,
      onSuccess,
      onFailure,
      metadata,
      createdAt: Date.now(),
      status: 'queued'
    };

    // Insert operation in priority order
    const insertIndex = this.queue.findIndex(op => op.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(queuedOperation);
    } else {
      this.queue.splice(insertIndex, 0, queuedOperation);
    }

    this.log(`Queued operation ${operationType} (ID: ${operationId}) with priority ${priority}`);
    
    // Start processing if not already running
    this.processQueue();
    
    // Return a promise that resolves when this specific operation completes
    return new Promise((resolve, reject) => {
      queuedOperation.resolve = resolve;
      queuedOperation.reject = reject;
    });
  }

  // Process the queue
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.log(`Processing queue with ${this.queue.length} operations`);

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      await this.executeOperation(operation);
    }

    this.isProcessing = false;
    this.log('Queue processing complete');
  }

  // Execute a single operation with retry logic
  async executeOperation(operation) {
    const { id, type, operation: operationFn, timeout, retryable, maxRetries } = operation;
    
    operation.status = 'executing';
    operation.startedAt = Date.now();
    this.activeOperations.set(id, operation);
    
    this.log(`Executing operation ${type} (ID: ${id}), attempt ${operation.attempts + 1}`);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation ${type} timed out after ${timeout}ms`));
        }, timeout);
        
        // Register timeout for cleanup
        this.resourceManager.addTimer(timeoutId);
      });

      // Race between operation and timeout
      const result = await Promise.race([
        operationFn(),
        timeoutPromise
      ]);

      // Operation succeeded
      operation.status = 'completed';
      operation.completedAt = Date.now();
      operation.result = result;
      
      this.activeOperations.delete(id);
      this.addToHistory(operation);
      
      this.log(`✓ Operation ${type} (ID: ${id}) completed successfully in ${operation.completedAt - operation.startedAt}ms`);
      
      // Call success callback
      if (operation.onSuccess) {
        try {
          await operation.onSuccess(result);
        } catch (callbackError) {
          this.log(`Success callback error for ${type}:`, callbackError);
        }
      }
      
      // Resolve the promise
      if (operation.resolve) {
        operation.resolve(result);
      }
      
    } catch (error) {
      operation.attempts++;
      operation.lastError = error;
      
      this.log(`✗ Operation ${type} (ID: ${id}) failed:`, error.message);
      
      // Check if we should retry
      if (retryable && operation.attempts < maxRetries) {
        const delay = this.calculateRetryDelay(operation.attempts);
        operation.status = 'retrying';
        
        this.log(`Retrying operation ${type} (ID: ${id}) in ${delay}ms (attempt ${operation.attempts + 1}/${maxRetries})`);
        
        // Call retry callback
        if (operation.onRetry) {
          try {
            await operation.onRetry(error, operation.attempts);
          } catch (callbackError) {
            this.log(`Retry callback error for ${type}:`, callbackError);
          }
        }
        
        // Schedule retry
        const retryTimeoutId = setTimeout(() => {
          this.queue.unshift(operation); // Put back at front
          this.processQueue();
        }, delay);
        
        this.resourceManager.addTimer(retryTimeoutId);
        
      } else {
        // Max retries reached or not retryable
        operation.status = 'failed';
        operation.completedAt = Date.now();
        
        this.activeOperations.delete(id);
        this.addToHistory(operation);
        
        this.log(`✗ Operation ${type} (ID: ${id}) failed permanently after ${operation.attempts} attempts`);
        
        // Call failure callback
        if (operation.onFailure) {
          try {
            await operation.onFailure(error);
          } catch (callbackError) {
            this.log(`Failure callback error for ${type}:`, callbackError);
          }
        }
        
        // Reject the promise
        if (operation.reject) {
          operation.reject(error);
        }
      }
    }
  }

  // Calculate exponential backoff delay
  calculateRetryDelay(attempt) {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  // Generate unique operation ID
  generateOperationId() {
    return 'op_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Add operation to history
  addToHistory(operation) {
    this.operationHistory.push({
      id: operation.id,
      type: operation.type,
      status: operation.status,
      attempts: operation.attempts,
      duration: operation.completedAt - operation.startedAt,
      error: operation.lastError?.message,
      createdAt: operation.createdAt,
      completedAt: operation.completedAt
    });
    
    // Keep history size manageable
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }
  }

  // Cancel all pending operations
  cancelAll() {
    this.log(`Cancelling ${this.queue.length} pending operations`);
    
    // Reject all pending operations
    this.queue.forEach(operation => {
      if (operation.reject) {
        operation.reject(new Error('Operation cancelled'));
      }
    });
    
    this.queue = [];
    this.log('All pending operations cancelled');
  }

  // Get queue statistics
  getStats() {
    const stats = {
      queue: {
        pending: this.queue.length,
        processing: this.isProcessing,
        active: this.activeOperations.size
      },
      history: {
        total: this.operationHistory.length,
        completed: this.operationHistory.filter(op => op.status === 'completed').length,
        failed: this.operationHistory.filter(op => op.status === 'failed').length,
        averageDuration: this.getAverageDuration()
      },
      operations: this.getOperationTypeStats()
    };
    
    return stats;
  }

  // Get average operation duration
  getAverageDuration() {
    const completedOps = this.operationHistory.filter(op => op.status === 'completed' && op.duration);
    if (completedOps.length === 0) return 0;
    
    const totalDuration = completedOps.reduce((sum, op) => sum + op.duration, 0);
    return Math.round(totalDuration / completedOps.length);
  }

  // Get statistics by operation type
  getOperationTypeStats() {
    const typeStats = {};
    
    this.operationHistory.forEach(op => {
      if (!typeStats[op.type]) {
        typeStats[op.type] = { total: 0, completed: 0, failed: 0, avgDuration: 0 };
      }
      
      typeStats[op.type].total++;
      if (op.status === 'completed') {
        typeStats[op.type].completed++;
      } else if (op.status === 'failed') {
        typeStats[op.type].failed++;
      }
    });
    
    // Calculate success rates and average durations
    Object.keys(typeStats).forEach(type => {
      const stats = typeStats[type];
      stats.successRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) + '%' : '0%';
      
      const completedOpsOfType = this.operationHistory.filter(op => 
        op.type === type && op.status === 'completed' && op.duration
      );
      
      if (completedOpsOfType.length > 0) {
        const totalDuration = completedOpsOfType.reduce((sum, op) => sum + op.duration, 0);
        stats.avgDuration = Math.round(totalDuration / completedOpsOfType.length);
      }
    });
    
    return typeStats;
  }

  // Clear history
  clearHistory() {
    this.operationHistory = [];
    this.log('Operation history cleared');
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 1.4 ErrorBoundary - Circuit Breaker & Fallback System                     │
// └─────────────────────────────────────────────────────────────────────────────┘
class ErrorBoundary {
  constructor(errorReporter, resourceManager) {
    this.errorReporter = errorReporter;
    this.resourceManager = resourceManager;
    this.circuitBreakers = new Map();
    this.fallbackStrategies = new Map();
    this.recoveryStrategies = new Map();
    this.debug = true;
    
    // Global error boundary configuration
    this.config = {
      circuitBreaker: {
        failureThreshold: 3,      // Open circuit after 3 failures
        timeout: 30000,           // 30 second timeout in OPEN state
        monitoringPeriod: 60000,  // 1 minute monitoring window
        successThreshold: 2       // Close circuit after 2 successes in HALF_OPEN
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      degradation: {
        enableGracefulDegradation: true,
        fallbackTimeout: 5000,
        userNotificationDelay: 2000
      }
    };
    
    // Circuit breaker states
    this.CIRCUIT_STATES = {
      CLOSED: 'CLOSED',     // Normal operation
      OPEN: 'OPEN',         // Prevent calls, return fallback
      HALF_OPEN: 'HALF_OPEN' // Test if service recovered
    };
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[Error Boundary] ${message}`, data || '');
    }
  }

  // Main error boundary wrapper - protects any async operation
  async protect(operationName, operation, options = {}) {
    const {
      fallbackStrategy = null,
      recoveryStrategy = null,
      enableCircuitBreaker = true,
      enableRetry = true,
      enableGracefulDegradation = true,
      userFriendlyName = operationName,
      criticalOperation = false,
      timeout = 10000,
      metadata = {}
    } = options;

    // Register strategies if provided
    if (fallbackStrategy) {
      this.fallbackStrategies.set(operationName, fallbackStrategy);
    }
    if (recoveryStrategy) {
      this.recoveryStrategies.set(operationName, recoveryStrategy);
    }

    // Check circuit breaker state
    if (enableCircuitBreaker && this.isCircuitOpen(operationName)) {
      this.log(`Circuit breaker OPEN for ${operationName}, using fallback`);
      return this.executeFallback(operationName, new Error('Circuit breaker open'), metadata);
    }

    try {
      // Create timeout wrapper
      const result = await this.executeWithTimeout(operation, timeout, operationName);
      
      // Success - record for circuit breaker
      if (enableCircuitBreaker) {
        this.recordSuccess(operationName);
      }
      
      this.log(`✓ Operation ${operationName} completed successfully`);
      return result;
      
    } catch (error) {
      this.log(`✗ Operation ${operationName} failed:`, error.message);
      
      // Record failure for circuit breaker
      if (enableCircuitBreaker) {
        this.recordFailure(operationName, error);
      }
      
      // Try retry logic if enabled
      if (enableRetry) {
        try {
          const retryResult = await this.executeWithRetry(operationName, operation, error, timeout);
          this.log(`✓ Operation ${operationName} succeeded on retry`);
          return retryResult;
        } catch (retryError) {
          error = retryError; // Use the latest error
        }
      }
      
      // Execute recovery strategy if available
      if (this.recoveryStrategies.has(operationName)) {
        try {
          await this.executeRecovery(operationName, error, metadata);
        } catch (recoveryError) {
          this.log(`Recovery strategy failed for ${operationName}:`, recoveryError.message);
        }
      }
      
      // Use fallback if graceful degradation is enabled
      if (enableGracefulDegradation) {
        return this.executeFallback(operationName, error, metadata);
      }
      
      // If this is a critical operation, escalate the error
      if (criticalOperation) {
        this.escalateCriticalError(operationName, error, userFriendlyName);
      }
      
      // Re-throw if no fallback available
      throw error;
    }
  }

  // Execute operation with timeout
  async executeWithTimeout(operation, timeout, operationName) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`));
      }, timeout);
      
      // Register timeout for cleanup
      this.resourceManager.addTimer(timeoutId);
      
      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Execute operation with retry logic
  async executeWithRetry(operationName, operation, lastError, timeout) {
    const retryConfig = this.config.retry;
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );
      
      this.log(`Retrying ${operationName}, attempt ${attempt}/${retryConfig.maxRetries} after ${delay}ms`);
      
      // Wait before retry
      await new Promise(resolve => {
        const retryTimeoutId = setTimeout(resolve, delay);
        this.resourceManager.addTimer(retryTimeoutId);
      });
      
      try {
        return await this.executeWithTimeout(operation, timeout, operationName);
      } catch (error) {
        lastError = error;
        this.log(`Retry ${attempt} failed for ${operationName}:`, error.message);
        
        // If this was the last attempt, record the failure
        if (attempt === retryConfig.maxRetries) {
          this.errorReporter.logError('RETRY_EXHAUSTED', 
            `All retries exhausted for ${operationName}`, {
              attempts: attempt,
              lastError: error.message,
              operationName
            });
        }
      }
    }
    
    throw lastError;
  }

  // Execute fallback strategy
  async executeFallback(operationName, error, metadata = {}) {
    if (!this.fallbackStrategies.has(operationName)) {
      this.log(`No fallback strategy for ${operationName}, showing user error`);
      
      // Default user notification
      const userMessage = this.generateUserFriendlyError(operationName, error);
      this.showDegradedServiceNotification(userMessage.message, userMessage.suggestions);
      
      return null;
    }
    
    try {
      this.log(`Executing fallback strategy for ${operationName}`);
      const fallbackFn = this.fallbackStrategies.get(operationName);
      const result = await fallbackFn(error, metadata);
      
      this.log(`✓ Fallback strategy succeeded for ${operationName}`);
      return result;
      
    } catch (fallbackError) {
      this.log(`✗ Fallback strategy failed for ${operationName}:`, fallbackError.message);
      
      // Final fallback - show user error
      const userMessage = this.generateUserFriendlyError(operationName, error);
      this.showDegradedServiceNotification(userMessage.message, userMessage.suggestions);
      
      return null;
    }
  }

  // Execute recovery strategy
  async executeRecovery(operationName, error, metadata = {}) {
    const recoveryFn = this.recoveryStrategies.get(operationName);
    this.log(`Executing recovery strategy for ${operationName}`);
    
    try {
      await recoveryFn(error, metadata);
      this.log(`✓ Recovery strategy completed for ${operationName}`);
    } catch (recoveryError) {
      this.log(`✗ Recovery strategy failed for ${operationName}:`, recoveryError.message);
      throw recoveryError;
    }
  }

  // Circuit breaker management
  isCircuitOpen(operationName) {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;
    
    const now = Date.now();
    
    // If circuit is OPEN, check if timeout has passed
    if (breaker.state === this.CIRCUIT_STATES.OPEN) {
      if (now - breaker.lastFailureTime > this.config.circuitBreaker.timeout) {
        // Move to HALF_OPEN state
        breaker.state = this.CIRCUIT_STATES.HALF_OPEN;
        breaker.consecutiveSuccesses = 0;
        this.log(`Circuit breaker for ${operationName} moved to HALF_OPEN state`);
        return false;
      }
      return true;
    }
    
    return false;
  }

  recordSuccess(operationName) {
    let breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      breaker = this.createCircuitBreaker(operationName);
    }
    
    breaker.consecutiveFailures = 0;
    breaker.lastSuccessTime = Date.now();
    
    // If in HALF_OPEN state, count consecutive successes
    if (breaker.state === this.CIRCUIT_STATES.HALF_OPEN) {
      breaker.consecutiveSuccesses++;
      
      if (breaker.consecutiveSuccesses >= this.config.circuitBreaker.successThreshold) {
        // Close the circuit
        breaker.state = this.CIRCUIT_STATES.CLOSED;
        this.log(`Circuit breaker for ${operationName} CLOSED after successful recovery`);
      }
    }
    
    this.circuitBreakers.set(operationName, breaker);
  }

  recordFailure(operationName, error) {
    let breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      breaker = this.createCircuitBreaker(operationName);
    }
    
    breaker.consecutiveFailures++;
    breaker.lastFailureTime = Date.now();
    breaker.lastError = error.message;
    
    // Check if we should open the circuit
    if (breaker.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
      breaker.state = this.CIRCUIT_STATES.OPEN;
      this.log(`Circuit breaker for ${operationName} OPENED after ${breaker.consecutiveFailures} failures`);
    }
    
    this.circuitBreakers.set(operationName, breaker);
  }

  createCircuitBreaker(operationName) {
    return {
      operationName,
      state: this.CIRCUIT_STATES.CLOSED,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      lastError: null,
      createdAt: Date.now()
    };
  }

  // User-friendly error handling
  generateUserFriendlyError(operationName, error) {
    const errorMappings = {
      'connect_button_click': {
        message: '⚠️ Unable to process Connect button. LinkedIn may have updated their interface.',
        suggestions: ['Try refreshing the page', 'Click the Connect button manually', 'Check if you\'re logged into LinkedIn']
      },
      'modal_detection': {
        message: '⚠️ Connection dialog not found. The page may still be loading.',
        suggestions: ['Wait a moment and try again', 'Refresh the page', 'Check your internet connection']
      },
      'textarea_detection': {
        message: '⚠️ Message box not found after clicking "Add a note".',
        suggestions: ['Click "Add a note" manually', 'Wait for the dialog to load completely', 'Try a different LinkedIn profile']
      },
      'message_insertion': {
        message: '⚠️ Unable to insert message. You can type manually.',
        suggestions: ['Type your message manually', 'Check if the message box is active', 'Try clicking in the message area first']
      },
      'name_detection': {
        message: '⚠️ Could not detect the person\'s name automatically.',
        suggestions: ['Enter the name manually when prompted', 'Check if the profile page is fully loaded', 'Try refreshing the profile']
      }
    };
    
    return errorMappings[operationName] || {
      message: `⚠️ Operation failed: ${operationName}. Extension will continue working.`,
      suggestions: ['Try refreshing the page', 'Check browser console for details', 'Report this issue if it persists']
    };
  }

  showDegradedServiceNotification(message, suggestions = []) {
    // Show immediate notification
    this.errorReporter.showUserError(message, 'warning', suggestions);
    
    // Log degraded service state
    this.errorReporter.logError('DEGRADED_SERVICE', 
      'Extension operating in degraded mode', {
        userMessage: message,
        suggestions,
        timestamp: Date.now()
      });
  }

  escalateCriticalError(operationName, error, userFriendlyName) {
    this.log(`🚨 CRITICAL ERROR in ${operationName}:`, error.message);
    
    // Log critical error
    this.errorReporter.logError('CRITICAL', 
      `Critical operation ${operationName} failed`, {
        operationName,
        userFriendlyName,
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        url: window.location.href
      });
    
    // Show critical error notification
    this.errorReporter.showUserError(
      `🚨 Critical error in ${userFriendlyName}. Extension may need to reload.`,
      'error',
      ['Refresh the page', 'Reload the extension', 'Check browser console for details']
    );
  }

  // Get circuit breaker statistics
  getCircuitBreakerStats() {
    const stats = {};
    
    this.circuitBreakers.forEach((breaker, operationName) => {
      stats[operationName] = {
        state: breaker.state,
        consecutiveFailures: breaker.consecutiveFailures,
        consecutiveSuccesses: breaker.consecutiveSuccesses,
        lastFailureTime: breaker.lastFailureTime,
        lastSuccessTime: breaker.lastSuccessTime,
        lastError: breaker.lastError,
        uptime: this.calculateUptime(breaker)
      };
    });
    
    return stats;
  }

  calculateUptime(breaker) {
    const now = Date.now();
    const totalTime = now - breaker.createdAt;
    
    if (totalTime === 0) return 100;
    
    // Estimate downtime based on circuit open states
    let downtime = 0;
    if (breaker.state === this.CIRCUIT_STATES.OPEN && breaker.lastFailureTime) {
      downtime = now - breaker.lastFailureTime;
    }
    
    return Math.max(0, ((totalTime - downtime) / totalTime * 100)).toFixed(2);
  }

  // Reset circuit breaker for specific operation
  resetCircuitBreaker(operationName) {
    if (this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.delete(operationName);
      this.log(`Circuit breaker reset for ${operationName}`);
    }
  }

  // Reset all circuit breakers
  resetAllCircuitBreakers() {
    const count = this.circuitBreakers.size;
    this.circuitBreakers.clear();
    this.log(`All ${count} circuit breakers reset`);
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE 2: DOM LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * LinkedIn-specific DOM interaction classes that handle element detection,
 * data extraction, and UI manipulation with resilience against page changes.
 */

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 2.1 LinkedInElementFinder - LinkedIn-Specific DOM Operations               │
// └─────────────────────────────────────────────────────────────────────────────┘
class LinkedInElementFinder {
  constructor(resourceManager = null) {
    this.debug = true;
    this.retryAttempts = 15;
    this.retryDelay = 200;
    this.errorReporter = new ErrorReporter();
    this.resourceManager = resourceManager; // Store reference for cleanup
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[LI Helper] ${message}`, data || '');
    }
  }

  // Robust element detection with multiple strategies and retry logic
  async findElementWithRetry(selectorGroups, options = {}) {
    const maxAttempts = options.maxAttempts || this.retryAttempts;
    const delay = options.delay || this.retryDelay;
    const validator = options.validator || (() => true);
    
    return new Promise((resolve) => {
      let attempts = 0;
      
      const tryFind = () => {
        attempts++;
        this.log(`Attempt ${attempts}/${maxAttempts} to find element`);
        
        // Try each selector group
        for (const group of selectorGroups) {
          const { selectors, name, validator: groupValidator } = group;
          
          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element && validator(element) && (groupValidator ? groupValidator(element) : true)) {
                this.log(`✓ Found element using ${name}: "${selector}"`);
                return resolve({ element, selector, strategy: name });
              }
            } catch (e) {
              this.log(`Error with selector "${selector}":`, e.message);
              // Log error for debugging
              this.errorReporter.logError('WARNING', 'Selector error', {
                selector,
                error: e.message,
                strategy: name
              });
            }
          }
        }
        
        // If not found and attempts remaining, retry
        if (attempts < maxAttempts) {
          const retryTimeoutId = setTimeout(tryFind, delay);
          // Register timeout for cleanup if resourceManager is available
          if (this.resourceManager) {
            this.resourceManager.addTimer(retryTimeoutId);
          }
        } else {
          this.log(`✗ Element not found after ${maxAttempts} attempts`);
          // Log element not found error
          const attempted_selectors = selectorGroups.flatMap(group => group.selectors);
          this.errorReporter.logElementNotFound('element', attempted_selectors, { selectorGroups });
          resolve(null);
        }
      };
      
      tryFind();
    });
  }

  // Specific finder methods for different LinkedIn elements - Now using Resilient Finder
  async findAddNoteButton() {
    this.log('🔍 Finding Add Note button using resilient strategies...');
    
    const result = await resilientFinder.findElement(
      { type: 'addNoteButton' },
      { 
        validator: (el) => {
          return el.textContent?.includes('Add a note') || 
                 el.getAttribute('aria-label')?.includes('Add a note') ||
                 el.textContent?.trim() === 'Add a note';
        }
      }
    );

    if (!result) {
      this.errorReporter.logElementNotFound('button', ['resilient-strategies'], { 
        buttonType: 'Add a note',
        resilientStats: resilientFinder.getStats()
      });
    } else {
      this.log(`✓ Found Add Note button via ${result.strategy}: ${result.selector}`);
    }
    
    return result;
  }

  async findNameElement() {
    this.log('🔍 Finding name element using resilient strategies...');
    
    const result = await resilientFinder.findElement(
      { type: 'nameElement' },
      { 
        validator: (el) => {
          const text = el.textContent?.trim();
          if (!text) return false;
          
          // Enhanced name validation with resilient finder's isValidName
          return resilientFinder.isValidName(text);
        }
      }
    );

    if (!result) {
      // Enhanced debugging: log what text elements we found
      const debugInfo = {
        modalPresent: !!document.querySelector('.artdeco-modal'),
        resilientStats: resilientFinder.getStats(),
        allModalText: [],
        allStrongText: [],
        allHeadings: []
      };
      
      // Get all text from modal for debugging
      const modal = document.querySelector('.artdeco-modal') || document.querySelector('[role="dialog"]');
      if (modal) {
        debugInfo.allModalText = Array.from(modal.querySelectorAll('*')).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim(),
          classes: el.className
        })).filter(item => item.text && item.text.length > 1 && item.text.length < 100);
        
        debugInfo.allStrongText = Array.from(modal.querySelectorAll('strong')).map(el => el.textContent?.trim()).filter(Boolean);
        debugInfo.allHeadings = Array.from(modal.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim()).filter(Boolean);
      }
      
      this.errorReporter.logElementNotFound('name', ['resilient-strategies'], debugInfo);
      this.log('Name detection debug info:', debugInfo);
    } else {
      this.log(`✓ Found name element via ${result.strategy}: "${result.element.textContent?.trim()}" using ${result.selector}`);
    }
    
    return result;
  }

  async findMessageTextarea() {
    this.log('🔍 Finding message textarea using resilient strategies...');
    
    const result = await resilientFinder.findElement(
      { type: 'messageTextarea' },
      { 
        validator: (el) => {
          // Must be a textarea element
          if (el.tagName !== 'TEXTAREA') return false;
          
          // Must not be disabled
          if (el.disabled) return false;
          
          // Must be within a modal
          const modal = el.closest('.artdeco-modal') || el.closest('[role="dialog"]');
          return modal !== null;
        }
      }
    );

    if (!result) {
      this.errorReporter.logElementNotFound('textarea', ['resilient-strategies'], { 
        modalPresent: !!document.querySelector('.artdeco-modal'),
        addNoteClicked: true,
        resilientStats: resilientFinder.getStats(),
        availableTextareas: Array.from(document.querySelectorAll('textarea')).map(t => ({
          name: t.name,
          id: t.id,
          disabled: t.disabled,
          inModal: !!(t.closest('.artdeco-modal') || t.closest('[role="dialog"]'))
        }))
      });
    } else {
      this.log(`✓ Found message textarea via ${result.strategy}: ${result.selector}`);
    }
    
    return result;
  }

  async findProfileContext() {
    const selectorGroups = [
      {
        name: 'Modal Subtitle Info',
        selectors: [
          '.artdeco-modal__header + div',
          '.send-invite__subtitle', 
          '.artdeco-modal [class*="subtitle"]',
          '.pv-text-details__left-panel .text-body-small'
        ],
        validator: (el) => {
          const text = el.textContent?.trim();
          return text && (text.includes(' at ') || text.includes('•') || text.length > 10);
        }
      },
      {
        name: 'Profile Card Elements',
        selectors: [
          '.pv-entity__summary-info',
          '.pv-top-card-v3__summary-info',
          '.profile-topcard__summary-info'
        ],
        validator: (el) => el.textContent?.trim().length > 0
      }
    ];

    return this.findElementWithRetry(selectorGroups, { maxAttempts: 5 });
  }

  // NEW: Extract additional profile data for template variables
  async extractAdditionalProfileData() {
    this.log('Extracting additional profile data for templates...');
    
    const data = {};
    
    // Extract headline
    try {
      const headlineSelectors = [
        '.text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        '.ph5.pb5 .text-body-medium',
        '[class*="headline"]',
        '.pv-top-card-v3__headline',
        '.top-card-layout__headline'
      ];

      for (const selector of headlineSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          data.headline = element.textContent.trim();
          break;
        }
      }
    } catch (error) {
      this.log('Error extracting headline:', error.message);
    }

    // Extract university/education
    try {
      const educationSelectors = [
        '.pv-profile-section__card-item-v2 .pv-entity__school-name',
        '.education .pv-entity__school-name',
        '.pv-education-entity__school-name',
        '.pvs-entity__caption-wrapper',
        '.education-section .pv-entity__school-name'
      ];

      for (const selector of educationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          const schoolName = element.textContent.trim();
          if (schoolName.toLowerCase().includes('university') || 
              schoolName.toLowerCase().includes('college') ||
              schoolName.toLowerCase().includes('institute')) {
            data.university = schoolName;
            break;
          }
        }
      }
    } catch (error) {
      this.log('Error extracting education:', error.message);
    }

    // Extract location
    try {
      const locationSelectors = [
        '.pv-text-details__left-panel .text-body-small',
        '.ph5.pb5 .text-body-small',
        '.pv-top-card-v3__location',
        '.top-card-layout__first-subline'
      ];

      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          const locationText = element.textContent.trim();
          // Simple check to see if it looks like a location
          if (locationText.includes(',') || locationText.includes('United States') || 
              locationText.includes('New York') || locationText.includes('California')) {
            data.location = locationText;
            break;
          }
        }
      }
    } catch (error) {
      this.log('Error extracting location:', error.message);
    }

    this.log('Additional profile data extracted:', data);
    return data;
  }

  // NEW: Extract name from profile page as fallback
  async extractNameFromProfilePage() {
    this.log('Extracting name from profile page...');
    
    const nameSelectors = [
      // Primary profile name selectors
      '.pv-text-details__left-panel h1',
      '.ph5.pb5 h1',
      '.pv-top-card-v3__name',
      '.top-card-layout__entity-info h1',
      '.pv-top-card--list h1',
      // Alternative selectors
      '[data-test-id="profile-heading-name"]',
      '.profile-topcard__name',
      '.pv-entity__display-name',
      // Generic fallbacks
      'main h1:first-of-type',
      '.artdeco-card h1:first-child'
    ];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        const text = element.textContent.trim();
        
        // Validate that this looks like a name
        if (/^[A-Za-z\s\.\-']{2,50}$/.test(text) && 
            text.split(' ').length <= 4 && 
            !text.toLowerCase().includes('linkedin') &&
            !text.toLowerCase().includes('profile')) {
          
          this.log(`Found name from profile page: "${text}" using selector: ${selector}`);
          return { element, text, selector, strategy: 'Profile Page' };
        }
      }
    }

    throw new Error('No name found on profile page');
  }

  // NEW: Extract role and company from profile page (much more reliable than modal)
  async extractProfileRoleAndCompany() {
    this.log('Extracting role and company from profile page...');
    
    const strategies = [
      {
        name: 'Current Experience (Present)',
        extractor: this.extractFromCurrentExperience.bind(this)
      },
      {
        name: 'Headline Parsing',
        extractor: this.extractFromHeadline.bind(this)
      },
      {
        name: 'Modal Fallback',
        extractor: this.extractFromModalContext.bind(this)
      }
    ];

    for (const strategy of strategies) {
      try {
        this.log(`Trying strategy: ${strategy.name}`);
        const result = await strategy.extractor();
        
        if (result.role || result.company) {
          this.log(`✓ Success with ${strategy.name}: Role="${result.role}", Company="${result.company}"`);
          return { ...result, strategy: strategy.name };
        }
      } catch (error) {
        this.log(`Strategy ${strategy.name} failed:`, error.message);
      }
    }

    this.log('All role/company extraction strategies failed');
    return { role: '', company: '', strategy: 'none' };
  }

  // Extract from current experience (marked as "Present")
  async extractFromCurrentExperience() {
    this.log('Looking for current experience section...');
    
    // Try multiple strategies to find experience section
    const experienceSelectors = [
      // Main experience section selectors
      '.experience-section',
      '.pvs-list__outer-container',
      '.pvs-list__paged-list-item',
      '.experience-item',
      '[data-view-name="profile-component-entity"]',
      '.pv-entity__position-group',
      '.pvs-entity',
      // Alternative patterns
      'section[id*="experience"]',
      'section:has(.pvs-entity)',
      '.artdeco-card:has([class*="experience"])',
      // Broader fallbacks
      '[class*="experience"]',
      '[class*="pvs-entity"]'
    ];

    let experienceItems = [];
    
    // Strategy 1: Find via experience section
    for (const selector of experienceSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const items = container.querySelectorAll('[class*="entity"], [class*="experience"], .pvs-list__item, li');
        if (items.length > 0) {
          experienceItems = Array.from(items);
          this.log(`Found ${experienceItems.length} experience items via ${selector}`);
          break;
        }
      }
    }

    // Strategy 2: Find all potential experience items globally
    if (experienceItems.length === 0) {
      experienceItems = Array.from(document.querySelectorAll('.pvs-entity, [class*="pvs-list__item"], [class*="experience-item"]'));
      this.log(`Found ${experienceItems.length} experience items globally`);
    }

    if (experienceItems.length === 0) {
      throw new Error('No experience items found');
    }

    // Look for current roles (containing "Present")
    const presentKeywords = ['Present', 'present', 'Current', 'current', 'Now', 'now', '•Present', '• Present'];
    
    for (const item of experienceItems) {
      // Check all text content for present indicators
      const allText = item.textContent || '';
      const hasPresent = presentKeywords.some(keyword => allText.includes(keyword));

      if (hasPresent) {
        this.log('Found current experience item, extracting role/company...');
        
        // Try multiple selectors for role
        const roleSelectors = [
          'div[class*="entity-result__title"]',
          'h3', 'h4', 
          '[class*="title"]',
          'strong',
          '.t-16',
          '.t-bold',
          'span[aria-hidden="true"]:first-child'
        ];
        
        let role = '';
        for (const selector of roleSelectors) {
          const roleElement = item.querySelector(selector);
          if (roleElement?.textContent?.trim()) {
            role = roleElement.textContent.trim();
            // Skip if it's obviously not a role
            if (!role.toLowerCase().includes('experience') && 
                !role.toLowerCase().includes('section') &&
                role.length < 100) {
              break;
            }
          }
        }
        
        // Try multiple selectors for company
        const companySelectors = [
          '[class*="subtitle"]',
          '.pv-entity__secondary-title',
          '[class*="company"]',
          '.t-14',
          '.t-normal',
          'span:nth-child(2)',
          'div:nth-child(2)'
        ];
        
        let company = '';
        for (const selector of companySelectors) {
          const companyElement = item.querySelector(selector);
          if (companyElement?.textContent?.trim()) {
            const companyText = companyElement.textContent.trim();
            // Clean up company name
            company = companyText.split('·')[0].trim();
            company = company.split('•')[0].trim();
            company = company.split('-')[0].trim();
            company = company.split('\n')[0].trim();
            
            // Skip if it contains present or duration info
            if (!company.toLowerCase().includes('present') &&
                !company.toLowerCase().includes('current') &&
                !company.match(/\d+\s*(yr|year|mo|month)/i) &&
                company.length > 1 && company.length < 100) {
              break;
            }
          }
        }

        this.log(`Extracted from experience: Role="${role}", Company="${company}"`);
        
        if (role && company) {
          return { role, company };
        } else if (role) {
          // If we have role but no company, that's still useful
          return { role, company: '' };
        }
      }
    }

    throw new Error('No current experience with Present keyword found');
  }

  // Extract from headline (like "CS, Math, Statistics, Harvard.")
  async extractFromHeadline() {
    const headlineSelectors = [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '.ph5.pb5 .text-body-medium',
      '[class*="headline"]',
      '.pv-top-card-v3__headline',
      '.top-card-layout__headline'
    ];

    let headline = '';
    for (const selector of headlineSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        headline = element.textContent.trim();
        break;
      }
    }

    if (!headline) {
      throw new Error('No headline found');
    }

    this.log(`Found headline: "${headline}"`);

    // Parse common headline patterns
    let role = '';
    let company = '';

    // Pattern 1: "Role @ Company" (e.g. "SWE Intern @ Optiver")
    if (headline.includes(' @ ')) {
      const parts = headline.split(' @ ');
      role = parts[0].trim();
      
      // Extract company from first part after @
      const afterAt = parts[1].trim();
      const companyPart = afterAt.split(/[|,]|[•]/).map(p => p.trim())[0];
      company = companyPart;
    }
    // Pattern 2: "Role at Company"
    else if (headline.includes(' at ')) {
      const parts = headline.split(' at ');
      role = parts[0].trim();
      company = parts[1].split(/[|,]|[•]/).map(p => p.trim())[0];
    }
    // Pattern 3: "Role | Company" 
    else if (headline.includes(' | ') && headline.split(' | ').length >= 2) {
      const parts = headline.split(' | ').map(p => p.trim());
      
      // Try to find role @ company pattern in any part
      for (const part of parts) {
        if (part.includes(' @ ')) {
          const subParts = part.split(' @ ');
          role = subParts[0].trim();
          company = subParts[1].trim();
          break;
        } else if (part.includes(' at ')) {
          const subParts = part.split(' at ');
          role = subParts[0].trim();
          company = subParts[1].trim();
          break;
        }
      }
      
      // If no @ or at found, use first part as role and try to find company
      if (!role && !company) {
        role = parts[0];
        // Look for known company indicators
        for (let i = 1; i < parts.length; i++) {
          if (/^[A-Z]/.test(parts[i]) && !parts[i].includes('@') && 
              !/^(CS|Math|AI|ML|Data|Software)$/i.test(parts[i])) {
            company = parts[i];
            break;
          }
        }
      }
    }
    // Pattern 4: "Role, Company" (less reliable)
    else if (headline.includes(', ') && headline.split(', ').length === 2) {
      const parts = headline.split(', ');
      // Only if second part looks like a company (starts with capital letter, not too long)
      if (/^[A-Z]/.test(parts[1]) && parts[1].length < 50) {
        role = parts[0].trim();
        company = parts[1].trim();
      }
    }
    // Pattern 5: Just extract potential role (first meaningful part)
    else {
      const parts = headline.split(/[,|]/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        role = parts[0];
        // Try to find university or company names in remaining parts
        for (let i = 1; i < parts.length; i++) {
          if (/university|college|institute|company|corp|inc|ltd|llc/i.test(parts[i]) || 
              /^[A-Z][a-z]+ [A-Z]/.test(parts[i])) {
            company = parts[i];
            break;
          }
        }
      }
    }

    return { role, company };
  }

  // Fallback to current modal-based extraction
  async extractFromModalContext() {
    const contextResult = await this.findProfileContext();
    
    if (!contextResult) {
      throw new Error('No modal context found');
    }

    const text = contextResult.element.textContent.trim();
    let role = '';
    let company = '';

    if (text.includes(' at ')) {
      const parts = text.split(' at ');
      role = parts[0].trim();
      company = parts[1].trim();
    } else if (text.includes('•')) {
      const parts = text.split('•').map(p => p.trim());
      if (parts.length >= 2) {
        role = parts[0];
        company = parts[1];
      }
    }

    return { role, company };
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE 3: DATA LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Data management classes that handle configuration storage, template processing,
 * and data persistence with validation and fallback strategies.
 */

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 3.1 StorageManager - Configuration & Data Persistence                      │
// └─────────────────────────────────────────────────────────────────────────────┘
class StorageManager {
  constructor() {
    this.storageKey = 'liHelper';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Get default configuration structure
  getDefaultConfig() {
    return {
      personalInfo: {
        name: 'Sachin',
        title: "Master's CS student at NYU",
        background: 'passionate about tech',
        university: 'New York University',
        location: 'New York, NY',
        email: '',
        linkedinProfile: ''
      },
      
      templateSettings: {
        defaultTemplate: 'general',
        autoSelectTemplate: true,
        customTemplates: {},
        enabledTemplates: ['engineer', 'recruiter', 'student', 'general', 'sameCompany', 'sameUniversity']
      },
      
      preferences: {
        autoSend: false,
        debugMode: true,
        notifications: true,
        previewBeforeSend: true,
        showDetectedInfo: true,
        extensionEnabled: true
      },
      
      advanced: {
        retryAttempts: 15,
        retryDelay: 200,
        maxErrors: 50,
        enableErrorReporting: true
      }
    };
  }

  // Load configuration from storage
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      const storedConfig = result[this.storageKey];
      
      if (storedConfig) {
        // Merge with defaults to ensure new fields are added
        const config = this.mergeWithDefaults(storedConfig, this.defaultConfig);
        console.log('[LI Helper] Configuration loaded from storage:', config);
        return config;
      } else {
        console.log('[LI Helper] No stored configuration found, using defaults');
        // Save defaults on first run
        await this.saveConfig(this.defaultConfig);
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('[LI Helper] Error loading configuration:', error);
      return this.defaultConfig;
    }
  }

  // Save configuration to storage
  async saveConfig(config) {
    try {
      await chrome.storage.sync.set({ [this.storageKey]: config });
      console.log('[LI Helper] Configuration saved to storage');
      return true;
    } catch (error) {
      console.error('[LI Helper] Error saving configuration:', error);
      return false;
    }
  }

  // Update specific section of configuration
  async updateSection(section, data) {
    try {
      const config = await this.loadConfig();
      config[section] = { ...config[section], ...data };
      await this.saveConfig(config);
      console.log(`[LI Helper] Updated ${section} configuration:`, data);
      return config;
    } catch (error) {
      console.error(`[LI Helper] Error updating ${section}:`, error);
      return null;
    }
  }

  // Get specific section of configuration
  async getSection(section) {
    try {
      const config = await this.loadConfig();
      return config[section] || {};
    } catch (error) {
      console.error(`[LI Helper] Error getting ${section}:`, error);
      return {};
    }
  }

  // Update personal information
  async updatePersonalInfo(personalInfo) {
    return this.updateSection('personalInfo', personalInfo);
  }

  // Update template settings
  async updateTemplateSettings(templateSettings) {
    return this.updateSection('templateSettings', templateSettings);
  }

  // Update preferences
  async updatePreferences(preferences) {
    return this.updateSection('preferences', preferences);
  }

  // Add custom template
  async addCustomTemplate(name, template, description = '') {
    try {
      const config = await this.loadConfig();
      if (!config.templateSettings.customTemplates) {
        config.templateSettings.customTemplates = {};
      }
      
      config.templateSettings.customTemplates[name] = {
        name: description || name,
        template: template,
        custom: true,
        created: Date.now()
      };
      
      await this.saveConfig(config);
      console.log(`[LI Helper] Added custom template: ${name}`);
      return true;
    } catch (error) {
      console.error('[LI Helper] Error adding custom template:', error);
      return false;
    }
  }

  // Remove custom template
  async removeCustomTemplate(name) {
    try {
      const config = await this.loadConfig();
      if (config.templateSettings.customTemplates && config.templateSettings.customTemplates[name]) {
        delete config.templateSettings.customTemplates[name];
        await this.saveConfig(config);
        console.log(`[LI Helper] Removed custom template: ${name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[LI Helper] Error removing custom template:', error);
      return false;
    }
  }

  // Export configuration for backup
  async exportConfig() {
    try {
      const config = await this.loadConfig();
      const exportData = {
        version: '2.1',
        exportDate: new Date().toISOString(),
        config: config
      };
      console.log('[LI Helper] Configuration export:', exportData);
      return exportData;
    } catch (error) {
      console.error('[LI Helper] Error exporting configuration:', error);
      return null;
    }
  }

  // Import configuration from backup
  async importConfig(importData) {
    try {
      if (!importData.config) {
        throw new Error('Invalid import data: missing config');
      }
      
      const mergedConfig = this.mergeWithDefaults(importData.config, this.defaultConfig);
      await this.saveConfig(mergedConfig);
      console.log('[LI Helper] Configuration imported successfully');
      return mergedConfig;
    } catch (error) {
      console.error('[LI Helper] Error importing configuration:', error);
      return null;
    }
  }

  // Reset to default configuration
  async resetToDefaults() {
    try {
      await this.saveConfig(this.defaultConfig);
      console.log('[LI Helper] Configuration reset to defaults');
      return this.defaultConfig;
    } catch (error) {
      console.error('[LI Helper] Error resetting configuration:', error);
      return null;
    }
  }

  // Merge stored config with defaults (for adding new fields)
  mergeWithDefaults(stored, defaults) {
    const merged = {};
    
    // Start with defaults
    for (const [key, value] of Object.entries(defaults)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively merge objects
        merged[key] = this.mergeWithDefaults(stored[key] || {}, value);
      } else {
        // Use stored value if exists, otherwise default
        merged[key] = stored[key] !== undefined ? stored[key] : value;
      }
    }
    
    // Add any additional fields from stored config that aren't in defaults
    for (const [key, value] of Object.entries(stored || {})) {
      if (!(key in defaults)) {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  // Get current storage usage
  async getStorageInfo() {
    try {
      const result = await chrome.storage.sync.getBytesInUse();
      const quota = chrome.storage.sync.QUOTA_BYTES;
      return {
        used: result,
        quota: quota,
        percentage: Math.round((result / quota) * 100),
        available: quota - result
      };
    } catch (error) {
      console.error('[LI Helper] Error getting storage info:', error);
      return null;
    }
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 3.2 TemplateProcessor - Message Template Engine                            │
// └─────────────────────────────────────────────────────────────────────────────┘
class TemplateProcessor {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.defaultTemplates = this.getDefaultTemplates();
    this.userTemplates = {}; // Will be loaded from storage
    this.variables = {}; // Current template variables
    this.personalInfo = {}; // Cached personal info from storage
    
    // Initialize with storage data
    this.initialize();
  }

  // Initialize with storage data
  async initialize() {
    try {
      await this.loadFromStorage();
    } catch (error) {
      console.error('[LI Helper] Error initializing TemplateProcessor:', error);
    }
  }

  // Load templates and personal info from storage
  async loadFromStorage() {
    try {
      const config = await this.storageManager.loadConfig();
      
      // Load personal info for variables
      this.personalInfo = config.personalInfo || {};
      
      // Load custom templates
      this.userTemplates = config.templateSettings?.customTemplates || {};
      
      console.log('[LI Helper] TemplateProcessor loaded from storage');
      console.log('Personal info:', this.personalInfo);
      console.log('Custom templates:', Object.keys(this.userTemplates));
      
    } catch (error) {
      console.error('[LI Helper] Error loading from storage:', error);
    }
  }

  // Process template string and replace variables
  processTemplate(template, variables = {}) {
    this.variables = { ...this.getDefaultVariables(), ...variables };
    
    let processed = template;
    
    // Replace all {variable} placeholders
    processed = processed.replace(/\{(\w+)\}/g, (match, variableName) => {
      const value = this.variables[variableName];
      
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
      
      // Handle fallbacks for missing variables
      return this.getFallbackValue(variableName, match);
    });
    
    // Clean up any remaining empty conditionals or extra spaces
    processed = this.cleanupTemplate(processed);
    
    return processed;
  }

  // Get default variable values (now pulls from storage)
  getDefaultVariables() {
    return {
      // Profile variables (dynamically detected)
      firstName: 'there',
      fullName: 'LinkedIn User', 
      company: 'your company',
      role: 'your role',
      headline: 'your background',
      university: 'your university',
      location: 'your area',
      
      // Personal variables (from storage)
      myName: this.personalInfo.name || 'Your Name',
      myTitle: this.personalInfo.title || 'Your Title',
      myBackground: this.personalInfo.background || 'passionate about tech',
      myUniversity: this.personalInfo.university || 'your university',
      myLocation: this.personalInfo.location || 'your location',
      myEmail: this.personalInfo.email || '',
      myLinkedIn: this.personalInfo.linkedinProfile || ''
    };
  }

  // Get fallback value for missing variables
  getFallbackValue(variableName, originalMatch) {
    const fallbacks = {
      firstName: 'there',
      fullName: 'LinkedIn User',
      company: 'the company',
      role: 'your role', 
      headline: 'your background',
      university: 'your university',
      location: 'your area'
    };
    
    return fallbacks[variableName] || originalMatch; // Keep original if no fallback
  }

  // Clean up template after variable replacement
  cleanupTemplate(template) {
    // Remove double spaces
    template = template.replace(/\s+/g, ' ');
    
    // Fix punctuation issues
    template = template.replace(/\s+([,.!?])/g, '$1');
    
    // Remove empty parentheses or brackets
    template = template.replace(/\(\s*\)/g, '');
    template = template.replace(/\[\s*\]/g, '');
    
    // Trim and normalize
    return template.trim();
  }

  // Default template library
  getDefaultTemplates() {
    return {
      engineer: {
        name: "Software Engineer Template",
        template: `Hi {firstName},

I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your journey as {role} at {company}. Would also appreciate any insights you might share about the interview process and work culture there.

Eager to learn from experienced professionals like yourself!

Best regards`
      },
      
      recruiter: {
        name: "Recruiter/Hiring Manager Template", 
        template: `Hi {firstName},

I noticed you're working as {role} at {company}. I'm actively exploring new opportunities in software development and would love to connect. I believe my skills could be a great fit for roles at {company}.

Looking forward to connecting!

Best regards`
      },
      
      student: {
        name: "Student/Academic Template",
        template: `Hi {firstName},

I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your academic journey at {university} and any insights you might share about {role} opportunities.

Eager to learn from experienced professionals like yourself!

Best regards`
      },
      
      general: {
        name: "General Professional Template",
        template: `Hi {firstName},

I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your journey, work culture at {company}, and any insights you might share about the industry.

Eager to learn from experienced professionals like yourself!

Best regards`
      },
      
      sameCompany: {
        name: "Same Company Template",
        template: `Hi {firstName},

I see you work at {company} - I'm very interested in opportunities there! I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your experience at {company} and any insights about the work culture and interview process.

Looking forward to connecting!

Best regards`
      },
      
      sameUniversity: {
        name: "Alumni Template", 
        template: `Hi {firstName},

Fellow {university} here! I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your journey from {university} to {role} at {company}. Always great to connect with fellow alumni!

Best regards`
      }
    };
  }

  // Select appropriate template based on extracted data
  selectTemplate(profileData) {
    const { firstName, role, company, university, headline } = profileData;
    
    // Template selection logic
    if (role && (role.toLowerCase().includes('engineer') || role.toLowerCase().includes('developer'))) {
      return this.getTemplate('engineer');
    }
    
    if (role && (role.toLowerCase().includes('recruiter') || role.toLowerCase().includes('hiring') || role.toLowerCase().includes('talent'))) {
      return this.getTemplate('recruiter');
    }
    
    if (university && (university.toLowerCase().includes('nyu') || university.toLowerCase().includes('new york university'))) {
      return this.getTemplate('sameUniversity');
    }
    
    if (company && role) {
      return this.getTemplate('general');
    }
    
    // Default fallback
    return this.getTemplate('general');
  }

  // Get template by name
  getTemplate(templateName) {
    // Check user templates first, then default templates
    return this.userTemplates[templateName] || this.defaultTemplates[templateName] || this.defaultTemplates.general;
  }

  // Allow users to add custom templates (now saves to storage)
  async addCustomTemplate(name, template, description = '') {
    try {
      // Update local cache
      this.userTemplates[name] = {
        name: description || name,
        template: template,
        custom: true,
        created: Date.now()
      };
      
      // Save to storage
      const success = await this.storageManager.addCustomTemplate(name, template, description);
      
      if (success) {
        console.log(`[LI Helper] Added custom template: ${name}`);
        return true;
      } else {
        // Revert local cache if storage failed
        delete this.userTemplates[name];
        return false;
      }
    } catch (error) {
      console.error('[LI Helper] Error adding custom template:', error);
      return false;
    }
  }

  // Remove custom template
  async removeCustomTemplate(name) {
    try {
      const success = await this.storageManager.removeCustomTemplate(name);
      
      if (success) {
        // Update local cache
        delete this.userTemplates[name];
        console.log(`[LI Helper] Removed custom template: ${name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[LI Helper] Error removing custom template:', error);
      return false;
    }
  }

  // Update personal information (triggers variable refresh)
  async updatePersonalInfo(personalInfo) {
    try {
      const config = await this.storageManager.updatePersonalInfo(personalInfo);
      if (config) {
        // Update local cache
        this.personalInfo = config.personalInfo;
        console.log('[LI Helper] Personal info updated:', this.personalInfo);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[LI Helper] Error updating personal info:', error);
      return false;
    }
  }

  // Get all available templates
  getAllTemplates() {
    return {
      ...this.defaultTemplates,
      ...this.userTemplates
    };
  }

  // Export templates for backup
  exportTemplates() {
    return {
      default: this.defaultTemplates,
      custom: this.userTemplates
    };
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE 4: UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Utility classes that provide logging, diagnostics, debugging, and development 
 * tools to support the extension's operation and maintenance.
 */

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 4.1 ErrorReporter - Logging & Diagnostics System                          │
// └─────────────────────────────────────────────────────────────────────────────┘
class ErrorReporter {
  constructor() {
    this.errors = [];
    this.maxErrors = 50; // Keep last 50 errors
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Log different types of errors with context
  logError(type, message, details = {}) {
    const error = {
      id: this.generateErrorId(),
      type,
      message,
      details,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100), // Truncated for storage
      sessionDuration: Date.now() - this.startTime
    };

    this.errors.push(error);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Console logging with appropriate level
    this.consoleLog(error);
    
    return error.id;
  }

  generateErrorId() {
    return 'err_' + Math.random().toString(36).substr(2, 9);
  }

  consoleLog(error) {
    const prefix = `[LI Helper Error ${error.type}]`;
    
    switch (error.type) {
      case 'CRITICAL':
        console.error(prefix, error.message, error.details);
        break;
      case 'WARNING':
        console.warn(prefix, error.message, error.details);
        break;
      case 'INFO':
        console.info(prefix, error.message, error.details);
        break;
      default:
        console.log(prefix, error.message, error.details);
    }
  }

  // Specific error types for different scenarios
  logElementNotFound(elementType, attempted_selectors = [], context = {}) {
    return this.logError('WARNING', `Element not found: ${elementType}`, {
      elementType,
      attempted_selectors,
      context,
      suggestions: this.getElementNotFoundSuggestions(elementType)
    });
  }

  logTimingError(operation, expectedTime, actualTime, context = {}) {
    return this.logError('WARNING', `Timing issue in ${operation}`, {
      operation,
      expectedTime,
      actualTime,
      context,
      suggestions: ['Check network speed', 'LinkedIn may be loading slowly']
    });
  }

  logModalError(modalType, error, context = {}) {
    return this.logError('CRITICAL', `Modal interaction failed: ${modalType}`, {
      modalType,
      error: error.message || error,
      stack: error.stack,
      context,
      suggestions: this.getModalErrorSuggestions(modalType)
    });
  }

  logNetworkError(operation, error, context = {}) {
    return this.logError('CRITICAL', `Network error during ${operation}`, {
      operation,
      error: error.message || error,
      context,
      suggestions: ['Check internet connection', 'LinkedIn may be down']
    });
  }

  logUserActionRequired(action, reason, context = {}) {
    return this.logError('INFO', `User action required: ${action}`, {
      action,
      reason,
      context,
      suggestions: this.getUserActionSuggestions(action)
    });
  }

  // Helper methods for suggestions
  getElementNotFoundSuggestions(elementType) {
    const suggestions = {
      'name': ['Check if modal fully loaded', 'Person name might be in unexpected format'],
      'button': ['Try refreshing the page', 'LinkedIn UI may have updated'],
      'textarea': ['Click "Add a note" manually', 'Modal might not be fully expanded'],
      'modal': ['Wait longer for page load', 'Click Connect button again']
    };
    return suggestions[elementType] || ['Try refreshing the page', 'LinkedIn UI may have changed'];
  }

  getModalErrorSuggestions(modalType) {
    const suggestions = {
      'connection': ['Try clicking Connect again', 'Check if already connected'],
      'message': ['Try clicking "Add a note" manually', 'Check modal permissions']
    };
    return suggestions[modalType] || ['Try refreshing the page'];
  }

  getUserActionSuggestions(action) {
    const suggestions = {
      'name_input': ['Enter first name only', 'Check spelling'],
      'manual_click': ['Click the highlighted element', 'Wait for page to fully load']
    };
    return suggestions[action] || ['Follow the instructions in the notification'];
  }

  // Get error summary for debugging
  getErrorSummary() {
    const summary = {
      totalErrors: this.errors.length,
      errorsByType: {},
      recentErrors: this.errors.slice(-5),
      sessionInfo: {
        sessionId: this.sessionId,
        duration: Date.now() - this.startTime,
        url: window.location.href
      }
    };

    // Count errors by type
    this.errors.forEach(error => {
      summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;
    });

    return summary;
  }

  // Show error to user with helpful context
  showUserError(message, errorType = 'error', suggestions = []) {
    let fullMessage = message;
    
    if (suggestions.length > 0) {
      fullMessage += '\n\nSuggestions:\n• ' + suggestions.join('\n• ');
    }
    
    showNotification(fullMessage, errorType);
  }

  // Get errors for potential external reporting
  exportErrors() {
    return {
      version: '1.0',
      sessionId: this.sessionId,
      exportTime: Date.now(),
      errors: this.errors
    };
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE 5: APPLICATION LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Main application logic including initialization, event handling, business logic,
 * and the coordination of all system components.
 */

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 5.1 System Initialization - Component Setup & Configuration               │
// └─────────────────────────────────────────────────────────────────────────────┘

// Initialize resource manager first to handle cleanup
const resourceManager = new ResourceManager();

// Initialize operation queue for race condition prevention
const operationQueue = new OperationQueue(resourceManager);

// Initialize resilient finder for adaptive DOM element detection
const resilientFinder = new ResilientElementFinder(resourceManager);

// Initialize storage manager, element finder and template processor
const storageManager = new StorageManager();
const elementFinder = new LinkedInElementFinder(resourceManager);
const templateProcessor = new TemplateProcessor(storageManager);

// Initialize error boundary with fallback strategies
const errorBoundary = new ErrorBoundary(elementFinder.errorReporter, resourceManager);

// Register fallback strategies for critical operations
errorBoundary.fallbackStrategies.set('connect_button_click', async (error, metadata) => {
  // Fallback: Show manual instruction
  elementFinder.errorReporter.showUserError(
    '⚠️ Automatic processing failed. Please click "Connect" and "Add a note" manually.',
    'warning',
    ['Click the Connect button', 'Click "Add a note" button', 'The extension will detect the message box']
  );
  return { fallbackUsed: true, requiresManualAction: true };
});

errorBoundary.fallbackStrategies.set('modal_detection', async (error, metadata) => {
  // Fallback: Try alternative modal selectors
  const alternativeSelectors = [
    '.send-invite-modal',
    '[data-test-modal]',
    '.invite-connect-modal',
    '.artdeco-modal-overlay',
    '[role="dialog"][aria-label*="Connect"]'
  ];
  
  for (const selector of alternativeSelectors) {
    const modal = document.querySelector(selector);
    if (modal) {
      elementFinder.log(`✓ Found modal using fallback selector: ${selector}`);
      return { element: modal, strategy: 'fallback_selector', selector };
    }
  }
  
  // Final fallback: Ask user to manually trigger
  elementFinder.errorReporter.showUserError(
    '⚠️ Connection dialog not detected. Please click "Add a note" manually.',
    'warning',
    ['Click "Add a note" in the connection dialog', 'Wait for the dialog to fully load', 'Try refreshing if needed']
  );
  return { fallbackUsed: true, requiresManualAction: true };
});

errorBoundary.fallbackStrategies.set('textarea_detection', async (error, metadata) => {
  // Fallback: Try alternative textarea selectors
  const alternativeSelectors = [
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="note"]',
    '.connect-message-textarea',
    '.invite-textarea',
    '[contenteditable="true"]',
    'div[role="textbox"]'
  ];
  
  for (const selector of alternativeSelectors) {
    const textarea = document.querySelector(selector);
    if (textarea && textarea.offsetParent !== null) {
      elementFinder.log(`✓ Found textarea using fallback selector: ${selector}`);
      return { element: textarea, strategy: 'fallback_selector', selector };
    }
  }
  
  // Final fallback: Manual instruction
  elementFinder.errorReporter.showUserError(
    '⚠️ Message box not found. You can type your message manually.',
    'warning',
    ['Look for the message text area in the dialog', 'Click in the text area if visible', 'Type your personalized message']
  );
  return { fallbackUsed: true, requiresManualAction: true };
});

errorBoundary.fallbackStrategies.set('message_insertion', async (error, metadata) => {
  // Fallback: Try clipboard approach or show message to copy
  const { message, metadata: msgMetadata } = metadata;
  
  if (message) {
    try {
      // Try to copy message to clipboard for manual pasting
      await navigator.clipboard.writeText(message);
      elementFinder.errorReporter.showUserError(
        '✅ Message copied to clipboard! Paste it manually in the text area.',
        'info',
        ['Press Ctrl+V (or Cmd+V) to paste', 'Click in the message area first', 'The message is ready in your clipboard']
      );
      return { fallbackUsed: true, messageInClipboard: true, message };
    } catch (clipboardError) {
      // Show message to copy manually
      const messageDisplay = message.length > 100 ? message.substring(0, 100) + '...' : message;
      elementFinder.errorReporter.showUserError(
        `📝 Please copy this message manually:\n\n"${messageDisplay}"`,
        'info',
        ['Select and copy the message above', 'Paste it in the LinkedIn message box', 'Customize as needed']
      );
      return { fallbackUsed: true, manualCopyRequired: true, message };
    }
  }
  
  return { fallbackUsed: true, noMessage: true };
});

errorBoundary.fallbackStrategies.set('name_detection', async (error, metadata) => {
  // Fallback: Try alternative name detection methods
  const fallbackMethods = [
    () => document.querySelector('h1')?.textContent?.trim(),
    () => document.querySelector('.pv-text-details__left-panel h1')?.textContent?.trim(),
    () => document.querySelector('[data-field="headline"]')?.textContent?.trim(),
    () => document.title?.split(' | ')?.[0]?.trim(),
    () => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      return ogTitle?.getAttribute('content')?.split(' | ')?.[0]?.trim();
    }
  ];
  
  for (const method of fallbackMethods) {
    try {
      const name = method();
      if (name && name.length > 2 && name.length < 100) {
        elementFinder.log(`✓ Found name using fallback method: ${name}`);
        return { name, strategy: 'fallback_detection' };
      }
    } catch (methodError) {
      continue;
    }
  }
  
  // Final fallback: Ask user for name
  elementFinder.errorReporter.showUserError(
    '⚠️ Could not detect name automatically. Please enter it when prompted.',
    'warning',
    ['You will be asked to enter the name', 'Check the profile page is fully loaded', 'Look for the person\'s name in the page title']
  );
  return { fallbackUsed: true, requiresUserInput: true };
});

// Register recovery strategies for cleanup and state reset
errorBoundary.recoveryStrategies.set('connect_button_click', async (error, metadata) => {
  // Recovery: Reset any stuck states
  elementFinder.log('Recovery: Resetting connection flow state');
  operationQueue.cancelAll();
});

errorBoundary.recoveryStrategies.set('modal_detection', async (error, metadata) => {
  // Recovery: Clear any observers and reset modal detection
  elementFinder.log('Recovery: Clearing modal detection observers');
  // The ResourceManager will handle observer cleanup automatically
});

errorBoundary.recoveryStrategies.set('textarea_detection', async (error, metadata) => {
  // Recovery: Reset textarea detection state
  elementFinder.log('Recovery: Resetting textarea detection state');
  // Clear any cached textarea references that might be stale
});

errorBoundary.recoveryStrategies.set('message_insertion', async (error, metadata) => {
  // Recovery: Clear any stuck message states
  elementFinder.log('Recovery: Clearing message insertion state');
  // Any cleanup needed for message insertion failures
});

// Ensure global objects are available after initialization
const globalSetupTimeoutId = setTimeout(() => {
  console.log('[LI Helper] Setting up global debug objects...');
  if (typeof window.liHelperStorage === 'undefined') {
    console.log('[LI Helper] liHelperStorage not found, creating it...');
    setupGlobalObjects();
  } else {
    console.log('[LI Helper] Global objects already available');
  }
}, 1000);

// Register timeout for cleanup
resourceManager.addTimer(globalSetupTimeoutId);

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 5.2 Event Handlers - User Interaction Processing                          │
// └─────────────────────────────────────────────────────────────────────────────┘

// Extension state
let extensionEnabled = true;

// Listen for clicks on Connect buttons - Now with OperationQueue and proper cleanup
const connectButtonHandler = function(e) {
  // Check if extension is enabled
  if (!extensionEnabled) {
    return;
  }
  
  // Check if clicked element is a Connect button
  const target = e.target;
  const isConnectButton = 
    target.innerText === 'Connect' || 
    target.getAttribute('aria-label')?.includes('Connect') ||
    target.closest('button')?.innerText === 'Connect' ||
    target.closest('[aria-label*="Connect"]');
    
  if (isConnectButton) {
    elementFinder.log('Connect button clicked! Processing with error boundary...');
    
    // Wrap connection flow with error boundary for comprehensive protection
    errorBoundary.protect('connect_button_click', async () => {
      // Queue the connection operation to prevent race conditions
      return operationQueue.enqueue('connect_button_click', async () => {
        await waitForConnectionModal();
      }, {
        timeout: 15000,
        retryable: false, // Don't retry click events
        metadata: {
          buttonElement: target,
          url: window.location.href,
          timestamp: Date.now()
        },
        onSuccess: () => {
          elementFinder.log('✓ Connection flow completed successfully');
        },
        onFailure: (error) => {
          elementFinder.log('✗ Connection flow failed:', error.message);
        }
      });
    }, {
      enableCircuitBreaker: true,
      enableRetry: false,
      enableGracefulDegradation: true,
      userFriendlyName: 'Connection Flow',
      timeout: 20000,
      metadata: {
        buttonElement: target,
        url: window.location.href,
        timestamp: Date.now()
      }
    }).catch(error => {
      elementFinder.log('Connection flow error boundary failed:', error.message);
      // Error boundary handles user notification, no need for additional error handling
    });
  }
};

// Add listener through resource manager for proper cleanup
resourceManager.addListener(document, 'click', connectButtonHandler);

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 5.3 Business Logic - Core Extension Workflow                              │
// └─────────────────────────────────────────────────────────────────────────────┘

// Smart modal detection using MutationObserver, OperationQueue and Error Boundary
async function waitForConnectionModal() {
  elementFinder.log('Waiting for connection modal to appear...');
  
  // Wrap modal detection with error boundary
  return errorBoundary.protect('modal_detection', async () => {
    // Queue modal detection to prevent overlapping operations
    return operationQueue.enqueue('modal_detection', async () => {
      return new Promise((resolve, reject) => {
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds at 100ms intervals
  const startTime = Date.now();
  
      const observer = new MutationObserver((mutations, obs) => {
    attempts++;
    
    // Look for modal indicators
    const modalExists = 
      document.querySelector('.artdeco-modal') ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector('.send-invite') ||
      document.querySelector('[aria-label*="invite"]');
    
    if (modalExists) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✓ Modal detected after ${actualTime}ms`);
            removeObserver(); // Use cleanup function
            resolve(modalExists);
      return;
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✗ Modal not detected after ${actualTime}ms`);
            removeObserver(); // Use cleanup function
      
      // Log timing error with comprehensive details
      elementFinder.errorReporter.logTimingError(
        'modal_detection', 
        5000, 
        actualTime, 
        { 
          attempts, 
          modalSelectors: ['.artdeco-modal', '[role="dialog"]', '.send-invite'],
          mutations: mutations.length 
        }
      );
      
            reject(new Error('Connection modal not detected after timeout'));
          }
        });
        
        // Register observer with resource manager for proper cleanup
        const removeObserver = resourceManager.addObserver(observer, document.body, {
        childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'role', 'aria-label']
      });
      
  // Also do an immediate check in case modal is already there
        const timeoutId = setTimeout(() => {
    const modalExists = 
      document.querySelector('.artdeco-modal') ||
      document.querySelector('[role="dialog"]');
    
    if (modalExists) {
      elementFinder.log('✓ Modal already present, proceeding immediately');
            removeObserver(); // Use cleanup function
            resolve(modalExists);
    }
  }, 100);
        
        // Register timeout for cleanup
        resourceManager.addTimer(timeoutId);
      });
    }, {
      timeout: 8000, // 8 second timeout for modal detection
      retryable: true,
      onSuccess: async (modalResult) => {
        // Queue the message filling operation with error boundary protection
        await errorBoundary.protect('message_insertion', async () => {
          return operationQueue.enqueue('message_insertion', async () => {
            await fillConnectionMessage();
          }, {
            timeout: 10000,
            retryable: true
          });
        }, {
          enableCircuitBreaker: true,
          enableRetry: true,
          enableGracefulDegradation: true,
          userFriendlyName: 'Message Processing',
          timeout: 12000,
          metadata: {
            modalDetected: true,
            modalElement: modalResult
          }
        });
      },
      onFailure: (error) => {
        // Let error boundary handle this
        throw error;
      }
    });
  }, {
    enableCircuitBreaker: true,
    enableRetry: true,
    enableGracefulDegradation: true,
    userFriendlyName: 'Modal Detection',
    timeout: 10000,
    metadata: {
      url: window.location.href,
      timestamp: Date.now()
    }
  });
}

async function fillConnectionMessage() {
  elementFinder.log('Looking for connection modal...');
  
  try {
    // Use robust element detection for "Add a note" button
    const addNoteResult = await elementFinder.findAddNoteButton();
    
    if (!addNoteResult) {
      elementFinder.log('✗ Could not find "Add a note" button');
      
      // Log modal error with comprehensive details
      elementFinder.errorReporter.logModalError(
        'connection', 
        'Add a note button not found', 
        {
          modalPresent: !!document.querySelector('.artdeco-modal'),
          connectionModalPresent: !!document.querySelector('.send-invite'),
          allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
        }
      );
      
      // Show user-friendly error with suggestions
      elementFinder.errorReporter.showUserError(
        '⚠️ Could not find "Add a note" button.',
        'error',
        ['Try clicking Connect again', 'Check if you\'re already connected', 'Refresh the page']
      );
      return;
    }
    
    elementFinder.log('✓ Found "Add a note" button, clicking it...');
    
    try {
      addNoteResult.element.click();
      
      // Wrap textarea detection with error boundary
      await errorBoundary.protect('textarea_detection', async () => {
        return operationQueue.enqueue('textarea_detection', async () => {
          await waitForTextareaAndInsert();
        }, {
          timeout: 5000,
          retryable: true
        });
      }, {
        enableCircuitBreaker: true,
        enableRetry: true,
        enableGracefulDegradation: true,
        userFriendlyName: 'Textarea Detection',
        timeout: 7000,
        metadata: {
          addNoteClicked: true,
          timestamp: Date.now()
        }
      });
      
    } catch (clickError) {
      elementFinder.errorReporter.logModalError(
        'connection',
        'Failed to click Add a note button',
        {
          error: clickError.message,
          buttonSelector: addNoteResult.selector,
          buttonStrategy: addNoteResult.strategy
        }
      );
      
      elementFinder.errorReporter.showUserError(
        '⚠️ Could not click "Add a note" button.',
        'error',
        ['Try clicking it manually', 'Check if modal is responsive']
      );
    }
    
  } catch (error) {
    elementFinder.log('Error in fillConnectionMessage:', error);
    
    elementFinder.errorReporter.logModalError(
      'connection',
      'Unexpected error in fillConnectionMessage',
      {
        error: error.message,
        stack: error.stack,
        url: window.location.href
      }
    );
    
    elementFinder.errorReporter.showUserError(
      '⚠️ Unexpected error finding connection modal elements.',
      'error',
      ['Try refreshing the page', 'Check browser console for details']
    );
  }
}

// Wait for textarea to appear after clicking "Add a note" - Now returns Promise
async function waitForTextareaAndInsert() {
  elementFinder.log('Waiting for message textarea to appear...');
  
  return new Promise((resolve, reject) => {
  let attempts = 0;
  const maxAttempts = 30; // 3 seconds at 100ms intervals
  const startTime = Date.now();
  
  const observer = new MutationObserver(async (mutations, obs) => {
    attempts++;
    
    // Check if textarea is now available
    const textareaExists = 
      document.querySelector('textarea[name="message"]') ||
      document.querySelector('#custom-message') ||
      document.querySelector('textarea[id*="message"]') ||
      document.querySelector('.artdeco-modal textarea') ||
      document.querySelector('[role="dialog"] textarea');
    
    if (textareaExists) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✓ Textarea appeared after ${actualTime}ms`);
        removeTextareaObserver(); // Use cleanup function
        
        try {
      await insertPersonalizedMessage();
          resolve(textareaExists);
        } catch (error) {
          reject(error);
        }
      return;
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✗ Textarea not found after ${actualTime}ms`);
        removeTextareaObserver(); // Use cleanup function
      
      // Log timing error with comprehensive details
      elementFinder.errorReporter.logTimingError(
        'textarea_appearance',
        3000,
        actualTime,
        {
          attempts,
          addNoteClicked: true,
          modalPresent: !!document.querySelector('.artdeco-modal'),
          allTextareas: Array.from(document.querySelectorAll('textarea')).map(t => ({
            name: t.name,
            id: t.id,
            visible: t.offsetParent !== null
          }))
        }
      );
      
        reject(new Error('Message box not found after timeout'));
      }
    });
    
    // Register textarea observer with resource manager for proper cleanup
    const removeTextareaObserver = resourceManager.addObserver(observer, document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'name']
  });
  
  // Also do an immediate check in case textarea is already there
    const textareaTimeoutId = setTimeout(async () => {
    const textareaExists = 
      document.querySelector('textarea[name="message"]') ||
      document.querySelector('#custom-message') ||
      document.querySelector('textarea[id*="message"]');
    
    if (textareaExists) {
      elementFinder.log('✓ Textarea already present, proceeding immediately');
        removeTextareaObserver(); // Use cleanup function
        
        try {
      await insertPersonalizedMessage();
          resolve(textareaExists);
        } catch (error) {
          reject(error);
        }
    }
  }, 50);
    
    // Register timeout for cleanup
    resourceManager.addTimer(textareaTimeoutId);
  });
}

async function insertPersonalizedMessage() {
  elementFinder.log('Inserting personalized message...');
  
  try {
    // Try multiple strategies for name detection
    let firstName;
    let nameDetectionStrategy;
    
    // Strategy 1: Modal-based detection
    const nameResult = await elementFinder.findNameElement();
    
    if (nameResult) {
      const fullName = nameResult.element.textContent.trim();
      firstName = fullName.split(' ')[0];
      nameDetectionStrategy = nameResult.strategy;
      elementFinder.log(`✓ Detected name: ${firstName} (strategy: ${nameResult.strategy})`);
    } 
    // Strategy 2: Profile page fallback  
    else {
      elementFinder.log('Modal name detection failed, trying profile page...');
      
      try {
        const profileNameResult = await elementFinder.extractNameFromProfilePage();
        const fullName = profileNameResult.text;
        firstName = fullName.split(' ')[0];
        nameDetectionStrategy = profileNameResult.strategy;
        elementFinder.log(`✓ Detected name from profile: ${firstName} (strategy: ${profileNameResult.strategy})`);
      } catch (profileError) {
        elementFinder.log('Profile name detection also failed:', profileError.message);
        
        // Log comprehensive debug info
        elementFinder.errorReporter.logUserActionRequired(
          'name_input',
          'All name detection strategies failed',
          {
            modalPresent: !!document.querySelector('.artdeco-modal'),
            strongElements: Array.from(document.querySelectorAll('strong')).map(el => el.textContent?.trim()).filter(Boolean),
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim()).filter(Boolean),
            profileHeadings: Array.from(document.querySelectorAll('.pv-text-details h1, .ph5 h1')).map(el => el.textContent?.trim()).filter(Boolean)
          }
        );
        
        // Final fallback: Ask user for name
    const fallbackName = prompt('Could not detect name automatically. Please enter the person\'s first name:');
    if (fallbackName && fallbackName.trim()) {
          firstName = fallbackName.trim();
          nameDetectionStrategy = 'Manual Input';
          elementFinder.log(`Using manual name input: ${firstName}`);
        } else {
          elementFinder.log('User cancelled name input');
          elementFinder.errorReporter.logUserActionRequired(
            'user_cancel',
            'User cancelled manual name input',
            { promptShown: true }
          );
      return;
    }
      }
    }
    
    await handleNameDetected(firstName, nameDetectionStrategy);
    
  } catch (error) {
    elementFinder.log('Error in insertPersonalizedMessage:', error);
    
    elementFinder.errorReporter.logModalError(
      'message',
      'Unexpected error in insertPersonalizedMessage',
      {
        error: error.message,
        stack: error.stack,
        stage: 'name_detection_or_processing'
      }
    );
    
    elementFinder.errorReporter.showUserError(
      '⚠️ Error processing message insertion.',
      'error',
      ['Try refreshing the page', 'Check browser console for details', 'Try clicking Connect again']
    );
  }
}

async function handleNameDetected(firstName, nameDetectionStrategy = 'Unknown') {
  elementFinder.log(`Processing connection for: ${firstName} (name strategy: ${nameDetectionStrategy})`);
  
  try {
    // Step 1: Extract role/company data
    const profileRoleData = await elementFinder.extractProfileRoleAndCompany();
    const role = profileRoleData.role || '';
    const company = profileRoleData.company || '';
    const extractionStrategy = profileRoleData.strategy || 'none';
    
    elementFinder.log(`Profile extraction complete - Strategy: ${extractionStrategy}`);
    
    // Step 2: Extract additional profile data for template variables
    const additionalData = await elementFinder.extractAdditionalProfileData();
    
    // Step 3: Build complete profile data object for template processing
    const profileData = {
      firstName: firstName,
      fullName: firstName, // We can enhance this if we have full name
      role: role,
      company: company,
      headline: additionalData.headline || '',
      university: additionalData.university || '',
      location: additionalData.location || '',
      // Additional computed fields
      hasRole: !!role,
      hasCompany: !!company,
      hasUniversity: !!additionalData.university
    };
    
    elementFinder.log('Complete profile data for templates:', profileData);
    
    // Step 4: Use template processor to select and generate message
    const selectedTemplate = templateProcessor.selectTemplate(profileData);
    const personalizedMessage = templateProcessor.processTemplate(selectedTemplate.template, profileData);
    
    elementFinder.log(`Selected template: ${selectedTemplate.name}`);
    elementFinder.log('Generated message preview:', personalizedMessage.substring(0, 100) + '...');
    
    // Continue with message insertion
    await insertMessageIntoTextarea(personalizedMessage, {
      profileData,
      selectedTemplate: selectedTemplate.name,
      nameDetectionStrategy,
      extractionStrategy
    });
    
  } catch (error) {
    elementFinder.log('Error in handleNameDetected:', error);
    elementFinder.errorReporter.logError('WARNING', 'Profile data extraction failed', {
      error: error.message,
      firstName,
      url: window.location.href
    });
    
    // Fallback to simple template
    const fallbackMessage = `Hi ${firstName},\n\nI'm Sachin, a Master's CS student at NYU passionate about tech.\n\nI'd love to connect and learn about your journey and any insights you might share.\n\nEager to learn from experienced professionals like yourself!\n\nBest regards`;
    
    await insertMessageIntoTextarea(fallbackMessage, {
      profileData: { firstName },
      selectedTemplate: 'Fallback',
      nameDetectionStrategy,
      extractionStrategy: 'fallback'
    });
  }
}

// Separate function for message insertion to reduce complexity
async function insertMessageIntoTextarea(message, metadata) {
  const { profileData, selectedTemplate, nameDetectionStrategy, extractionStrategy } = metadata;
  
  // Find the message textarea using robust detection
  try {
    const messageResult = await elementFinder.findMessageTextarea();
    
    if (!messageResult) {
      elementFinder.log('✗ Could not find message textarea');
      elementFinder.errorReporter.showUserError(
        '⚠️ Could not find message box.',
        'error',
        ['Try manually clicking in the text area', 'Refresh the page', 'Click "Add a note" manually']
      );
      return;
    }
    
    const messageBox = messageResult.element;
    elementFinder.log(`✓ Found message box (strategy: ${messageResult.strategy})`);
    
    // Clear existing text and insert new message
    messageBox.value = '';
    messageBox.value = message;
    
    // Trigger events to ensure LinkedIn registers the change
    messageBox.dispatchEvent(new Event('input', { bubbles: true }));
    messageBox.dispatchEvent(new Event('change', { bubbles: true }));
    messageBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    messageBox.focus();
    
    // Visual feedback with template info
    messageBox.style.border = '2px solid #0a66c2';
    messageBox.style.backgroundColor = '#f0f7ff';
    
    setTimeout(() => {
      messageBox.style.border = '';
      messageBox.style.backgroundColor = '';
    }, 2000);
    
    // Show success notification
    showNotification(`✓ Message inserted using ${selectedTemplate} template!`, 'success');
    
    // Show comprehensive detection info
    showDetectedInfo({
      name: profileData.firstName,
      role: profileData.role || 'Not detected',
      company: profileData.company || 'Not detected', 
      headline: profileData.headline || 'Not detected',
      university: profileData.university || 'Not detected',
      nameStrategy: nameDetectionStrategy,
      extractionStrategy: extractionStrategy,
      templateUsed: selectedTemplate
    });
    
  } catch (error) {
    elementFinder.log('Error inserting message:', error);
    elementFinder.errorReporter.logModalError(
      'message',
      'Failed to insert message into textarea',
      {
        error: error.message,
        messageLength: message.length,
        template: selectedTemplate
      }
    );
    
    elementFinder.errorReporter.showUserError(
      '⚠️ Error inserting message into text box.',
      'error',
      ['Try clicking in the text area manually', 'Refresh the page', 'Check console for details']
    );
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#0a66c2' : '#e74c3c'};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerText = message;
  document.body.appendChild(notification);
  
  // Use resourceManager for notification timers
  const notificationTimeoutId = setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    const removeTimeoutId = setTimeout(() => notification.remove(), 300);
    resourceManager.addTimer(removeTimeoutId);
  }, 3000);
  
  resourceManager.addTimer(notificationTimeoutId);
}

// Show detected information
function showDetectedInfo(info) {
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #0a66c2;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 320px;
  `;
  
  const strategyEmoji = {
    'Current Experience (Present)': '💼',
    'Headline Parsing': '📝', 
    'Modal Fallback': '🔧',
    'Profile Page': '👤',
    'Manual Input': '✏️',
    'Modal Title Elements': '🏷️',
    'Modal Content Strong Tags': '💪',
    'Generic Header Search': '🔍',
    'none': '⚠️'
  };
  
  const nameStrategyText = info.nameStrategy ? `${strategyEmoji[info.nameStrategy] || '🔍'} ${info.nameStrategy}` : '';
  const extractionStrategyText = info.extractionStrategy ? `${strategyEmoji[info.extractionStrategy] || '🔍'} ${info.extractionStrategy}` : '';
  
  // Build comprehensive info display
  let detailsHtml = `
    <strong>✓ Auto-detected:</strong><br>
    <span style="opacity: 0.9">
    Name: ${info.name} ${nameStrategyText ? `(${nameStrategyText})` : ''}<br>
    Role: ${info.role}<br>
    Company: ${info.company}`;
  
  // Add additional data if available
  if (info.headline && info.headline !== 'Not detected') {
    detailsHtml += `<br>Headline: ${info.headline.substring(0, 30)}...`;
  }
  
  if (info.university && info.university !== 'Not detected') {
    detailsHtml += `<br>University: ${info.university}`;
  }
  
  // Add template info
  if (info.templateUsed) {
    detailsHtml += `<br><br><strong>📝 Template:</strong> ${info.templateUsed}`;
  }
  
  if (extractionStrategyText) {
    detailsHtml += `<br><em>via ${extractionStrategyText}</em>`;
  }
  
  detailsHtml += `</span>`;
  
  infoDiv.innerHTML = detailsHtml;
  
  document.body.appendChild(infoDiv);
  
  // Use resourceManager for info display timers
  const infoTimeoutId = setTimeout(() => {
    infoDiv.style.animation = 'fadeOut 0.3s ease-in';
    const infoRemoveTimeoutId = setTimeout(() => infoDiv.remove(), 300);
    resourceManager.addTimer(infoRemoveTimeoutId);
  }, 5000);
  
  resourceManager.addTimer(infoTimeoutId);
}

// Add floating control button
const toggleButton = document.createElement('div');
toggleButton.innerHTML = '🤝';
toggleButton.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: #0a66c2;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 9999;
  font-size: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transition: all 0.3s;
`;

toggleButton.title = 'LinkedIn Connection Helper (Click to toggle)';

// Add toggle button listeners with proper cleanup
resourceManager.addListener(toggleButton, 'click', () => {
  extensionEnabled = !extensionEnabled;
  toggleButton.style.opacity = extensionEnabled ? '1' : '0.5';
  showNotification(
    extensionEnabled ? '✓ Extension enabled' : '⏸ Extension disabled',
    extensionEnabled ? 'success' : 'info'
  );
});

// Add hover effects with proper cleanup
resourceManager.addListener(toggleButton, 'mouseenter', () => {
  toggleButton.style.transform = 'scale(1.1)';
});

resourceManager.addListener(toggleButton, 'mouseleave', () => {
  toggleButton.style.transform = 'scale(1)';
});

document.body.appendChild(toggleButton);

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 4.2 Debug Tools - Development & Testing Utilities                         │
// └─────────────────────────────────────────────────────────────────────────────┘

// Function to setup global debug objects
function setupGlobalObjects() {
  console.log('[LI Helper] Creating global debug objects...');

// Add debug helper and template customization to console
window.liHelperDebug = {
  // Error management
  getErrors: () => elementFinder.errorReporter.getErrorSummary(),
  exportErrors: () => elementFinder.errorReporter.exportErrors(),
  clearErrors: () => {
    elementFinder.errorReporter.errors = [];
    console.log('[LI Helper] Error log cleared');
  },
  toggleDebug: () => {
    elementFinder.debug = !elementFinder.debug;
    console.log(`[LI Helper] Debug mode: ${elementFinder.debug ? 'ON' : 'OFF'}`);
  },
  
  // Resource management monitoring
  getResourceStats: () => {
    const stats = {
      listeners: resourceManager.listeners.size,
      observers: resourceManager.observers.size,
      timers: resourceManager.timers.size,
      total: resourceManager.listeners.size + resourceManager.observers.size + resourceManager.timers.size
    };
    console.log('[LI Helper] Resource usage:', stats);
    return stats;
  },
  
  forceCleanup: () => {
    resourceManager.cleanup();
    console.log('[LI Helper] Manual cleanup completed');
  },
  
  testMemoryLeak: () => {
    // Add some test resources to verify cleanup works
    const testElement = document.createElement('div');
    resourceManager.addListener(testElement, 'click', () => {});
    
    const testObserver = new MutationObserver(() => {});
    resourceManager.addObserver(testObserver, document.body, { childList: true });
    
    const testTimer = setTimeout(() => {}, 5000);
    resourceManager.addTimer(testTimer);
    
    console.log('[LI Helper] Added test resources. Use getResourceStats() to check.');
  },
  
  // Resilient DOM finder monitoring and testing
  getResilientStats: () => {
    const stats = resilientFinder.getStats();
    console.log('[LI Helper] Resilient finder performance:', stats);
    return stats;
  },
  
  testResilientFinder: async () => {
    console.log('[LI Helper] Testing resilient finder strategies...');
    
    const tests = [
      { type: 'addNoteButton', description: 'Add Note Button' },
      { type: 'nameElement', description: 'Name Element' },
      { type: 'messageTextarea', description: 'Message Textarea' }
    ];
    
    const results = {};
    
    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await resilientFinder.findElement({ type: test.type });
        const duration = Date.now() - startTime;
        
        results[test.type] = {
          found: !!result,
          duration: duration + 'ms',
          strategy: result?.strategy || 'none',
          selector: result?.selector || 'none'
        };
        
        console.log(`${test.description}: ${result ? '✅ Found' : '❌ Not found'} (${duration}ms)`);
        if (result) {
          console.log(`  Strategy: ${result.strategy}, Selector: ${result.selector}`);
        }
      } catch (error) {
        results[test.type] = {
          found: false,
          error: error.message
        };
        console.log(`${test.description}: ❌ Error - ${error.message}`);
      }
    }
    
    return results;
  },
  
  resetResilientFinder: () => {
    resilientFinder.reset();
    console.log('[LI Helper] Resilient finder cache and stats reset');
  },
  
  testAdaptiveSelectors: () => {
    console.log('[LI Helper] Testing adaptive selector learning...');
    console.log('Current cache:', resilientFinder.selectorCache);
    console.log('Strategy success rates:', resilientFinder.strategyStats);
    
    // Show which strategies are working best
    const strategies = Object.entries(resilientFinder.strategyStats)
      .map(([name, stats]) => ({
        name,
        attempts: stats.attempts,
        successes: stats.success,
        rate: stats.attempts > 0 ? (stats.success / stats.attempts * 100).toFixed(1) + '%' : '0%'
      }))
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
    
    console.table(strategies);
    return strategies;
  },
  
  // Operation Queue monitoring and testing
  getQueueStats: () => {
    const stats = operationQueue.getStats();
    console.log('[LI Helper] Operation queue statistics:', stats);
    return stats;
  },
  
  testOperationQueue: async () => {
    console.log('[LI Helper] Testing operation queue with sample operations...');
    
    const results = {};
    
    // Test parallel operations
    const promises = [];
    
    // Add some test operations
    promises.push(
      operationQueue.enqueue('test_operation_1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Test 1 completed';
      }, { priority: 5 })
    );
    
    promises.push(
      operationQueue.enqueue('test_operation_2', async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'Test 2 completed';
      }, { priority: 8 })
    );
    
    promises.push(
      operationQueue.enqueue('test_operation_3', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'Test 3 completed';
      }, { priority: 10 })
    );
    
    try {
      const allResults = await Promise.all(promises);
      results.success = true;
      results.operations = allResults;
      results.stats = operationQueue.getStats();
      
      console.log('✅ All test operations completed:', allResults);
      console.log('Queue stats after test:', results.stats);
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      console.log('❌ Test operations failed:', error.message);
    }
    
    return results;
  },
  
  testOperationRetry: async () => {
    console.log('[LI Helper] Testing operation retry logic...');
    
    let attemptCount = 0;
    
    try {
      const result = await operationQueue.enqueue('test_retry_operation', async () => {
        attemptCount++;
        console.log(`Retry test attempt ${attemptCount}`);
        
        if (attemptCount < 3) {
          throw new Error(`Simulated failure on attempt ${attemptCount}`);
        }
        
        return `Success on attempt ${attemptCount}`;
      }, {
        retryable: true,
        onRetry: (error, attempt) => {
          console.log(`Retry callback: ${error.message}, attempt ${attempt}`);
        }
      });
      
      console.log('✅ Retry test completed:', result);
      return { success: true, result, totalAttempts: attemptCount };
      
    } catch (error) {
      console.log('❌ Retry test failed:', error.message);
      return { success: false, error: error.message, totalAttempts: attemptCount };
    }
  },
  
  getOperationHistory: () => {
    const history = operationQueue.operationHistory;
    console.log(`[LI Helper] Operation history (${history.length} operations):`);
    console.table(history.slice(-10)); // Show last 10 operations
    return history;
  },
  
  clearOperationHistory: () => {
    operationQueue.clearHistory();
    console.log('[LI Helper] Operation history cleared');
  },
  
  cancelPendingOperations: () => {
    operationQueue.cancelAll();
    console.log('[LI Helper] All pending operations cancelled');
  },
  
  // Error Boundary and Circuit Breaker monitoring
  getCircuitBreakerStats: () => {
    const stats = errorBoundary.getCircuitBreakerStats();
    console.log('[LI Helper] Circuit breaker statistics:', stats);
    console.table(Object.entries(stats).map(([operation, data]) => ({
      operation,
      state: data.state,
      failures: data.consecutiveFailures,
      successes: data.consecutiveSuccesses,
      uptime: data.uptime + '%',
      lastError: data.lastError || 'None'
    })));
    return stats;
  },
  
  testErrorBoundary: async () => {
    console.log('[LI Helper] Testing error boundary with simulated failures...');
    
    const results = {};
    
    // Test 1: Successful operation
    try {
      const result1 = await errorBoundary.protect('test_success', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Success result';
      }, {
        enableCircuitBreaker: true,
        userFriendlyName: 'Test Success Operation'
      });
      
      results.successTest = { success: true, result: result1 };
      console.log('✅ Success test passed:', result1);
    } catch (error) {
      results.successTest = { success: false, error: error.message };
    }
    
    // Test 2: Failing operation with fallback
    try {
      errorBoundary.fallbackStrategies.set('test_fallback', async (error) => {
        return 'Fallback executed successfully';
      });
      
      const result2 = await errorBoundary.protect('test_fallback', async () => {
        throw new Error('Simulated failure');
      }, {
        enableCircuitBreaker: true,
        enableGracefulDegradation: true,
        userFriendlyName: 'Test Fallback Operation'
      });
      
      results.fallbackTest = { success: true, result: result2 };
      console.log('✅ Fallback test passed:', result2);
    } catch (error) {
      results.fallbackTest = { success: false, error: error.message };
    }
    
    // Test 3: Circuit breaker trigger test
    try {
      let attempts = 0;
      const failingOperation = async () => {
        attempts++;
        throw new Error(`Failure attempt ${attempts}`);
      };
      
      // Trigger circuit breaker by causing multiple failures
      for (let i = 0; i < 4; i++) {
        try {
          await errorBoundary.protect('test_circuit_breaker', failingOperation, {
            enableCircuitBreaker: true,
            enableGracefulDegradation: false,
            enableRetry: false,
            userFriendlyName: 'Test Circuit Breaker'
          });
        } catch (error) {
          // Expected to fail
        }
      }
      
      const circuitStats = errorBoundary.getCircuitBreakerStats();
      results.circuitBreakerTest = {
        success: true,
        circuitState: circuitStats.test_circuit_breaker?.state || 'Unknown',
        failures: circuitStats.test_circuit_breaker?.consecutiveFailures || 0
      };
      
      console.log('✅ Circuit breaker test completed:', results.circuitBreakerTest);
    } catch (error) {
      results.circuitBreakerTest = { success: false, error: error.message };
    }
    
    console.log('Error boundary test results:', results);
    return results;
  },
  
  testFallbackStrategies: async () => {
    console.log('[LI Helper] Testing fallback strategies...');
    
    const strategies = ['modal_detection', 'textarea_detection', 'message_insertion', 'name_detection'];
    const results = {};
    
    for (const strategy of strategies) {
      try {
        console.log(`Testing fallback for: ${strategy}`);
        const fallbackFn = errorBoundary.fallbackStrategies.get(strategy);
        
        if (fallbackFn) {
          const result = await fallbackFn(new Error('Test error'), { test: true });
          results[strategy] = { success: true, result };
          console.log(`✅ ${strategy} fallback executed:`, result);
        } else {
          results[strategy] = { success: false, error: 'No fallback strategy found' };
          console.log(`❌ ${strategy} has no fallback strategy`);
        }
      } catch (error) {
        results[strategy] = { success: false, error: error.message };
        console.log(`❌ ${strategy} fallback failed:`, error.message);
      }
    }
    
    return results;
  },
  
  resetCircuitBreakers: () => {
    errorBoundary.resetAllCircuitBreakers();
    console.log('[LI Helper] All circuit breakers reset');
  },
  
  resetCircuitBreaker: (operationName) => {
    if (!operationName) {
      console.log('Usage: liHelperDebug.resetCircuitBreaker("operation_name")');
      console.log('Available operations:', Object.keys(errorBoundary.getCircuitBreakerStats()));
      return;
    }
    
    errorBoundary.resetCircuitBreaker(operationName);
    console.log(`[LI Helper] Circuit breaker reset for: ${operationName}`);
  },
  
  simulateFailure: async (operationName) => {
    if (!operationName) {
      console.log('Usage: await liHelperDebug.simulateFailure("operation_name")');
      console.log('Available operations: connect_button_click, modal_detection, textarea_detection, message_insertion, name_detection');
      return;
    }
    
    console.log(`[LI Helper] Simulating failure for: ${operationName}`);
    
    try {
      await errorBoundary.protect(operationName, async () => {
        throw new Error(`Simulated failure for ${operationName}`);
      }, {
        enableCircuitBreaker: true,
        enableGracefulDegradation: true,
        userFriendlyName: `Simulated ${operationName}`,
        metadata: { simulated: true }
      });
    } catch (error) {
      console.log(`Failure simulation completed for ${operationName}:`, error.message);
    }
    
    // Show updated circuit breaker state
    const stats = errorBoundary.getCircuitBreakerStats();
    if (stats[operationName]) {
      console.log(`Circuit breaker state for ${operationName}:`, stats[operationName]);
    }
  }
};

// Storage management commands
window.liHelperStorage = {
  // View current configuration
  getConfig: async () => {
    const config = await storageManager.loadConfig();
    console.log('[LI Helper] Current configuration:', config);
    return config;
  },

  // Update personal information
  updatePersonal: async (personalInfo) => {
    if (!personalInfo || typeof personalInfo !== 'object') {
      console.log('[LI Helper] Usage: liHelperStorage.updatePersonal({name: "Your Name", title: "Your Title", background: "Your Background"})');
      return false;
    }
    
    const success = await templateProcessor.updatePersonalInfo(personalInfo);
    if (success) {
      console.log('[LI Helper] ✓ Personal information updated');
      console.log('New variables available:', templateProcessor.getDefaultVariables());
    }
    return success;
  },

  // Quick personal info setup
  setupPersonal: async (name, title, background) => {
    if (!name || !title || !background) {
      console.log('[LI Helper] Usage: liHelperStorage.setupPersonal("Your Name", "Your Title", "Your Background")');
      console.log('Example: liHelperStorage.setupPersonal("John Smith", "Software Engineer", "passionate about AI")');
      return false;
    }
    
    return await liHelperStorage.updatePersonal({
      name: name,
      title: title,
      background: background
    });
  },

  // Get storage info
  getStorageInfo: async () => {
    const info = await storageManager.getStorageInfo();
    if (info) {
      console.log(`[LI Helper] Storage Usage: ${info.used} bytes (${info.percentage}% of ${info.quota} bytes)`);
      console.log(`Available: ${info.available} bytes`);
    }
    return info;
  },

  // Export configuration
  export: async () => {
    const exported = await storageManager.exportConfig();
    if (exported) {
      console.log('[LI Helper] Configuration export (copy this for backup):');
      console.log(JSON.stringify(exported, null, 2));
    }
    return exported;
  },

  // Import configuration
  import: async (importData) => {
    if (!importData) {
      console.log('[LI Helper] Usage: liHelperStorage.import(exportedData)');
      return false;
    }
    
    const config = await storageManager.importConfig(importData);
    if (config) {
      // Reload template processor with new data
      await templateProcessor.loadFromStorage();
      console.log('[LI Helper] ✓ Configuration imported and reloaded');
    }
    return config;
  },

  // Reset to defaults
  reset: async () => {
    const confirmed = confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.');
    if (confirmed) {
      const config = await storageManager.resetToDefaults();
      if (config) {
        await templateProcessor.loadFromStorage();
        console.log('[LI Helper] ✓ Configuration reset to defaults');
      }
      return config;
    }
    return false;
  },

  // Test template variables
  testVariables: () => {
    const variables = templateProcessor.getDefaultVariables();
    console.log('[LI Helper] Current template variables:');
    console.table(variables);
    return variables;
  }
};

// Template customization commands
window.liHelperTemplates = {
  // View available templates
  list: () => {
    const templates = templateProcessor.getAllTemplates();
    console.log('[LI Helper] Available templates:');
    Object.entries(templates).forEach(([key, template]) => {
      console.log(`\n📝 ${key}: ${template.name}`);
      console.log(`   ${template.custom ? '(Custom)' : '(Default)'}`);
      console.log(`   Preview: ${template.template.substring(0, 80)}...`);
    });
    return templates;
  },

  // View specific template
  view: (templateName) => {
    const template = templateProcessor.getTemplate(templateName);
    if (template) {
      console.log(`[LI Helper] Template: ${template.name}`);
      console.log(template.template);
      return template;
    } else {
      console.log(`[LI Helper] Template "${templateName}" not found`);
      return null;
    }
  },

  // Add custom template (now async)
  add: async (name, templateText, description) => {
    if (!name || !templateText) {
      console.log('[LI Helper] Usage: await liHelperTemplates.add("templateName", "template text", "description")');
      console.log('Available variables: {firstName}, {company}, {role}, {headline}, {university}, {myName}, {myTitle}, {myBackground}');
      return false;
    }
    
    const success = await templateProcessor.addCustomTemplate(name, templateText, description);
    if (success) {
      console.log(`[LI Helper] ✓ Added custom template: ${name}`);
    } else {
      console.log(`[LI Helper] ✗ Failed to add template: ${name}`);
    }
    return success;
  },

  // Remove custom template
  remove: async (name) => {
    if (!name) {
      console.log('[LI Helper] Usage: await liHelperTemplates.remove("templateName")');
      return false;
    }
    
    const success = await templateProcessor.removeCustomTemplate(name);
    if (success) {
      console.log(`[LI Helper] ✓ Removed custom template: ${name}`);
    } else {
      console.log(`[LI Helper] ✗ Failed to remove template: ${name} (might not exist)`);
    }
    return success;
  },

  // Test template processing
  test: (templateName, testData = {}) => {
    const template = templateProcessor.getTemplate(templateName);
    if (!template) {
      console.log(`[LI Helper] Template "${templateName}" not found`);
      return null;
    }

    const sampleData = {
      firstName: 'John',
      company: 'TechCorp',
      role: 'Software Engineer',
      headline: 'Passionate developer at TechCorp',
      university: 'MIT',
      ...testData
    };

    const result = templateProcessor.processTemplate(template.template, sampleData);
    console.log('[LI Helper] Template test result:');
    console.log('─'.repeat(50));
    console.log(result);
    console.log('─'.repeat(50));
    return result;
  },

  // Export templates for backup
  export: () => {
    const exported = templateProcessor.exportTemplates();
    console.log('[LI Helper] Template export (copy this for backup):');
    console.log(JSON.stringify(exported, null, 2));
    return exported;
  },

  // Show template variables help
  help: () => {
    console.log(`
[LI Helper] Template System Help

📝 AVAILABLE VARIABLES:
{firstName}    - First name (e.g., "John")
{fullName}     - Full name (e.g., "John Smith")  
{company}      - Company name (e.g., "Google")
{role}         - Job title (e.g., "Software Engineer")
{headline}     - LinkedIn headline 
{university}   - University name (e.g., "MIT")
{location}     - Location (e.g., "San Francisco, CA")
{myName}       - Your name (customizable)
{myTitle}      - Your title (customizable)
{myBackground} - Your background (customizable)

🔧 COMMANDS:
liHelperTemplates.list()                    - Show all templates
liHelperTemplates.view("engineer")          - View specific template
liHelperTemplates.add("myTemplate", "Hi {firstName}...")  - Add custom template
liHelperTemplates.test("engineer")          - Test template with sample data
liHelperTemplates.export()                 - Export all templates

📖 EXAMPLE:
liHelperTemplates.add("casual", 
  "Hey {firstName}! I'm {myName}, would love to connect and chat about {company}!"
);
    `);
  }
};

  console.log('[LI Helper] Global objects created successfully!');
  console.log('🔧 Debug commands: liHelperDebug.getErrors(), liHelperDebug.getResourceStats(), liHelperDebug.getResilientStats(), liHelperDebug.getQueueStats(), liHelperDebug.getCircuitBreakerStats()');
  console.log('🧪 Testing commands: await liHelperDebug.testResilientFinder(), await liHelperDebug.testOperationQueue(), await liHelperDebug.testErrorBoundary()');
  console.log('⚡ Queue commands: liHelperDebug.getOperationHistory(), liHelperDebug.cancelPendingOperations(), liHelperDebug.clearOperationHistory()');
  console.log('🛡️ Error Boundary: await liHelperDebug.testFallbackStrategies(), liHelperDebug.resetCircuitBreakers(), await liHelperDebug.simulateFailure("operation_name")');
  console.log('💾 Storage commands: liHelperStorage.getConfig(), liHelperStorage.setupPersonal(), liHelperStorage.testVariables()');
  console.log('📝 Template commands: liHelperTemplates.list(), liHelperTemplates.help(), await liHelperTemplates.add()');
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 5.4 System Startup - Final Initialization & Global Setup                  │
// └─────────────────────────────────────────────────────────────────────────────┘

// Initialize global objects immediately
setupGlobalObjects();

console.log('LinkedIn Connection Helper is ready!');

// Test global objects accessibility (CSP-safe)
const accessibilityTestTimeoutId = setTimeout(() => {
  console.log('[LI Helper] Testing global object accessibility...');
  
  const tests = {
    'window.liHelperStorage': window.liHelperStorage,
    'window.liHelperDebug': window.liHelperDebug,
    'window.liHelperTemplates': window.liHelperTemplates
  };
  
  Object.entries(tests).forEach(([name, obj]) => {
    if (obj && typeof obj === 'object') {
      console.log(`✅ ${name}: Available`);
    } else {
      console.error(`❌ ${name}: Not available`);
    }
  });
  
  // If everything is available, show usage instructions
  if (tests['window.liHelperStorage'] && tests['window.liHelperDebug'] && tests['window.liHelperTemplates']) {
    console.log('\n🎉 All global objects are ready for use!');
    console.log('\n📖 Quick Start:');
    console.log('  await liHelperStorage.setupPersonal("Your Name", "Your Title", "Your Background")');
    console.log('\n🧪 Test Systems:');
    console.log('  await liHelperDebug.testResilientFinder() // Test DOM detection');
    console.log('  await liHelperDebug.testOperationQueue()  // Test operation queue');
    console.log('  await liHelperDebug.testErrorBoundary()   // Test error boundaries');
    console.log('\n📊 Monitor Performance:');
    console.log('  liHelperDebug.getResilientStats()        // DOM finder stats');
    console.log('  liHelperDebug.getQueueStats()            // Operation queue stats');
    console.log('  liHelperDebug.getCircuitBreakerStats()   // Error boundary stats');
    console.log('  liHelperDebug.getResourceStats()         // Memory usage');
    console.log('\n⚡ Operation Management:');
    console.log('  liHelperDebug.getOperationHistory()      // View operation history');
    console.log('  liHelperDebug.cancelPendingOperations()  // Cancel pending operations');
    console.log('\n🛡️ Error Boundary Testing:');
    console.log('  await liHelperDebug.testFallbackStrategies() // Test fallback strategies');
    console.log('  await liHelperDebug.simulateFailure("modal_detection") // Simulate failures');
    console.log('  liHelperDebug.resetCircuitBreakers()     // Reset all circuit breakers');
  }
}, 2000);

// Register timeout for cleanup
resourceManager.addTimer(accessibilityTestTimeoutId);

// Message handling for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[LI Helper] Message received:', message);
  
  if (message.action === 'reloadConfig') {
    console.log('[LI Helper] Reloading configuration from popup...');
    
    // Reload template processor with new config
    templateProcessor.loadFromStorage().then(() => {
      console.log('[LI Helper] Configuration reloaded successfully');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('[LI Helper] Error reloading configuration:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'getStatus') {
    sendResponse({
      success: true,
      extensionEnabled: extensionEnabled,
      config: templateProcessor.personalInfo
    });
  }
});

// Log session start
elementFinder.errorReporter.logError('INFO', 'Extension loaded successfully', {
  url: window.location.href,
  timestamp: Date.now(),
  version: '3.1 - Enterprise-Grade Modular Architecture',
  availableTemplates: Object.keys(templateProcessor.defaultTemplates)
});

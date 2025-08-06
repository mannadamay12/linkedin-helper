// LinkedIn Connection Helper - Performance Optimized Version
console.log('LinkedIn Connection Helper v3.2 - Performance Optimized loading...');

// Simplified, high-performance element finder
class FastElementFinder {
  constructor() {
    this.debug = false; // Disable debug logging for performance
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[LI Helper] ${message}`, data || '');
    }
  }

  // Fast element detection with minimal delays
  async findElement(selectors, options = {}) {
    const maxAttempts = options.maxAttempts || 10; // Reduced from 15
    const delay = options.delay || 50; // Reduced from 200ms
    const validator = options.validator || (() => true);
    
    return new Promise((resolve) => {
      let attempts = 0;
      
      const tryFind = () => {
        attempts++;
        
        // Try each selector immediately
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element && validator(element)) {
              this.log(`✓ Found element: ${selector}`);
              return resolve({ element, selector });
            }
          } catch (e) {
            // Silent fail for performance
          }
        }
        
        // Quick retry with minimal delay
        if (attempts < maxAttempts) {
          setTimeout(tryFind, delay);
        } else {
          this.log(`✗ Element not found after ${maxAttempts} attempts`);
          resolve(null);
        }
      };
      
      tryFind();
    });
  }

  // Fast modal detection
  async findAddNoteButton() {
    const selectors = [
      'button[aria-label="Add a note"]',
      'button[data-test-modal-add-note-btn]',
      'button:contains("Add a note")',
      '.artdeco-modal button[aria-label*="note"]'
    ];
    
    return this.findElement(selectors, {
      maxAttempts: 5, // Reduced attempts
      delay: 100, // Faster retry
      validator: (el) => el.textContent.includes('Add a note') || el.getAttribute('aria-label')?.includes('Add a note')
    });
  }

  async findNameElement() {
    const selectors = [
      '.send-invite__title',
      '.artdeco-modal__header h2',
      '.artdeco-modal__header h1',
      '.artdeco-modal strong',
      '[role="dialog"] strong'
    ];
    
    return this.findElement(selectors, {
      maxAttempts: 5,
      delay: 100,
      validator: (el) => {
        const text = el.textContent?.trim();
        const excludeWords = ['add', 'note', 'connect', 'invite', 'send'];
        const isExcluded = excludeWords.some(word => text.toLowerCase().includes(word));
        
        return text && text.length > 2 && text.length < 100 && !isExcluded;
      }
    });
  }

  async findMessageTextarea() {
    const selectors = [
      'textarea[name="message"]',
      '#custom-message',
      'textarea[id*="message"]',
      '.artdeco-modal textarea'
    ];
    
    return this.findElement(selectors, {
      maxAttempts: 5,
      delay: 100,
      validator: (el) => el.tagName === 'TEXTAREA' && !el.disabled
    });
  }

  // Fast profile data extraction
  async extractProfileData() {
    const data = {};
    
    // Extract name from profile page (fast fallback)
    try {
      const nameSelectors = [
        '.pv-text-details__left-panel h1',
        '.ph5.pb5 h1',
        '.pv-top-card-v3__name',
        'main h1:first-of-type'
      ];
      
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          const text = element.textContent.trim();
          if (/^[A-Za-z\s\.\-']{2,50}$/.test(text)) {
            data.firstName = text.split(' ')[0];
            break;
          }
        }
      }
    } catch (error) {
      // Silent fail
    }

    // Extract role and company (simplified)
    try {
      const headlineSelectors = [
        '.text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        '.pv-top-card-v3__headline'
      ];
      
      for (const selector of headlineSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          const headline = element.textContent.trim();
          
          // Simple parsing
          if (headline.includes(' @ ')) {
            const parts = headline.split(' @ ');
            data.role = parts[0].trim();
            data.company = parts[1].split(/[|,]/)[0].trim();
          } else if (headline.includes(' at ')) {
            const parts = headline.split(' at ');
            data.role = parts[0].trim();
            data.company = parts[1].split(/[|,]/)[0].trim();
          }
          break;
        }
      }
    } catch (error) {
      // Silent fail
    }

    return data;
  }
}

// Simplified storage manager
class FastStorageManager {
  constructor() {
    this.storageKey = 'liHelper';
    this.config = null;
  }

  async loadConfig() {
    if (this.config) return this.config;
    
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      this.config = result[this.storageKey] || this.getDefaultConfig();
      return this.config;
    } catch (error) {
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  getDefaultConfig() {
    return {
      personalInfo: {
        name: 'Your Name',
        title: 'Your Title',
        background: 'Your Background'
      },
      templateSettings: {
        defaultTemplate: 'general'
      }
    };
  }

  async updatePersonalInfo(personalInfo) {
    this.config.personalInfo = { ...this.config.personalInfo, ...personalInfo };
    try {
      await chrome.storage.sync.set({ [this.storageKey]: this.config });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Simplified template processor
class FastTemplateProcessor {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.templates = this.getDefaultTemplates();
  }

  getDefaultTemplates() {
    return {
      general: `Hi {firstName},

I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your journey at {company} and any insights you might share.

Best regards`,
      
      engineer: `Hi {firstName},

I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your experience as {role} at {company}. Would appreciate any insights about the interview process and work culture.

Best regards`
    };
  }

  processTemplate(template, variables) {
    let processed = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value || '');
    });
    
    return processed.trim();
  }

  getTemplate(name) {
    return this.templates[name] || this.templates.general;
  }
}

// Initialize fast components
const elementFinder = new FastElementFinder();
const storageManager = new FastStorageManager();
const templateProcessor = new FastTemplateProcessor(storageManager);

// Extension state
let extensionEnabled = true;

// Fast modal detection with minimal overhead
async function waitForConnectionModal() {
  elementFinder.log('Waiting for connection modal...');
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 20; // Reduced from 50
    const delay = 100; // Reduced from 200ms
    
    const checkModal = () => {
      attempts++;
      
      const modalExists = 
        document.querySelector('.artdeco-modal') ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.send-invite');
      
      if (modalExists) {
        elementFinder.log(`✓ Modal detected after ${attempts * delay}ms`);
        resolve(modalExists);
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkModal, delay);
      } else {
        elementFinder.log(`✗ Modal not detected after ${maxAttempts * delay}ms`);
        reject(new Error('Modal not detected'));
      }
    };
    
    checkModal();
  });
}

// Fast textarea detection
async function waitForTextarea() {
  elementFinder.log('Waiting for textarea...');
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 15; // Reduced from 30
    const delay = 100;
    
    const checkTextarea = () => {
      attempts++;
      
      const textareaExists = 
        document.querySelector('textarea[name="message"]') ||
        document.querySelector('#custom-message') ||
        document.querySelector('.artdeco-modal textarea');
      
      if (textareaExists) {
        elementFinder.log(`✓ Textarea detected after ${attempts * delay}ms`);
        resolve(textareaExists);
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkTextarea, delay);
      } else {
        elementFinder.log(`✗ Textarea not detected after ${maxAttempts * delay}ms`);
        reject(new Error('Textarea not detected'));
      }
    };
    
    checkTextarea();
  });
}

// Main connection flow - simplified and fast
async function handleConnection() {
  try {
    // Step 1: Wait for modal (max 2 seconds)
    await waitForConnectionModal();
    
    // Step 2: Find and click "Add a note" button
    const addNoteButton = await elementFinder.findAddNoteButton();
    if (!addNoteButton) {
      throw new Error('Add a note button not found');
    }
    
    addNoteButton.element.click();
    
    // Step 3: Wait for textarea (max 1.5 seconds)
    const textarea = await waitForTextarea();
    
    // Step 4: Extract profile data (fast)
    const profileData = await elementFinder.extractProfileData();
    
    // Step 5: Load config and generate message
    const config = await storageManager.loadConfig();
    const personalInfo = config.personalInfo;
    
    const variables = {
      firstName: profileData.firstName || 'there',
      company: profileData.company || 'your company',
      role: profileData.role || 'your role',
      myName: personalInfo.name,
      myTitle: personalInfo.title,
      myBackground: personalInfo.background
    };
    
    const template = templateProcessor.getTemplate('general');
    const message = templateProcessor.processTemplate(template, variables);
    
    // Step 6: Insert message
    textarea.value = message;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    
    // Visual feedback
    textarea.style.border = '2px solid #0a66c2';
    textarea.style.backgroundColor = '#f0f7ff';
    
    setTimeout(() => {
      textarea.style.border = '';
      textarea.style.backgroundColor = '';
    }, 2000);
    
    // Success notification
    showNotification('✓ Message inserted successfully!', 'success');
    
  } catch (error) {
    elementFinder.log('Connection error:', error.message);
    showNotification('⚠️ Could not complete connection. Try again.', 'error');
  }
}

// Click handler - simplified
document.addEventListener('click', function(e) {
  if (!extensionEnabled) return;
  
  const target = e.target;
  const isConnectButton = 
    target.innerText === 'Connect' || 
    target.getAttribute('aria-label')?.includes('Connect') ||
    target.closest('button')?.innerText === 'Connect';
    
  if (isConnectButton) {
    elementFinder.log('Connect button clicked!');
    handleConnection();
  }
});

// Simple notification
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
  `;
  
  notification.innerText = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

// Floating control button
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
`;

toggleButton.addEventListener('click', () => {
  extensionEnabled = !extensionEnabled;
  toggleButton.style.opacity = extensionEnabled ? '1' : '0.5';
  showNotification(
    extensionEnabled ? '✓ Extension enabled' : '⏸ Extension disabled',
    extensionEnabled ? 'success' : 'info'
  );
});

document.body.appendChild(toggleButton);

// Global console commands (simplified)
window.liHelperStorage = {
  getConfig: async () => {
    const config = await storageManager.loadConfig();
    console.log('[LI Helper] Current configuration:', config);
    return config;
  },
  
  setupPersonal: async (name, title, background) => {
    const success = await storageManager.updatePersonalInfo({ name, title, background });
    if (success) {
      console.log('[LI Helper] ✓ Personal information updated');
    }
    return success;
  }
};

// Message handling for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reloadConfig') {
    storageManager.config = null; // Force reload
    sendResponse({ success: true });
  }
  
  if (message.action === 'getStatus') {
    sendResponse({
      success: true,
      extensionEnabled: extensionEnabled,
      config: storageManager.config?.personalInfo
    });
  }
});

console.log('LinkedIn Connection Helper v3.2 - Performance Optimized ready!'); 
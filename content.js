// LinkedIn Connection Helper - Multi-Template Version
console.log('LinkedIn Connection Helper v4.0 - Multi-Template System loading...');

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
        firstName: 'Sachin',
        lastName: 'Adlakha',
        email: 'sa9082@nyu.edu',
        phone: '6466335776',
        university: 'NYU',
        degree: 'MS in Computer Science',
        resumeUrl: ''
      },
      templateSettings: {
        messageType: 'newConnection',
        companyName: '',
        positionTitle: 'Software Engineer Intern',
        opportunityType: 'internship opportunities',
        timeline: 'Summer 2025',
        jobLinks: '',
        recipientName: '',
        autoDetectProfile: true,
        previewBeforeSend: true
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
  }

  getMessageTemplates() {
    return {
      newConnection: (personalInfo, settings, profileData) => {
        const recipientName = profileData.firstName || '';
        const company = settings.companyName || profileData.company || '[Company]';
        const position = settings.positionTitle || 'Intern';
        const timeline = settings.timeline || 'Summer 2025';
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        
        const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
        
        // LinkedIn connection requests have a 300 character limit
        // Keep message concise
        return `${greeting}
I'm interested in applying for the ${position} role at ${company} for ${timeline}. I noticed your experience at the company and would love to learn about your journey. I'd greatly appreciate a referral if possible.
Best regards,
${fullName}`;
      },
      
      afterAcceptance: (personalInfo, settings, profileData) => {
        const recipientName = profileData.firstName || settings.recipientName || '[Recipient\'s Name]';
        const company = settings.companyName || profileData.company || '[Company]';
        const opportunityType = settings.opportunityType || 'internship opportunities';
        const timeline = settings.timeline || 'Summer 2025';
        const jobLinks = settings.jobLinks || '[Insert job links]';
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        const resumeUrl = personalInfo.resumeUrl || '';
        const degree = personalInfo.degree || 'MS in Computer Science';
        const university = personalInfo.university || 'NYU';
        
        return `Hi ${recipientName},

Thank you so much for connecting! I hope you're doing well.

I'm currently a graduate student at ${university} pursuing ${degree} and actively exploring ${opportunityType} for ${timeline}. I came across some exciting positions at ${company} that align perfectly with my background and interests.

${resumeUrl ? `I've included my resume for your reference: ${resumeUrl}\n\n` : ''}I would greatly appreciate any advice you might have on my profile or, if possible, a referral for these roles:

${jobLinks}

Thank you very much for your time and consideration. I look forward to hearing from you.

Best regards,
${fullName}`;
      },
      
      alreadyConnected: (personalInfo, settings, profileData) => {
        const recipientName = profileData.firstName || '';
        const company = settings.companyName || profileData.company || '[Company]';
        const position = settings.positionTitle || 'Software Engineer Intern';
        const timeline = settings.timeline || 'Summer 2025';
        const jobLinks = settings.jobLinks || '';
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        const email = personalInfo.email || 'sa9082@nyu.edu';
        const phone = personalInfo.phone || '6466335776';
        
        const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
        
        return `${greeting}

I hope you're doing well.

I'm reaching out because I'm interested in applying for the ${position} position at ${company} for ${timeline}. Having noticed your experience at the company, I was hoping to learn more about your journey there and gain insights into the work culture.

I would greatly appreciate a referral for the position if you feel my profile would be a good fit.

${jobLinks ? `Job Link: ${jobLinks}\n\n` : ''}Here are my details for your reference:
• First Name: ${personalInfo.firstName}
• Last Name: ${personalInfo.lastName}
• Email: ${email}
• Phone: ${phone}

Thank you for your time and assistance.

Best regards,
${fullName}`;
      }
    };
  }

  processTemplate(messageType, personalInfo, settings, profileData) {
    const templates = this.getMessageTemplates();
    const templateFunction = templates[messageType] || templates.newConnection;
    return templateFunction(personalInfo, settings, profileData);
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
    const templateSettings = config.templateSettings || {};
    
    // Determine message type based on context
    const messageType = templateSettings.messageType || 'newConnection';
    
    // Generate message using new template system
    const message = templateProcessor.processTemplate(
      messageType,
      personalInfo,
      templateSettings,
      profileData
    );
    
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

// Detect if we're in a messaging context
function isMessagingPage() {
  return window.location.href.includes('/messaging/') || 
         document.querySelector('.msg-overlay-conversation-bubble') ||
         document.querySelector('.msg-form__contenteditable') ||
         document.querySelector('.msg-form__msg-content-container');
}

// Insert message into chat/messaging box
async function insertMessageIntoChat() {
  console.log('[LI Helper] Starting message insertion...');
  
  try {
    // Find the message input area (LinkedIn uses different selectors)
    const messageBoxSelectors = [
      '.msg-form__contenteditable[contenteditable="true"]',
      '.msg-form__msg-content-container [contenteditable="true"]',
      '[aria-label*="Write a message"]',
      '.msg-s-message-list-content .msg-form__contenteditable',
      'div[role="textbox"][contenteditable="true"]'
    ];
    
    let messageBox = null;
    
    // First, try the most specific selector
    messageBox = document.querySelector('.msg-form__contenteditable[contenteditable="true"]');
    
    // If not found, try other selectors
    if (!messageBox) {
      for (const selector of messageBoxSelectors) {
        const element = document.querySelector(selector);
        // Validate that this is likely the message box
        if (element && 
            element.isContentEditable && 
            element.tagName !== 'BODY' &&
            element.offsetWidth < 800 && // Message boxes are typically not full width
            element.offsetHeight < 300) { // And not too tall
          messageBox = element;
          console.log('[LI Helper] Found message box with selector:', selector);
          break;
        }
      }
    }
    
    if (!messageBox) {
      console.log('[LI Helper] Could not find message box, showing notification');
      showNotification('⚠️ Could not find message box. Please click in the message area first.', 'error');
      return;
    }
    
    console.log('[LI Helper] Message box found:', messageBox);
    
    // Extract profile data from conversation header
    const profileData = await extractChatProfileData();
    
    // Load config and generate message
    const config = await storageManager.loadConfig();
    const personalInfo = config.personalInfo;
    const templateSettings = config.templateSettings || {};
    
    // Generate message based on selected type
    const message = templateProcessor.processTemplate(
      templateSettings.messageType,
      personalInfo,
      templateSettings,
      profileData
    );
    
    // Try to insert the message in a safe way
    try {
      // First, clear any existing content safely
      messageBox.innerHTML = '';
      
      // Try using the simplest method first - just plain text
      messageBox.textContent = message;
      
      // Alternative: Create text nodes for better compatibility
      /*
      const lines = message.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) {
          messageBox.appendChild(document.createElement('br'));
        }
        if (line.trim()) {
          const textNode = document.createTextNode(line);
          messageBox.appendChild(textNode);
        }
      });
      */
    } catch (innerError) {
      console.error('[LI Helper] Error setting message content:', innerError);
      // Fallback to the most basic method
      messageBox.innerText = message;
    }
    
    // Trigger various events to ensure LinkedIn recognizes the change
    const events = ['input', 'change', 'keyup', 'keydown'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      messageBox.dispatchEvent(event);
    });
    
    // Set cursor to end of text
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(messageBox);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Focus the message box
    messageBox.focus();
    
    // Visual feedback - only apply subtle border, not background
    const originalBorder = messageBox.style.border;
    messageBox.style.outline = '2px solid #0a66c2';
    messageBox.style.outlineOffset = '-2px';
    
    setTimeout(() => {
      messageBox.style.outline = '';
      messageBox.style.outlineOffset = '';
    }, 2000);
    
    showNotification('✓ Message inserted! Review and click Send.', 'success');
    
  } catch (error) {
    console.error('[LI Helper] Error inserting message:', error);
    showNotification('⚠️ Error inserting message. Please try again.', 'error');
  }
}

// Extract profile data from chat conversation
async function extractChatProfileData() {
  const data = {};
  
  try {
    // Try to get name from conversation header
    const headerSelectors = [
      '.msg-overlay-bubble-header__title',
      '.msg-entity-lockup__entity-title',
      '.msg-thread__link-to-profile span',
      '.msg-overlay-bubble-header__details h2',
      '.msg-conversation-card__title'
    ];
    
    for (const selector of headerSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        const fullName = element.textContent.trim();
        data.firstName = fullName.split(' ')[0];
        break;
      }
    }
    
    // Try to get company from subtitle
    const subtitleSelectors = [
      '.msg-overlay-bubble-header__subtitle',
      '.msg-entity-lockup__entity-subtitle',
      '.msg-conversation-card__subtitle'
    ];
    
    for (const selector of subtitleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        const subtitle = element.textContent.trim();
        // Parse company from subtitle (usually format: "Role at Company")
        if (subtitle.includes(' at ')) {
          const parts = subtitle.split(' at ');
          data.company = parts[1].trim();
          data.role = parts[0].trim();
        }
        break;
      }
    }
  } catch (error) {
    console.log('[LI Helper] Could not extract all profile data from chat');
  }
  
  return data;
}

// Floating control buttons
const buttonContainer = document.createElement('div');
buttonContainer.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
`;

// Main toggle button
const toggleButton = document.createElement('div');
toggleButton.innerHTML = '🤝';
toggleButton.style.cssText = `
  width: 50px;
  height: 50px;
  background: #0a66c2;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
`;

toggleButton.addEventListener('click', () => {
  extensionEnabled = !extensionEnabled;
  toggleButton.style.opacity = extensionEnabled ? '1' : '0.5';
  showNotification(
    extensionEnabled ? '✓ Extension enabled' : '⏸ Extension disabled',
    extensionEnabled ? 'success' : 'info'
  );
});

// Message insert button (only show on messaging pages)
const messageButton = document.createElement('div');
messageButton.innerHTML = '✉️';
messageButton.style.cssText = `
  width: 50px;
  height: 50px;
  background: #0a66c2;
  color: white;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  z-index: 10000;
`;
messageButton.title = 'Insert template message (or press Ctrl+Shift+M)';

messageButton.addEventListener('click', async () => {
  if (extensionEnabled) {
    // Try alternative method if first one fails
    try {
      await insertMessageIntoChat();
    } catch (error) {
      console.log('[LI Helper] Trying alternative insertion method...');
      insertMessageAlternative();
    }
  }
});

// Add buttons to container
buttonContainer.appendChild(messageButton);
buttonContainer.appendChild(toggleButton);
document.body.appendChild(buttonContainer);

// Alternative message insertion method
function insertMessageAlternative() {
  try {
    // Find the closest parent that contains the message form
    const msgForm = document.querySelector('.msg-form__msg-content-container');
    if (!msgForm) {
      showNotification('⚠️ Could not find message form. Please try opening a different conversation.', 'error');
      return;
    }
    
    // Find the actual editable div within the form
    const editableDiv = msgForm.querySelector('[contenteditable="true"]') || 
                       msgForm.querySelector('.msg-form__contenteditable');
    
    if (!editableDiv) {
      showNotification('⚠️ Could not find message input area.', 'error');
      return;
    }
    
    // Get the message
    const config = storageManager.config || storageManager.getDefaultConfig();
    const personalInfo = config.personalInfo;
    const templateSettings = config.templateSettings || {};
    const profileData = { firstName: '' }; // Basic fallback
    
    const message = templateProcessor.processTemplate(
      templateSettings.messageType,
      personalInfo,
      templateSettings,
      profileData
    );
    
    // Simple text insertion for fallback
    editableDiv.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, message);
    
    showNotification('✓ Message inserted using fallback method!', 'success');
  } catch (error) {
    console.error('[LI Helper] Alternative insertion failed:', error);
    showNotification('⚠️ Could not insert message. Try copying from the popup instead.', 'error');
  }
}

// Show/hide message button based on page
setInterval(() => {
  if (isMessagingPage() && extensionEnabled) {
    messageButton.style.display = 'flex';
  } else {
    messageButton.style.display = 'none';
  }
}, 1000);

// Keyboard shortcut support (Ctrl+Shift+M or Cmd+Shift+M)
document.addEventListener('keydown', (e) => {
  if (!extensionEnabled) return;
  
  // Check for Ctrl/Cmd + Shift + M
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
    e.preventDefault();
    
    if (isMessagingPage()) {
      // Insert message in chat
      insertMessageIntoChat();
    } else {
      // Show notification about the shortcut
      showNotification('💡 Use this shortcut in LinkedIn messaging to insert templates', 'info');
    }
  }
});

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

console.log('LinkedIn Connection Helper v4.0 - Multi-Template System ready!'); 
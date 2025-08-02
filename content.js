// LinkedIn Connection Helper - Content Script
console.log('LinkedIn Connection Helper loaded!');

// Enhanced reliability system with comprehensive error handling
class LinkedInElementFinder {
  constructor() {
    this.debug = true;
    this.retryAttempts = 15;
    this.retryDelay = 200;
    this.errorReporter = new ErrorReporter();
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
          setTimeout(tryFind, delay);
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

  // Specific finder methods for different LinkedIn elements
  async findAddNoteButton() {
    const selectorGroups = [
      {
        name: 'Primary Add Note Button',
        selectors: [
          'button[aria-label="Add a note"]',
          'button[data-test-modal-add-note-btn]'
        ],
        validator: (el) => el.textContent.includes('Add a note') || el.getAttribute('aria-label')?.includes('Add a note')
      },
      {
        name: 'Secondary Add Note Patterns',
        selectors: [
          'button[aria-label*="note"]',
          '[data-test*="note"] button',
          '.artdeco-modal button[aria-label*="note"]'
        ],
        validator: (el) => el.textContent.toLowerCase().includes('note')
      },
      {
        name: 'Fallback Text Search',
        selectors: ['button'],
        validator: (el) => el.textContent.trim() === 'Add a note'
      }
    ];

    const result = await this.findElementWithRetry(selectorGroups);
    if (!result) {
      this.errorReporter.logElementNotFound('button', selectorGroups.flatMap(g => g.selectors), { buttonType: 'Add a note' });
    }
    return result;
  }

  async findNameElement() {
    const selectorGroups = [
      {
        name: 'Modal Title Elements',
        selectors: [
          '.send-invite__title',
          '.artdeco-modal__header h2',
          '.artdeco-modal__header h1', 
          '.artdeco-modal__header strong',
          '.pv-modal__header strong',
          // More specific LinkedIn modal selectors
          '.artdeco-modal h1:first-child',
          '.artdeco-modal h2:first-child',
          '.artdeco-modal [data-test-modal-title]',
          '.send-invite h1',
          '.send-invite h2',
          // Additional modal title patterns
          '.artdeco-modal-header__title',
          '.artdeco-modal .artdeco-modal-header h1',
          '.artdeco-modal .artdeco-modal-header h2'
        ],
        validator: (el) => {
          const text = el.textContent?.trim();
          // More specific validation for modal titles
          const excludeWords = ['add', 'note', 'connect', 'invite', 'send', 'message', 'save', 'cancel', 'close', 'to', 'how do you know'];
          const isExcluded = excludeWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
          
          return text && 
                 text.length > 2 && 
                 text.length < 100 && 
                 !isExcluded &&
                 /^[A-Za-z\s\.\-']{2,}$/.test(text);
        }
      },
      {
        name: 'Modal Content Strong Tags',
        selectors: [
          '.artdeco-modal strong',
          '[role="dialog"] strong',
          '.invitation-card__title',
          '.invitation-card__name'
        ],
        validator: (el) => {
          const text = el.textContent?.trim();
          // Check if it looks like a name (2-4 words, reasonable length, no numbers)
          // Exclude common UI text that might be picked up
          const excludeWords = ['add', 'note', 'connect', 'invite', 'send', 'message', 'save', 'cancel', 'close'];
          const isExcluded = excludeWords.some(word => text.toLowerCase().includes(word));
          
          return text && 
                 /^[A-Za-z\s\.\-']{2,50}$/.test(text) && 
                 text.split(' ').length <= 4 && 
                 !text.includes('@') &&
                 !isExcluded &&
                 text.length >= 3; // Names should be at least 3 characters
        }
      },
      {
        name: 'Generic Header Search',
        selectors: [
          '.artdeco-modal h1',
          '.artdeco-modal h2', 
          '.artdeco-modal h3',
          '[role="dialog"] h1',
          '[role="dialog"] h2'
        ],
        validator: (el) => {
          const text = el.textContent?.trim();
          // Exclude common UI text that might be picked up
          const excludeWords = ['add', 'note', 'connect', 'invite', 'send', 'message', 'save', 'cancel', 'close', 'to'];
          const isExcluded = excludeWords.some(word => text.toLowerCase().includes(word));
          
          return text && 
                 /^[A-Za-z\s\.\-']{2,50}$/.test(text) && 
                 text.split(' ').length <= 4 && 
                 !isExcluded &&
                 text.length >= 3; // Names should be at least 3 characters
        }
      }
    ];

    const result = await this.findElementWithRetry(selectorGroups);
    if (!result) {
      // Enhanced debugging: log what text elements we found
      const debugInfo = {
        modalPresent: !!document.querySelector('.artdeco-modal'),
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
      
      this.errorReporter.logElementNotFound('name', selectorGroups.flatMap(g => g.selectors), debugInfo);
      this.log('Name detection debug info:', debugInfo);
    } else {
      this.log(`Name element found with text: "${result.element.textContent?.trim()}"`);
    }
    return result;
  }

  async findMessageTextarea() {
    const selectorGroups = [
      {
        name: 'Primary Message Fields',
        selectors: [
          'textarea[name="message"]',
          '#custom-message',
          'textarea[id*="message"]'
        ],
        validator: (el) => el.tagName === 'TEXTAREA'
      },
      {
        name: 'Modal Textarea Elements', 
        selectors: [
          '.send-invite__custom-message textarea',
          '.artdeco-modal textarea',
          '[role="dialog"] textarea'
        ],
        validator: (el) => el.tagName === 'TEXTAREA' && !el.disabled
      },
      {
        name: 'Fallback Textarea Search',
        selectors: ['textarea'],
        validator: (el) => {
          const modal = el.closest('.artdeco-modal') || el.closest('[role="dialog"]');
          return modal !== null && !el.disabled;
        }
      }
    ];

    const result = await this.findElementWithRetry(selectorGroups);
    if (!result) {
      this.errorReporter.logElementNotFound('textarea', selectorGroups.flatMap(g => g.selectors), { 
        modalPresent: !!document.querySelector('.artdeco-modal'),
        addNoteClicked: true 
      });
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

// Storage Management System - Handle Chrome storage operations
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

// Template Variables System - Customizable message templates
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

// Comprehensive error handling and reporting system
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

// Initialize storage manager, element finder and template processor
const storageManager = new StorageManager();
const elementFinder = new LinkedInElementFinder();
const templateProcessor = new TemplateProcessor(storageManager);

// Ensure global objects are available after initialization
setTimeout(() => {
  console.log('[LI Helper] Setting up global debug objects...');
  if (typeof window.liHelperStorage === 'undefined') {
    console.log('[LI Helper] liHelperStorage not found, creating it...');
    setupGlobalObjects();
  } else {
    console.log('[LI Helper] Global objects already available');
  }
}, 1000);

// Extension state
let extensionEnabled = true;

// Listen for clicks on Connect buttons
document.addEventListener('click', function(e) {
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
    elementFinder.log('Connect button clicked!');
    waitForConnectionModal();
  }
});

// Smart modal detection using MutationObserver instead of setTimeout
function waitForConnectionModal() {
  elementFinder.log('Waiting for connection modal to appear...');
  
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
          obs.disconnect();
      fillConnectionMessage();
      return;
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✗ Modal not detected after ${actualTime}ms`);
          obs.disconnect();
      
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
      
      // Show user-friendly error with suggestions
      elementFinder.errorReporter.showUserError(
        '⚠️ Connection modal not detected. Try clicking Connect again.',
        'error',
        ['Refresh the page', 'Check internet connection', 'Try different profile']
      );
    }
  });
  
  // Start observing for DOM changes
      observer.observe(document.body, {
        childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'role', 'aria-label']
      });
      
  // Also do an immediate check in case modal is already there
      setTimeout(() => {
    const modalExists = 
      document.querySelector('.artdeco-modal') ||
      document.querySelector('[role="dialog"]');
    
    if (modalExists) {
      elementFinder.log('✓ Modal already present, proceeding immediately');
        observer.disconnect();
      fillConnectionMessage();
    }
  }, 100);
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
      
      // Wait for textarea to appear using MutationObserver
      waitForTextareaAndInsert();
      
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

// Wait for textarea to appear after clicking "Add a note"
function waitForTextareaAndInsert() {
  elementFinder.log('Waiting for message textarea to appear...');
  
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
      obs.disconnect();
      await insertPersonalizedMessage();
      return;
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      const actualTime = Date.now() - startTime;
      elementFinder.log(`✗ Textarea not found after ${actualTime}ms`);
      obs.disconnect();
      
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
      
      // Show user-friendly error with suggestions
      elementFinder.errorReporter.showUserError(
        '⚠️ Message box not found. Try manually clicking "Add a note".',
        'error',
        ['Click "Add a note" button manually', 'Wait for modal to fully load', 'Refresh the page']
      );
    }
  });
  
  // Start observing for DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'name']
  });
  
  // Also do an immediate check in case textarea is already there
  setTimeout(async () => {
    const textareaExists = 
      document.querySelector('textarea[name="message"]') ||
      document.querySelector('#custom-message') ||
      document.querySelector('textarea[id*="message"]');
    
    if (textareaExists) {
      elementFinder.log('✓ Textarea already present, proceeding immediately');
      observer.disconnect();
      await insertPersonalizedMessage();
    }
  }, 50);
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
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
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
  
  setTimeout(() => {
    infoDiv.style.animation = 'fadeOut 0.3s ease-in';
    setTimeout(() => infoDiv.remove(), 300);
  }, 5000);
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

toggleButton.addEventListener('click', () => {
  extensionEnabled = !extensionEnabled;
  toggleButton.style.opacity = extensionEnabled ? '1' : '0.5';
  showNotification(
    extensionEnabled ? '✓ Extension enabled' : '⏸ Extension disabled',
    extensionEnabled ? 'success' : 'info'
  );
});

// Add hover effect
toggleButton.addEventListener('mouseenter', () => {
  toggleButton.style.transform = 'scale(1.1)';
});

toggleButton.addEventListener('mouseleave', () => {
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
  console.log('🔧 Debug commands: liHelperDebug.getErrors(), liHelperDebug.clearErrors(), liHelperDebug.toggleDebug()');
  console.log('💾 Storage commands: liHelperStorage.getConfig(), liHelperStorage.setupPersonal(), liHelperStorage.testVariables()');
  console.log('📝 Template commands: liHelperTemplates.list(), liHelperTemplates.help(), await liHelperTemplates.add()');
}

// Initialize global objects immediately
setupGlobalObjects();

console.log('LinkedIn Connection Helper is ready!');

// Test global objects accessibility (CSP-safe)
setTimeout(() => {
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
    console.log('📖 Try: await liHelperStorage.setupPersonal("Your Name", "Your Title", "Your Background")');
  }
}, 2000);

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
  version: '2.1 - Template System with Popup UI',
  availableTemplates: Object.keys(templateProcessor.defaultTemplates)
});
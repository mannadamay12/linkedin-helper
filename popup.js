// LinkedIn Connection Helper - Popup Script

class PopupManager {
  constructor() {
    this.storageKey = 'liHelper';
    this.currentConfig = null;
    this.templates = {};
    
    this.init();
  }

  async init() {
    console.log('[Popup] Initializing...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load configuration from storage
    await this.loadConfiguration();
    
    // Initialize UI
    this.initializeUI();
    
    console.log('[Popup] Initialization complete');
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.target.closest('.tab-button').dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Personal information form
    const personalForm = document.getElementById('personal-form');
    personalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePersonalInfo();
    });

    // Test variables button
    document.getElementById('test-variables').addEventListener('click', () => {
      this.testVariables();
    });

    // Message type radio buttons
    document.querySelectorAll('input[name="messageType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleMessageTypeChange(e.target.value);
        this.updateTemplatePreview();
      });
    });

    // Template input fields
    ['companyName', 'positionTitle', 'opportunityType', 'timeline', 'jobLinks', 'recipientName'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          this.updateTemplatePreview();
        });
      }
    });

    // Template checkboxes
    document.getElementById('auto-detect-profile').addEventListener('change', (e) => {
      this.updateTemplateSetting('autoDetectProfile', e.target.checked);
    });

    document.getElementById('preview-before-send').addEventListener('change', (e) => {
      this.updateTemplateSetting('previewBeforeSend', e.target.checked);
    });

    // Template actions
    document.getElementById('save-template-settings').addEventListener('click', () => {
      this.saveTemplateSettings();
    });

    document.getElementById('reset-template').addEventListener('click', () => {
      this.resetTemplateFields();
    });

    document.getElementById('copy-message').addEventListener('click', () => {
      this.copyMessageToClipboard();
    });

    // Settings
    this.setupSettingsListeners();

    // Data management
    document.getElementById('export-settings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('import-settings').addEventListener('click', () => {
      this.importSettings();
    });

    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });
  }

  setupSettingsListeners() {
    const settingIds = [
      'extension-enabled',
      'notifications-enabled', 
      'debug-mode',
      'show-detected-info'
    ];

    settingIds.forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', (e) => {
        const settingName = id.replace(/-/g, '');
        // Convert kebab-case to camelCase
        const camelCaseName = settingName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        this.updatePreference(camelCaseName, e.target.checked);
      });
    });
  }

  async loadConfiguration() {
    try {
      this.showLoading(true);
      
      const result = await chrome.storage.sync.get([this.storageKey]);
      this.currentConfig = result[this.storageKey];
      
      if (!this.currentConfig) {
        console.log('[Popup] No configuration found, using defaults');
        this.currentConfig = this.getDefaultConfig();
        await this.saveConfiguration();
      }
      
      console.log('[Popup] Configuration loaded:', this.currentConfig);
      this.updateConnectionStatus(true);
      
    } catch (error) {
      console.error('[Popup] Error loading configuration:', error);
      this.showNotification('Error loading settings', 'error');
      this.updateConnectionStatus(false);
    } finally {
      this.showLoading(false);
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
      },
      preferences: {
        extensionEnabled: true,
        debugMode: false,
        notificationsEnabled: true,
        showDetectedInfo: true
      }
    };
  }

  async saveConfiguration() {
    try {
      await chrome.storage.sync.set({ [this.storageKey]: this.currentConfig });
      console.log('[Popup] Configuration saved');
      return true;
    } catch (error) {
      console.error('[Popup] Error saving configuration:', error);
      this.showNotification('Error saving settings', 'error');
      return false;
    }
  }

  initializeUI() {
    if (!this.currentConfig) return;

    // Load personal information
    this.loadPersonalInfoForm();
    
    // Load template settings
    this.loadTemplateSettings();
    
    // Load preferences
    this.loadPreferences();
    
    // Update template preview
    this.updateTemplatePreview();
    
    // Load storage info
    this.updateStorageInfo();
  }

  loadPersonalInfoForm() {
    const personalInfo = this.currentConfig.personalInfo;
    
    document.getElementById('firstName').value = personalInfo.firstName || '';
    document.getElementById('lastName').value = personalInfo.lastName || '';
    document.getElementById('email').value = personalInfo.email || '';
    document.getElementById('phone').value = personalInfo.phone || '';
    document.getElementById('university').value = personalInfo.university || '';
    document.getElementById('degree').value = personalInfo.degree || '';
    document.getElementById('resumeUrl').value = personalInfo.resumeUrl || '';
  }

  loadTemplateSettings() {
    const templateSettings = this.currentConfig.templateSettings;
    
    // Set the radio button for message type
    const messageType = templateSettings.messageType || 'newConnection';
    const radioButton = document.querySelector(`input[name="messageType"][value="${messageType}"]`);
    if (radioButton) {
      radioButton.checked = true;
    }
    
    document.getElementById('companyName').value = templateSettings.companyName || '';
    document.getElementById('positionTitle').value = templateSettings.positionTitle || '';
    document.getElementById('opportunityType').value = templateSettings.opportunityType || 'internship opportunities';
    document.getElementById('timeline').value = templateSettings.timeline || 'Summer 2025';
    document.getElementById('jobLinks').value = templateSettings.jobLinks || '';
    document.getElementById('recipientName').value = templateSettings.recipientName || '';
    document.getElementById('auto-detect-profile').checked = templateSettings.autoDetectProfile !== false;
    document.getElementById('preview-before-send').checked = templateSettings.previewBeforeSend !== false;
    
    this.handleMessageTypeChange(messageType);
    this.updateTemplatePreview();
  }

  loadPreferences() {
    const preferences = this.currentConfig.preferences;
    
    document.getElementById('extension-enabled').checked = preferences.extensionEnabled !== false;
    document.getElementById('notifications-enabled').checked = preferences.notificationsEnabled !== false;
    document.getElementById('debug-mode').checked = preferences.debugMode === true;
    document.getElementById('show-detected-info').checked = preferences.showDetectedInfo !== false;
  }

  switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding panel
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update template preview if templates tab is selected
    if (tabName === 'templates') {
      this.updateTemplatePreview();
    }
  }

  async savePersonalInfo() {
    try {
      this.showLoading(true);
      
      const personalInfo = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        university: document.getElementById('university').value.trim(),
        degree: document.getElementById('degree').value.trim(),
        resumeUrl: document.getElementById('resumeUrl').value.trim()
      };

      // Validate required fields
      if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email) {
        this.showNotification('Please fill in First Name, Last Name, and Email fields', 'warning');
        return;
      }

      this.currentConfig.personalInfo = personalInfo;
      const success = await this.saveConfiguration();
      
      if (success) {
        this.showNotification('Personal information saved successfully!', 'success');
        
        // Send message to content script to reload configuration
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0] && tabs[0].url.includes('linkedin.com')) {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: 'reloadConfig',
              config: this.currentConfig
            });
          }
        } catch (error) {
          console.log('[Popup] Could not send message to content script:', error.message);
        }
      }
    } catch (error) {
      console.error('[Popup] Error saving personal info:', error);
      this.showNotification('Error saving personal information', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  testVariables() {
    const personalInfo = this.currentConfig.personalInfo;
    const variables = {
      firstName: personalInfo.firstName || 'Sachin',
      lastName: personalInfo.lastName || 'Adlakha',
      fullName: `${personalInfo.firstName} ${personalInfo.lastName}`,
      email: personalInfo.email || 'sa9082@nyu.edu',
      phone: personalInfo.phone || '6466335776',
      university: personalInfo.university || 'NYU',
      degree: personalInfo.degree || 'MS in Computer Science',
      resumeUrl: personalInfo.resumeUrl || '[Resume URL]'
    };

    let message = 'Your Saved Information:\n\n';
    Object.entries(variables).forEach(([key, value]) => {
      message += `${key}: ${value}\n`;
    });

    alert(message);
  }

  handleMessageTypeChange(messageType) {
    const jobLinksGroup = document.getElementById('jobLinksGroup');
    const recipientNameGroup = document.getElementById('recipientNameGroup');
    const usageHint = document.getElementById('template-usage-hint');
    
    if (messageType === 'afterAcceptance') {
      jobLinksGroup.style.display = 'block';
      recipientNameGroup.style.display = 'block';
      usageHint.innerHTML = '✅ Use in messaging/chat after connection accepted';
    } else if (messageType === 'alreadyConnected') {
      jobLinksGroup.style.display = 'block';
      recipientNameGroup.style.display = 'none';
      usageHint.innerHTML = '💬 Use in messaging for existing connections';
    } else {
      jobLinksGroup.style.display = 'none';
      recipientNameGroup.style.display = 'none';
      usageHint.innerHTML = '🔗 Use when clicking Connect → Add a note';
    }
    
    this.currentConfig.templateSettings.messageType = messageType;
  }

  async saveTemplateSettings() {
    try {
      this.showLoading(true);
      
      // Get selected message type from radio buttons
      const selectedRadio = document.querySelector('input[name="messageType"]:checked');
      const messageType = selectedRadio ? selectedRadio.value : 'newConnection';
      
      const templateSettings = {
        ...this.currentConfig.templateSettings,
        messageType: messageType,
        companyName: document.getElementById('companyName').value.trim(),
        positionTitle: document.getElementById('positionTitle').value.trim(),
        opportunityType: document.getElementById('opportunityType').value.trim(),
        timeline: document.getElementById('timeline').value.trim(),
        jobLinks: document.getElementById('jobLinks').value.trim(),
        recipientName: document.getElementById('recipientName').value.trim(),
        autoDetectProfile: document.getElementById('auto-detect-profile').checked,
        previewBeforeSend: document.getElementById('preview-before-send').checked
      };

      this.currentConfig.templateSettings = templateSettings;
      const success = await this.saveConfiguration();
      
      if (success) {
        this.showNotification('Template settings saved successfully!', 'success');
        
        // Send message to content script
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0] && tabs[0].url.includes('linkedin.com')) {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: 'reloadConfig',
              config: this.currentConfig
            });
          }
        } catch (error) {
          console.log('[Popup] Could not send message to content script:', error.message);
        }
      }
    } catch (error) {
      console.error('[Popup] Error saving template settings:', error);
      this.showNotification('Error saving template settings', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  resetTemplateFields() {
    document.getElementById('companyName').value = '';
    document.getElementById('positionTitle').value = 'Software Engineer Intern';
    document.getElementById('timeline').value = 'Summer 2025';
    document.getElementById('jobLinks').value = '';
    document.getElementById('recipientName').value = '';
    this.updateTemplatePreview();
  }

  copyMessageToClipboard() {
    const selectedRadio = document.querySelector('input[name="messageType"]:checked');
    const messageType = selectedRadio ? selectedRadio.value : 'newConnection';
    const personalInfo = this.currentConfig.personalInfo;
    const templateSettings = {
      companyName: document.getElementById('companyName').value.trim(),
      positionTitle: document.getElementById('positionTitle').value.trim(),
      opportunityType: document.getElementById('opportunityType').value.trim(),
      timeline: document.getElementById('timeline').value.trim(),
      jobLinks: document.getElementById('jobLinks').value.trim(),
      recipientName: document.getElementById('recipientName').value.trim()
    };
    
    const templates = this.getMessageTemplates();
    const template = templates[messageType];
    
    if (template) {
      let message = template(personalInfo, templateSettings);
      
      // For new connection, remove any character count indicators
      if (messageType === 'newConnection') {
        const lines = message.split('\n');
        if (lines[0].includes('chars]')) {
          message = lines.slice(2).join('\n');
        }
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(message).then(() => {
        this.showNotification('Message copied to clipboard!', 'success');
      }).catch(err => {
        console.error('Failed to copy message:', err);
        this.showNotification('Failed to copy message', 'error');
      });
    }
  }

  updateDefaultTemplate(templateName) {
    this.currentConfig.templateSettings.defaultTemplate = templateName;
    this.saveConfiguration();
  }

  updateTemplateSetting(setting, value) {
    this.currentConfig.templateSettings[setting] = value;
    this.saveConfiguration();
  }

  updatePreference(preference, value) {
    this.currentConfig.preferences[preference] = value;
    this.saveConfiguration();
    
    // Special handling for extension enabled/disabled
    if (preference === 'extensionEnabled') {
      this.updateConnectionStatus(value);
    }
  }

  updateTemplatePreview() {
    const previewElement = document.getElementById('template-preview-text');
    const charCounter = document.getElementById('char-counter');
    const selectedRadio = document.querySelector('input[name="messageType"]:checked');
    const messageType = selectedRadio ? selectedRadio.value : 'newConnection';
    const personalInfo = this.currentConfig.personalInfo;
    const templateSettings = {
      companyName: document.getElementById('companyName').value.trim(),
      positionTitle: document.getElementById('positionTitle').value.trim(),
      opportunityType: document.getElementById('opportunityType').value.trim(),
      timeline: document.getElementById('timeline').value.trim(),
      jobLinks: document.getElementById('jobLinks').value.trim(),
      recipientName: document.getElementById('recipientName').value.trim()
    };
    
    const templates = this.getMessageTemplates();
    const template = templates[messageType];
    
    if (template) {
      let preview = template(personalInfo, templateSettings);
      
      // For new connection, remove the character count indicator from preview
      if (messageType === 'newConnection') {
        // Remove the character count line if present
        const lines = preview.split('\n');
        if (lines[0].includes('chars]')) {
          preview = lines.slice(2).join('\n'); // Remove first two lines (indicator and empty line)
        }
        
        // Update character counter
        const charCount = preview.length;
        if (charCount > 300) {
          charCounter.innerHTML = `<span style="color: #dc3545;">⚠️ ${charCount}/300 chars</span>`;
        } else {
          charCounter.innerHTML = `<span style="color: #28a745;">✓ ${charCount}/300 chars</span>`;
        }
      } else {
        charCounter.innerHTML = ''; // No limit for other message types
      }
      
      previewElement.textContent = preview;
    } else {
      previewElement.textContent = 'Please fill in the required fields above...';
      charCounter.innerHTML = '';
    }
  }

  getMessageTemplates() {
    return {
      newConnection: (personalInfo, settings) => {
        const company = settings.companyName || '[Company]';
        const position = settings.positionTitle || 'Intern';
        const timeline = settings.timeline || 'Summer 2025';
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        
        // LinkedIn connection requests have a 300 character limit
        // This template is optimized to be under 300 characters
        return `Hi [Name],
I'm interested in applying for the ${position} role at ${company} for ${timeline}. I noticed your experience at the company and would love to learn about your journey. I'd greatly appreciate a referral if possible.
Best regards,
${fullName}`;
      },
      
      afterAcceptance: (personalInfo, settings) => {
        const recipientName = settings.recipientName || '[Recipient\'s Name]';
        const company = settings.companyName || '[Company]';
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
      
      alreadyConnected: (personalInfo, settings) => {
        const company = settings.companyName || '[Company]';
        const position = settings.positionTitle || 'Software Engineer Intern';
        const timeline = settings.timeline || 'Summer 2025';
        const jobLinks = settings.jobLinks || '';
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        const email = personalInfo.email || 'sa9082@nyu.edu';
        const phone = personalInfo.phone || '6466335776';
        
        return `Hi [Name],

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


  async exportSettings() {
    try {
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        config: this.currentConfig
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-helper-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showNotification('Settings exported successfully!', 'success');
    } catch (error) {
      console.error('[Popup] Error exporting settings:', error);
      this.showNotification('Error exporting settings', 'error');
    }
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.config) {
          throw new Error('Invalid settings file format');
        }
        
        this.currentConfig = this.mergeWithDefaults(importData.config);
        const success = await this.saveConfiguration();
        
        if (success) {
          this.initializeUI();
          this.showNotification('Settings imported successfully!', 'success');
        }
      } catch (error) {
        console.error('[Popup] Error importing settings:', error);
        this.showNotification('Error importing settings: ' + error.message, 'error');
      }
    };
    
    input.click();
  }

  mergeWithDefaults(imported) {
    const defaults = this.getDefaultConfig();
    return this.deepMerge(defaults, imported);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      this.showLoading(true);
      this.currentConfig = this.getDefaultConfig();
      const success = await this.saveConfiguration();
      
      if (success) {
        this.initializeUI();
        this.showNotification('Settings reset to defaults successfully!', 'success');
      }
    } catch (error) {
      console.error('[Popup] Error resetting settings:', error);
      this.showNotification('Error resetting settings', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async updateStorageInfo() {
    try {
      const used = await chrome.storage.sync.getBytesInUse();
      const quota = chrome.storage.sync.QUOTA_BYTES;
      const percentage = Math.round((used / quota) * 100);
      
      document.getElementById('storage-progress').style.width = `${percentage}%`;
      document.getElementById('storage-text').textContent = `${used} bytes used (${percentage}% of ${quota} bytes)`;
      
      // Change color based on usage
      const progressBar = document.getElementById('storage-progress');
      if (percentage > 80) {
        progressBar.style.background = 'linear-gradient(90deg, #f44336, #ff9800)';
      } else if (percentage > 60) {
        progressBar.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)';
      } else {
        progressBar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';
      }
    } catch (error) {
      console.error('[Popup] Error getting storage info:', error);
      document.getElementById('storage-text').textContent = 'Storage info unavailable';
    }
  }

  updateConnectionStatus(connected) {
    const statusIndicator = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
      statusIndicator.style.color = '#4caf50';
      statusText.textContent = 'Connected';
    } else {
      statusIndicator.style.color = '#f44336';
      statusText.textContent = 'Disconnected';
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const messageElement = document.getElementById('notification-message');
    
    messageElement.textContent = message;
    toast.className = `notification-toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
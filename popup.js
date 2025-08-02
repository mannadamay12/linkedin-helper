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

    // Template selector
    document.getElementById('default-template').addEventListener('change', (e) => {
      this.updateDefaultTemplate(e.target.value);
      this.updateTemplatePreview();
    });

    // Template checkboxes
    document.getElementById('auto-select-template').addEventListener('change', (e) => {
      this.updateTemplateSetting('autoSelectTemplate', e.target.checked);
    });

    document.getElementById('preview-before-send').addEventListener('change', (e) => {
      this.updateTemplateSetting('previewBeforeSend', e.target.checked);
    });

    // Template actions
    document.getElementById('add-custom-template').addEventListener('click', () => {
      this.showCustomTemplateModal();
    });

    document.getElementById('manage-templates').addEventListener('click', () => {
      this.openTemplateManager();
    });

    // Custom template modal
    document.getElementById('save-custom-template').addEventListener('click', () => {
      this.saveCustomTemplate();
    });

    document.getElementById('cancel-custom-template').addEventListener('click', () => {
      this.hideCustomTemplateModal();
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
      this.hideCustomTemplateModal();
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
        name: '',
        title: '',
        background: '',
        university: '',
        location: ''
      },
      templateSettings: {
        defaultTemplate: 'general',
        autoSelectTemplate: true,
        customTemplates: {},
        enabledTemplates: ['engineer', 'recruiter', 'student', 'general', 'sameCompany', 'sameUniversity']
      },
      preferences: {
        extensionEnabled: true,
        debugMode: false,
        notificationsEnabled: true,
        previewBeforeSend: true,
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
    
    document.getElementById('name').value = personalInfo.name || '';
    document.getElementById('title').value = personalInfo.title || '';
    document.getElementById('background').value = personalInfo.background || '';
    document.getElementById('university').value = personalInfo.university || '';
    document.getElementById('location').value = personalInfo.location || '';
  }

  loadTemplateSettings() {
    const templateSettings = this.currentConfig.templateSettings;
    
    document.getElementById('default-template').value = templateSettings.defaultTemplate || 'general';
    document.getElementById('auto-select-template').checked = templateSettings.autoSelectTemplate !== false;
    document.getElementById('preview-before-send').checked = templateSettings.previewBeforeSend !== false;
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
        name: document.getElementById('name').value.trim(),
        title: document.getElementById('title').value.trim(),
        background: document.getElementById('background').value.trim(),
        university: document.getElementById('university').value.trim(),
        location: document.getElementById('location').value.trim()
      };

      // Validate required fields
      if (!personalInfo.name || !personalInfo.title || !personalInfo.background) {
        this.showNotification('Please fill in Name, Title, and Background fields', 'warning');
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
      firstName: 'John',
      company: 'TechCorp',
      role: 'Software Engineer',
      myName: personalInfo.name || 'Your Name',
      myTitle: personalInfo.title || 'Your Title',
      myBackground: personalInfo.background || 'Your Background'
    };

    let message = 'Template Variables Test:\n\n';
    Object.entries(variables).forEach(([key, value]) => {
      message += `{${key}} → ${value}\n`;
    });

    alert(message);
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
    const templateName = document.getElementById('default-template').value;
    const previewElement = document.getElementById('template-preview-text');
    
    const templates = this.getDefaultTemplates();
    const template = templates[templateName];
    
    if (template) {
      const personalInfo = this.currentConfig.personalInfo;
      const sampleData = {
        firstName: 'John',
        company: 'TechCorp',
        role: 'Software Engineer',
        myName: personalInfo.name || 'Your Name',
        myTitle: personalInfo.title || 'Your Title',
        myBackground: personalInfo.background || 'Your Background'
      };
      
      let preview = template.template;
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        preview = preview.replace(regex, value);
      });
      
      previewElement.textContent = preview;
    } else {
      previewElement.textContent = 'Template not found';
    }
  }

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

I'd love to connect and learn about your academic journey and any insights you might share about {role} opportunities.

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

Fellow alumni here! I'm {myName}, a {myTitle} {myBackground}.

I'd love to connect and learn about your journey from university to {role} at {company}. Always great to connect with fellow alumni!

Best regards`
      }
    };
  }

  showCustomTemplateModal() {
    document.getElementById('custom-template-modal').classList.remove('hidden');
    document.getElementById('template-name').value = '';
    document.getElementById('template-content').value = '';
    document.getElementById('template-name').focus();
  }

  hideCustomTemplateModal() {
    document.getElementById('custom-template-modal').classList.add('hidden');
  }

  async saveCustomTemplate() {
    const name = document.getElementById('template-name').value.trim();
    const content = document.getElementById('template-content').value.trim();
    
    if (!name || !content) {
      this.showNotification('Please provide both name and content for the template', 'warning');
      return;
    }
    
    try {
      if (!this.currentConfig.templateSettings.customTemplates) {
        this.currentConfig.templateSettings.customTemplates = {};
      }
      
      this.currentConfig.templateSettings.customTemplates[name] = {
        name: name,
        template: content,
        custom: true,
        created: Date.now()
      };
      
      const success = await this.saveConfiguration();
      
      if (success) {
        this.showNotification(`Custom template "${name}" saved successfully!`, 'success');
        this.hideCustomTemplateModal();
      }
    } catch (error) {
      console.error('[Popup] Error saving custom template:', error);
      this.showNotification('Error saving custom template', 'error');
    }
  }

  openTemplateManager() {
    // For now, show a simple alert. In a future version, this could open a dedicated template management interface
    const customTemplates = this.currentConfig.templateSettings.customTemplates || {};
    const count = Object.keys(customTemplates).length;
    
    let message = `Template Management\n\nDefault Templates: 6\nCustom Templates: ${count}\n\n`;
    
    if (count > 0) {
      message += 'Custom Templates:\n';
      Object.keys(customTemplates).forEach(name => {
        message += `• ${name}\n`;
      });
    }
    
    alert(message + '\nAdvanced template management coming in a future update!');
  }

  async exportSettings() {
    try {
      const exportData = {
        version: '2.1',
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
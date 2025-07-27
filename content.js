// LinkedIn Connection Helper - Content Script
console.log('LinkedIn Connection Helper loaded!');

// Listen for clicks on Connect buttons
document.addEventListener('click', function(e) {
  // Check if clicked element is a Connect button
  const target = e.target;
  const isConnectButton = 
    target.innerText === 'Connect' || 
    target.getAttribute('aria-label')?.includes('Connect') ||
    target.closest('button')?.innerText === 'Connect' ||
    target.closest('[aria-label*="Connect"]');
    
  if (isConnectButton) {
    console.log('Connect button clicked!');
    setTimeout(() => {
      fillConnectionMessage();
    }, 1000);
  }
});

function fillConnectionMessage() {
  console.log('Looking for connection modal...');
  
  // Wait for the modal to appear
  const checkModal = setInterval(() => {
    // Look for "Add a note" button
    const addNoteButton = 
      document.querySelector('button[aria-label="Add a note"]') ||
      Array.from(document.querySelectorAll('button')).find(btn => 
        btn.innerText.includes('Add a note')
      );
    
    if (addNoteButton) {
      console.log('Found "Add a note" button, clicking it...');
      addNoteButton.click();
      clearInterval(checkModal);
      
      // Use MutationObserver to wait for modal content after clicking
      const observer = new MutationObserver((mutations, obs) => {
        const messageBox = document.querySelector('textarea[name="message"]') || 
                          document.querySelector('#custom-message') ||
                          document.querySelector('textarea[id*="message"]');
        
        if (messageBox || mutations.length > 50) {
          obs.disconnect();
          insertPersonalizedMessage();
        }
      });
      
      // Start observing body for modal changes
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        insertPersonalizedMessage();
      }, 1500);
    }
  }, 100);
  
  // Stop checking after 5 seconds
  setTimeout(() => {
    clearInterval(checkModal);
    console.log('Stopped looking for modal');
  }, 5000);
}

function findNameElement() {
  return document.querySelector('.send-invite__title') || 
    document.querySelector('[class*="artdeco-modal"] strong') ||
    document.querySelector('.artdeco-modal__header strong') ||
    document.querySelector('.artdeco-modal h2') ||
    document.querySelector('.invitation-card__title') ||
    document.querySelector('[id*="send-invite-modal"] h2') ||
    document.querySelector('[aria-label*="invite"] strong') ||
    document.querySelector('.pv-modal__header strong') ||
    document.querySelector('[data-test-modal-title]') ||
    document.querySelector('.invitation-card__name');
}

function insertPersonalizedMessage() {
  console.log('Inserting personalized message...');
  
  // Get the person's name from the modal - try multiple strategies
  let nameElement = findNameElement();
  
  // If still not found, try more generic selectors
  if (!nameElement) {
    // Look for any h2 or h3 in modal that might contain a name
    const modalElement = document.querySelector('.artdeco-modal') || document.querySelector('[role="dialog"]');
    if (modalElement) {
      const headings = modalElement.querySelectorAll('h1, h2, h3');
      for (const heading of headings) {
        const text = heading.innerText?.trim();
        // Check if it looks like a name (2-4 words, no special chars except dots/hyphens)
        if (text && /^[A-Za-z\s\.\-']{2,50}$/.test(text) && text.split(' ').length <= 4) {
          nameElement = heading;
          console.log('Found potential name in heading:', text);
          break;
        }
      }
    }
  }
  
  if (!nameElement) {
    console.log('Could not find name element. Tried multiple selectors.');
    showNotification('⚠️ Could not detect name. Please check if LinkedIn UI has changed.', 'error');
    
    // Log all strong elements for debugging
    const allStrongs = document.querySelectorAll('strong');
    console.log('Found strong elements:', allStrongs.length);
    allStrongs.forEach((el, i) => {
      if (el.innerText && el.innerText.trim()) {
        console.log(`Strong ${i}: "${el.innerText.trim()}" - Parent classes: ${el.parentElement?.className}`);
      }
    });
    
    // Fallback: Ask user for name
    const fallbackName = prompt('Could not detect name automatically. Please enter the person\'s first name:');
    if (fallbackName && fallbackName.trim()) {
      handleNameDetected(fallbackName.trim());
      return;
    }
    
    return;
  }
  
  const fullName = nameElement.innerText.trim();
  const firstName = fullName.split(' ')[0];
  console.log('Detected name:', firstName);
  
  handleNameDetected(firstName);
}

function handleNameDetected(firstName) {
  // Get additional context from modal
  let role = '';
  let company = '';
  
  // Try multiple selectors for role/company info
  const subtitleElements = [
    document.querySelector('.artdeco-modal__header + div'),
    document.querySelector('.send-invite__subtitle'),
    document.querySelector('[class*="artdeco-modal"] [class*="subtitle"]'),
    document.querySelector('.pv-text-details__left-panel .text-body-small')
  ];
  
  for (const element of subtitleElements) {
    if (element && element.innerText) {
      const text = element.innerText.trim();
      if (text.includes(' at ')) {
        const parts = text.split(' at ');
        role = parts[0].trim();
        company = parts[1].trim();
        break;
      }
    }
  }
  
  console.log('Detected role:', role || 'Not found');
  console.log('Detected company:', company || 'Not found');
  
  // Create personalized message templates
  const templates = [
    {
      condition: () => role.toLowerCase().includes('engineer') || role.toLowerCase().includes('developer'),
      message: `Hi ${firstName}, I'm Sachin, a Master's CS student at NYU passionate about tech.\n\nI'd love to connect and learn about your journey as ${role} at ${company}. Would also appreciate any insights you might share about the interview process and work culture there.\n\nEager to learn from experienced professionals like yourself!\n\nBest regards`
    },
    {
      condition: () => role.toLowerCase().includes('recruiter') || role.toLowerCase().includes('hiring') || role.toLowerCase().includes('talent'),
      message: `Hi ${firstName},\n\nI noticed you're working as ${role} at ${company}. I'm actively exploring new opportunities in software development and would love to connect. I believe my skills could be a great fit for roles at ${company}.\n\nLooking forward to connecting!\n\nBest regards`
    },
    {
      condition: () => role && company, // Has both role and company
      message: `Hi ${firstName}, I'm Sachin, a Master's CS student at NYU passionate about tech.\n\n  I'd love to connect and learn about your journey, work culture at ${company} , and any insights you might share about the interview process.\n\n Eager to learn from experienced professionals like yourself!\nBest regards`
    },
    {
      condition: () => true, // Default template
      message: `Hi ${firstName}, I'm Sachin, a Master's CS student at NYU passionate about tech.\n\nI'd love to connect and learn about your journey, work culture at Company, and any insights you might share about the interview process.\n\nEager to learn from experienced professionals like yourself!\nBest regards`
    }
  ];
  
  // Select appropriate template
  const selectedTemplate = templates.find(t => t.condition()).message;
  
  // Find the message textarea - try multiple selectors
  const messageBox = 
    document.querySelector('textarea[name="message"]') || 
    document.querySelector('#custom-message') ||
    document.querySelector('textarea[id*="message"]') ||
    document.querySelector('.send-invite__custom-message textarea') ||
    document.querySelector('[class*="artdeco-modal"] textarea');
  
  if (messageBox) {
    console.log('Found message box, inserting text...');
    
    // Clear existing text
    messageBox.value = '';
    
    // Insert new text
    messageBox.value = selectedTemplate;
    
    // Trigger various events to ensure LinkedIn registers the change
    messageBox.dispatchEvent(new Event('input', { bubbles: true }));
    messageBox.dispatchEvent(new Event('change', { bubbles: true }));
    messageBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    // Visual feedback
    messageBox.style.border = '2px solid #0a66c2';
    messageBox.style.backgroundColor = '#f0f7ff';
    
    setTimeout(() => {
      messageBox.style.border = '';
      messageBox.style.backgroundColor = '';
    }, 2000);
    
    // Show success notification
    showNotification('✓ Message inserted successfully!', 'success');
    
    // Show what was detected
    showDetectedInfo({
      name: firstName,
      role: role || 'Not detected',
      company: company || 'Not detected'
    });
  } else {
    console.log('Could not find message box');
    showNotification('⚠️ Could not find message box', 'error');
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
    max-width: 300px;
  `;
  
  infoDiv.innerHTML = `
    <strong>✓ Auto-detected:</strong><br>
    <span style="opacity: 0.9">Name: ${info.name}<br>
    Role: ${info.role}<br>
    Company: ${info.company}</span>
  `;
  
  document.body.appendChild(infoDiv);
  
  setTimeout(() => {
    infoDiv.style.animation = 'fadeOut 0.3s ease-in';
    setTimeout(() => infoDiv.remove(), 300);
  }, 4000);
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

let extensionEnabled = true;
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

console.log('LinkedIn Connection Helper is ready!');
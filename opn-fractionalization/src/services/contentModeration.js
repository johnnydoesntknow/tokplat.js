// src/services/contentModeration.js
import { useProfanityFilter } from '../utils/profanityFilter';

class ContentModerationService {
  constructor() {
    this.violations = new Map();
    this.blockedUntil = new Map();
    this.profanityFilter = null;
  }

  // Initialize the profanity filter
  initFilter() {
    if (!this.profanityFilter) {
      // We need to use the hook's validate function
      // But since this is a class, we'll create a simple instance
      const filter = {
        validate: (text) => {
          // Copy the validation logic from useProfanityFilter
          const profanityList = [
            'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard', 'dick', 'pussy', 'cock', 'cunt',
            'fuk', 'fck', 'sh1t', 'd4mn', 'b1tch', '@ss', 'd1ck'
          ];
          
          const lowerText = text.toLowerCase();
          const words = lowerText.split(/\s+/);
          
          for (const word of words) {
            if (profanityList.includes(word)) {
              return {
                isValid: false,
                message: 'Please use professional language suitable for an investment platform'
              };
            }
          }
          
          return { isValid: true };
        }
      };
      
      this.profanityFilter = filter;
    }
    return this.profanityFilter;
  }

  checkContent(walletAddress, content, fieldName) {
    // Initialize filter if needed
    const filter = this.initFilter();
    
    // Check if user is currently blocked
    if (this.isBlocked(walletAddress)) {
      const timeRemaining = this.getTimeRemaining(walletAddress);
      return {
        allowed: false,
        action: 'BLOCKED',
        message: `Account restricted for ${timeRemaining}`,
        canRetry: false
      };
    }

    // Check for profanity
    const validation = filter.validate(content);
    if (validation.isValid) {
      return { allowed: true };
    }

    // Record violation
    const userViolations = this.violations.get(walletAddress) || {
      count: 0,
      history: []
    };

    userViolations.count++;
    userViolations.history.push({
      timestamp: Date.now(),
      field: fieldName,
      content: content.substring(0, 50)
    });

    this.violations.set(walletAddress, userViolations);

    // Get appropriate response based on violation count
    return this.getSmartResponse(userViolations.count, fieldName, content);
  }

  getSmartResponse(violationCount, fieldName, content) {
    const responses = {
      1: {
        allowed: true,
        action: 'WARNING',
        severity: 'info',
        title: '💡 Friendly Reminder',
        message: 'Professional language helps build trust with potential investors.',
        guidance: this.getContextualGuidance(fieldName, content, 'gentle'),
        suggestion: this.getSuggestion(content),
        buttons: [
          { text: 'Got it!', action: 'acknowledge', style: 'primary' },
          { text: 'Why this matters', action: 'learn_more', style: 'secondary' }
        ]
      },
      2: {
        allowed: true,
        action: 'WARNING',
        severity: 'warning',
        title: '⚠️ Second Notice',
        message: 'Let\'s keep the platform professional for all investors.',
        guidance: this.getContextualGuidance(fieldName, content, 'firm'),
        suggestion: this.getSuggestion(content),
        warningNote: 'Next violation will result in a temporary cooldown.',
        buttons: [
          { text: 'I understand', action: 'acknowledge', style: 'primary' },
          { text: 'View Guidelines', action: 'show_guidelines', style: 'secondary' }
        ]
      },
      3: {
        allowed: true,
        action: 'FINAL_WARNING',
        severity: 'error',
        title: '🚨 Final Warning',
        message: 'This is your last warning before temporary restrictions.',
        guidance: this.getContextualGuidance(fieldName, content, 'serious'),
        suggestion: this.getSuggestion(content),
        warningNote: '⚠️ Next violation: 24-hour restriction on creating and buying assets.',
        buttons: [
          { text: 'I\'ll be careful', action: 'acknowledge', style: 'primary' },
          { text: 'Contact Support', action: 'support', style: 'secondary' }
        ]
      },
      4: {
        allowed: false,
        action: 'BLOCKED',
        severity: 'critical',
        title: '🔒 Account Temporarily Restricted',
        message: 'Your account has been restricted for 24 hours.',
        details: [
          '✅ You can still browse the marketplace',
          '❌ Cannot create new assets',
          '❌ Cannot purchase assets',
          '⏰ Restriction lifts in 24 hours'
        ],
        guidance: 'Use this time to review our community guidelines and prepare professional content for your next listing.',
        buttons: [
          { text: 'View Guidelines', action: 'show_guidelines', style: 'primary' },
          { text: 'Set Reminder', action: 'set_reminder', style: 'secondary' }
        ]
      }
    };

    const response = responses[Math.min(violationCount, 4)];
    
    // If 4th violation, set block
    if (violationCount >= 4) {
      this.blockedUntil.set(walletAddress, Date.now() + (24 * 60 * 60 * 1000));
    }

    return response;
  }

  getContextualGuidance(fieldName, content, tone) {
    const fieldGuidance = {
      assetName: {
        gentle: 'Asset names should be clear and descriptive. Think of it as your first impression on potential investors.',
        firm: 'A professional asset name attracts serious investors. Avoid slang or inappropriate language.',
        serious: 'Professional asset names are required. This directly impacts investor trust and platform credibility.'
      },
      assetDescription: {
        gentle: 'Descriptions should highlight your asset\'s value professionally. Imagine presenting to a board of investors.',
        firm: 'Your description represents a real investment opportunity. Professional language is essential.',
        serious: 'Descriptions must maintain professional standards. Investors need clear, appropriate information.'
      },
      aiPrompt: {
        gentle: 'Image descriptions help create professional visuals for your asset.',
        firm: 'Professional image generation starts with appropriate descriptions.',
        serious: 'Image prompts must follow platform guidelines for appropriate content.'
      }
    };

    return fieldGuidance[fieldName]?.[tone] || 
           'Please use professional language appropriate for a financial platform.';
  }

  getSuggestion(content) {
    const commonReplacements = {
      'damn': 'remarkable',
      'hell': 'very',
      'crap': 'poor quality',
      'sucks': 'needs improvement',
      'badass': 'impressive',
      'sick': 'excellent',
      'insane': 'exceptional'
    };

    let suggestion = content.toLowerCase();
    Object.entries(commonReplacements).forEach(([bad, good]) => {
      suggestion = suggestion.replace(new RegExp(bad, 'g'), good);
    });

    if (suggestion !== content.toLowerCase()) {
      return {
        text: 'Try something like:',
        example: suggestion,
        show: true
      };
    }

    return {
      text: 'Consider rephrasing with professional language',
      show: false
    };
  }

  isBlocked(walletAddress) {
    const blockTime = this.blockedUntil.get(walletAddress);
    if (!blockTime) return false;
    
    if (Date.now() > blockTime) {
      // Block expired, reset
      this.blockedUntil.delete(walletAddress);
      this.violations.delete(walletAddress);
      return false;
    }
    
    return true;
  }

  getTimeRemaining(walletAddress) {
    const blockTime = this.blockedUntil.get(walletAddress);
    if (!blockTime) return '0 hours';
    
    const remaining = blockTime - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  getViolationCount(walletAddress) {
    return this.violations.get(walletAddress)?.count || 0;
  }
}

export const contentModeration = new ContentModerationService();
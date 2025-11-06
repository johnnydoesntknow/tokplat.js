// src/utils/profanityFilter.js

// Basic profanity filter for content moderation
class ProfanityFilter {
  constructor() {
    // Basic list of inappropriate words to filter
    // This is a simplified list - you can expand as needed
    this.blockedWords = [
      'badword1', 'badword2', // Replace with actual words to filter
      // Add more words as needed
    ];
    
    // Patterns that might indicate inappropriate content
    this.suspiciousPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{16}\b/g, // Credit card pattern
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email (if you want to block)
    ];
  }

  /**
   * Validate text for inappropriate content
   * @param {string} text - Text to validate
   * @returns {object} - { isValid: boolean, message: string }
   */
  validate(text) {
    if (!text) {
      return { isValid: true, message: '' };
    }

    const lowerText = text.toLowerCase();
    
    // Check for blocked words
    for (const word of this.blockedWords) {
      if (lowerText.includes(word.toLowerCase())) {
        return {
          isValid: false,
          message: 'Please remove inappropriate language from your content'
        };
      }
    }
    
    // Check for suspicious patterns (optional)
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(text)) {
        return {
          isValid: false,
          message: 'Content contains potentially sensitive information'
        };
      }
    }
    
    // Check for excessive special characters (might indicate spam)
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
    if (specialCharRatio > 0.5) {
      return {
        isValid: false,
        message: 'Content contains too many special characters'
      };
    }
    
    return { isValid: true, message: '' };
  }

  /**
   * Clean text by removing or replacing inappropriate content
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  clean(text) {
    if (!text) return text;
    
    let cleaned = text;
    
    // Replace blocked words with asterisks
    for (const word of this.blockedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '*'.repeat(word.length));
    }
    
    return cleaned;
  }

  /**
   * Check if text seems like spam
   * @param {string} text - Text to check
   * @returns {boolean} - True if likely spam
   */
  isLikelySpam(text) {
    if (!text) return false;
    
    // Check for common spam indicators
    const spamIndicators = [
      /click here/gi,
      /buy now/gi,
      /limited time/gi,
      /act now/gi,
      /congratulations you've won/gi,
      /claim your prize/gi,
      /\${2,}/g, // Multiple dollar signs
      /!!{3,}/g, // Excessive exclamation marks
      /\b(viagra|cialis|casino|lottery)\b/gi,
    ];
    
    for (const pattern of spamIndicators) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.6) {
      return true;
    }
    
    return false;
  }
}

// Create singleton instance
const profanityFilter = new ProfanityFilter();

// React Hook for easy integration
export const useProfanityFilter = () => {
  const validateContent = (content) => {
    return profanityFilter.validate(content);
  };
  
  const cleanContent = (content) => {
    return profanityFilter.clean(content);
  };
  
  const checkSpam = (content) => {
    return profanityFilter.isLikelySpam(content);
  };
  
  return {
    validate: validateContent,
    clean: cleanContent,
    isSpam: checkSpam,
    // Direct access to the filter instance if needed
    filter: profanityFilter
  };
};

// Export default instance
export default profanityFilter;
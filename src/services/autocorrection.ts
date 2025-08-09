// Autocorrection Service - Free implementation using common word corrections
export interface AutocorrectionSettings {
  enabled: boolean;
  customWords: { [key: string]: string };
}

export class AutocorrectionService {
  private static commonCorrections: { [key: string]: string } = {
    // Common typos and misspellings
    'teh': 'the',
    'adn': 'and',
    'thier': 'their',
    'wiht': 'with',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',
    'occured': 'occurred',
    'accomodate': 'accommodate',
    'neccessary': 'necessary',
    'beleive': 'believe',
    'acheive': 'achieve',
    'buisness': 'business',
    'occassion': 'occasion',
    'embarass': 'embarrass',
    'arguement': 'argument',
    'cemetary': 'cemetery',
    'existance': 'existence',
    'goverment': 'government',
    'independant': 'independent',
    'priviledge': 'privilege',
    'succesful': 'successful',
    'tommorrow': 'tomorrow',
    'begining': 'beginning',
    'calender': 'calendar',
    'consciouss': 'conscious',
    'fourty': 'forty',
    'grammer': 'grammar',
    'lisence': 'license',
    'maintainance': 'maintenance',
    'occurence': 'occurrence',
    'perseverence': 'perseverance',
    'recomend': 'recommend',
    'supercede': 'supersede',
    'usefull': 'useful',
    'writting': 'writing',
    'youre': "you're",
    'your': "you're", // Context-dependent, but common mistake
    'its': "it's", // Context-dependent
    'there': 'their', // Context-dependent
    'loose': 'lose', // Context-dependent
    'affect': 'effect', // Context-dependent
    'alot': 'a lot',
    'cant': "can't",
    'wont': "won't",
    'dont': "don't",
    'isnt': "isn't",
    'wasnt': "wasn't",
    'werent': "weren't",
    'shouldnt': "shouldn't",
    'couldnt': "couldn't",
    'wouldnt': "wouldn't",
    'hasnt': "hasn't",
    'havent': "haven't",
    'hadnt': "hadn't",
    'didnt': "didn't",
    'doesnt': "doesn't",
    'im': "I'm",
    'ive': "I've",
    'ill': "I'll",
    'id': "I'd",
    // Add more common corrections
    'hte': 'the',
    'aer': 'are',
    'fo': 'of',
    'no': 'on',
    'taht': 'that',
    'ot': 'to',
    'nad': 'and',
    'si': 'is',
    'ti': 'it',
    'fi': 'if',
    'ro': 'or',
    'eb': 'be',
    'sa': 'as',
    'ta': 'at',
    'ni': 'in',
    'yuo': 'you',
    'eht': 'the',
    'mroe': 'more',
    'waht': 'what',
    'whne': 'when',
    'whih': 'which',
    'owuld': 'would',
    'shoudl': 'should',
    'coudl': 'could',
    'woudl': 'would',
  };

  private static settings: AutocorrectionSettings = {
    enabled: true,
    customWords: {}
  };

  /**
   * Check if a word needs correction
   */
  static needsCorrection(word: string): boolean {
    if (!this.settings.enabled) return false;
    
    const lowerWord = word.toLowerCase();
    return this.commonCorrections.hasOwnProperty(lowerWord) || 
           this.settings.customWords.hasOwnProperty(lowerWord);
  }

  /**
   * Get the corrected version of a word
   */
  static getCorrection(word: string): string {
    if (!this.settings.enabled) return word;
    
    const lowerWord = word.toLowerCase();
    
    // Check custom words first
    if (this.settings.customWords.hasOwnProperty(lowerWord)) {
      return this.preserveCase(word, this.settings.customWords[lowerWord]);
    }
    
    // Check common corrections
    if (this.commonCorrections.hasOwnProperty(lowerWord)) {
      return this.preserveCase(word, this.commonCorrections[lowerWord]);
    }
    
    return word;
  }

  /**
   * Preserve the case of the original word when applying correction
   */
  private static preserveCase(original: string, corrected: string): string {
    if (original.length === 0) return corrected;
    
    // If original is all uppercase
    if (original === original.toUpperCase()) {
      return corrected.toUpperCase();
    }
    
    // If original starts with uppercase
    if (original[0] === original[0].toUpperCase()) {
      return corrected.charAt(0).toUpperCase() + corrected.slice(1).toLowerCase();
    }
    
    // Otherwise return lowercase
    return corrected.toLowerCase();
  }

  /**
   * Process a text string and return corrected version
   */
  static correctText(text: string): string {
    if (!this.settings.enabled) return text;
    
    // Split text into words while preserving spaces and punctuation
    const words = text.split(/(\s+|[.,!?;:()[\]{}"'-])/);
    
    return words.map(word => {
      // Only correct words (not spaces or punctuation)
      if (/^[a-zA-Z]+$/.test(word)) {
        return this.getCorrection(word);
      }
      return word;
    }).join('');
  }

  /**
   * Extract the last word being typed from text
   */
  static getLastWord(text: string, cursorPosition: number): { word: string; startPos: number; endPos: number } {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find word boundaries
    const wordRegex = /[a-zA-Z]+/g;
    let lastMatch = null;
    let match;
    
    // Find the last word before cursor
    while ((match = wordRegex.exec(beforeCursor)) !== null) {
      lastMatch = match;
    }
    
    if (!lastMatch) {
      return { word: '', startPos: cursorPosition, endPos: cursorPosition };
    }
    
    const wordStart = lastMatch.index;
    let wordEnd = wordStart + lastMatch[0].length;
    
    // Extend word end if cursor is in the middle of a word
    const remainingText = afterCursor.match(/^[a-zA-Z]*/);
    if (remainingText) {
      wordEnd += remainingText[0].length;
    }
    
    const fullWord = text.substring(wordStart, wordEnd);
    
    return {
      word: fullWord,
      startPos: wordStart,
      endPos: wordEnd
    };
  }

  /**
   * Enable or disable autocorrection
   */
  static setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Check if autocorrection is enabled
   */
  static isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Add a custom word correction
   */
  static addCustomCorrection(wrong: string, correct: string): void {
    this.settings.customWords[wrong.toLowerCase()] = correct;
    this.saveSettings();
  }

  /**
   * Remove a custom word correction
   */
  static removeCustomCorrection(wrong: string): void {
    delete this.settings.customWords[wrong.toLowerCase()];
    this.saveSettings();
  }

  /**
   * Get all custom corrections
   */
  static getCustomCorrections(): { [key: string]: string } {
    return { ...this.settings.customWords };
  }

  /**
   * Load settings from localStorage
   */
  static loadSettings(): void {
    try {
      const saved = localStorage.getItem('autocorrection-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsedSettings };
      }
    } catch (error) {
      console.warn('Failed to load autocorrection settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private static saveSettings(): void {
    try {
      localStorage.setItem('autocorrection-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save autocorrection settings:', error);
    }
  }

  /**
   * Initialize the service
   */
  static initialize(): void {
    this.loadSettings();
  }
}

// Initialize on import
AutocorrectionService.initialize();

export default AutocorrectionService;
// services/StorageService.js

/**
 * Unified Storage Service
 * 
 * Handles all storage operations for the application:
 * - Local storage management with versioning, validation, and error handling
 * - Import/export functionality with proper validation
 * - File format handling and conversions
 * - Backup and recovery features
 */

// Storage configuration
const STORAGE_CONFIG = {
  // Core storage keys
  KEYS: {
    IDE_DATA: 'web-ide-data',
    PROBLEMS: 'saved-problems',
    ANSWERS: 'problem-answers',
    OUTPUTS: 'problem-outputs',
    CODE_PREFIX: 'code-',
    EDITOR_CODE_PREFIX: 'editor-code-',
    PROBLEM_TITLE_PREFIX: 'problem-title-',
    PROBLEM_DESC_PREFIX: 'problem-description-',
    IMPORT_FLAG: 'is-imported',
    CONSOLE_FOLDED: 'isConsoleFolded',
    DESCRIPTION_FOLDED: 'isDescriptionFolded',
  },

  // Version configuration for backward compatibility
  VERSION: '1.0',

  // Size limits
  MAX_SIZE: 10 * 1024 * 1024, // 10MB limit

  // Format specifications
  FORMATS: {
    JSON: 'application/json',
    TEXT: 'text/plain',
  },

  // Default filenames
  DEFAULT_EXPORT_FILENAME: 'web-ide-export',
  DEFAULT_PROBLEMS_FILENAME: 'problems.json',

  // Validation schemas (simplified version - consider using a library like Zod in production)
  SCHEMAS: {
    PROBLEM: {
      required: ['id', 'title', 'description', 'type'],
      types: ['code', 'output', 'fill']
    }
  }
};

/**
 * Core storage service with enhanced features
 */
export const StorageService = {
  /**
   * Save data to localStorage with versioning and validation
   * 
   * @param {string} key - Storage key
   * @param {any} data - Data to be stored
   * @param {Object} options - Additional options
   * @returns {boolean} Success state
   */
  save(key, data, options = {}) {
    try {
      const {
        addMetadata = true,
        compress = false,
        validate = false,
        schema = null
      } = options;

      // Optional validation
      if (validate && schema) {
        const validationResult = this.validate(data, schema);
        if (!validationResult.valid) {
          console.error('Data validation failed:', validationResult.errors);
          return false;
        }
      }

      // Prepare data with or without metadata
      let dataToStore = data;

      if (addMetadata) {
        dataToStore = {
          version: STORAGE_CONFIG.VERSION,
          timestamp: new Date().toISOString(),
          data
        };
      }

      // Serialize data
      const serialized = JSON.stringify(dataToStore);

      // Check size before saving
      if (serialized.length > STORAGE_CONFIG.MAX_SIZE) {
        console.error(`Data exceeds maximum storage size (${STORAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB)`);
        return false;
      }

      // Compress if needed (not implemented here - would require a compression library)
      const finalData = compress ? this._compress(serialized) : serialized;

      // Save to localStorage
      localStorage.setItem(key, finalData);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // Provide additional context for quota errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Try clearing some space.');
      }
      return false;
    }
  },

  /**
   * Load data from localStorage with validation and error handling
   * 
   * @param {string} key - Storage key
   * @param {Object} options - Additional options
   * @returns {any} The loaded data or null if not found/error
   */
  load(key, options = {}) {
    try {
      const {
        parseMetadata = true,
        decompress = false,
        defaultValue = null,
        migrationFn = null
      } = options;

      const serialized = localStorage.getItem(key);
      if (!serialized) return defaultValue;

      // Decompress if needed
      const dataString = decompress ? this._decompress(serialized) : serialized;

      // Parse data
      const parsed = JSON.parse(dataString);

      // Return data directly if not parsing metadata
      if (!parseMetadata) return parsed;

      // Validate structure
      if (!parsed || typeof parsed !== 'object' || !parsed.data) {
        console.warn(`Invalid data structure in storage for key: ${key}`);
        return defaultValue;
      }

      // Version checking for backward compatibility
      if (parsed.version !== STORAGE_CONFIG.VERSION) {
        console.warn(`Storage version mismatch. Stored: ${parsed.version}, Current: ${STORAGE_CONFIG.VERSION}`);

        // Apply migration if provided
        if (migrationFn && typeof migrationFn === 'function') {
          const migratedData = migrationFn(parsed.data, parsed.version);
          if (migratedData) {
            // Save migrated data
            this.save(key, migratedData, { addMetadata: true });
            return migratedData;
          }
        }
      }

      return parsed.data;
    } catch (error) {
      console.error(`Error loading from localStorage for key: ${key}`, error);
      return null;
    }
  },

  /**
   * Retrieve all items matching a prefix from localStorage
   * 
   * @param {string} prefix - Key prefix to match
   * @returns {Object} Object with matching keys/values
   */
  loadAllWithPrefix(prefix) {
    try {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          result[key] = this.load(key, { parseMetadata: false });
        }
      }
      return result;
    } catch (error) {
      console.error(`Error loading items with prefix: ${prefix}`, error);
      return {};
    }
  },

  /**
   * Remove item from localStorage with error handling
   * 
   * @param {string} key - Key to remove
   * @returns {boolean} Success state
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item with key: ${key}`, error);
      return false;
    }
  },

  /**
   * Remove all items matching a prefix from localStorage
   * 
   * @param {string} prefix - Key prefix to match
   * @returns {number} Number of items removed
   */
  removeAllWithPrefix(prefix) {
    try {
      const keysToRemove = [];

      // First gather all keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Then remove them
      keysToRemove.forEach(key => localStorage.removeItem(key));

      return keysToRemove.length;
    } catch (error) {
      console.error(`Error removing items with prefix: ${prefix}`, error);
      return 0;
    }
  },

  /**
   * Clear all stored data
   * 
   * @returns {boolean} Success state
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  /**
   * Export data to a downloadable file with configurable format
   * 
   * @param {Object} options - Export options
   * @returns {boolean} Success state
   */
  export(options = {}) {
    try {
      const {
        key = STORAGE_CONFIG.KEYS.IDE_DATA,
        format = 'json',
        filename = null,
        includeMetadata = true,
        prettify = true
      } = options;

      // Get data to export
      let dataToExport;

      if (typeof key === 'string') {
        // Export a single key
        dataToExport = this.load(key, { parseMetadata: false });
        if (!dataToExport) {
          console.warn(`No data found for key: ${key}`);
          return false;
        }
      } else if (Array.isArray(key)) {
        // Export multiple keys as an object
        dataToExport = {};
        for (const k of key) {
          const data = this.load(k, { parseMetadata: false });
          if (data) {
            dataToExport[k] = data;
          }
        }
        if (Object.keys(dataToExport).length === 0) {
          console.warn('No data found for any of the provided keys');
          return false;
        }
      } else {
        console.error('Invalid key format for export');
        return false;
      }

      // Add metadata if requested
      if (includeMetadata) {
        dataToExport = {
          exportVersion: STORAGE_CONFIG.VERSION,
          exportDate: new Date().toISOString(),
          data: dataToExport
        };
      }

      // Generate default filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultFilename = `${STORAGE_CONFIG.DEFAULT_EXPORT_FILENAME}-${timestamp}.${format}`;
      const exportFilename = filename || defaultFilename;

      // Convert data to the appropriate format
      let blob;
      let mimeType;

      switch (format.toLowerCase()) {
        case 'json':
          const spacing = prettify ? 2 : 0;
          blob = new Blob([JSON.stringify(dataToExport, null, spacing)], {
            type: STORAGE_CONFIG.FORMATS.JSON
          });
          mimeType = STORAGE_CONFIG.FORMATS.JSON;
          break;

        case 'txt':
          blob = new Blob([JSON.stringify(dataToExport)], {
            type: STORAGE_CONFIG.FORMATS.TEXT
          });
          mimeType = STORAGE_CONFIG.FORMATS.TEXT;
          break;

        default:
          console.error(`Unsupported export format: ${format}`);
          return false;
      }

      // Create download link
      return this._triggerDownload(blob, exportFilename, mimeType);
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  },

  /**
   * Export problems to JSON file with proper formatting
   * 
   * @param {Array} problems - Problems array to export
   * @param {Object} options - Export options
   * @returns {Object} Result with success status
   */
  exportProblems(problems, options = {}) {
    try {
      // First standardize the questions
      const standardized = this.standardizeQuestions(problems);

      if (!standardized.success) {
        return { success: false, error: standardized.error };
      }

      const {
        filename = null,
        prettify = true
      } = options;

      // Format JSON with indentation for readability
      const spacing = prettify ? 2 : 0;
      const jsonString = JSON.stringify(standardized.questions, null, spacing);

      // Create a Blob and downloadable link
      const blob = new Blob([jsonString], { type: STORAGE_CONFIG.FORMATS.JSON });

      // Either use provided filename or prompt user
      let exportFilename = filename;

      if (!exportFilename) {
        exportFilename = prompt('Enter filename for export:', STORAGE_CONFIG.DEFAULT_PROBLEMS_FILENAME) || STORAGE_CONFIG.DEFAULT_PROBLEMS_FILENAME;
      }

      // Ensure .json extension
      if (!exportFilename.endsWith('.json')) {
        exportFilename += '.json';
      }

      // Trigger download
      const success = this._triggerDownload(blob, exportFilename, STORAGE_CONFIG.FORMATS.JSON);

      return {
        success,
        message: success ? `Exported ${standardized.questions.length} questions to ${exportFilename}` : 'Failed to export questions'
      };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: 'Export failed: ' + error.message };
    }
  },

  /**
   * Import data from a file with validation
   * 
   * @param {File} file - File object to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Result with imported data
   */
  async import(file, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        validateType = true,
        validateSize = true,
        validateStructure = true,
        saveToStorage = true,
        targetKey = STORAGE_CONFIG.KEYS.IDE_DATA
      } = options;

      // Validate file type if requested
      if (validateType) {
        const validTypes = [
          'application/json',
          'text/json',
          'text/plain'
        ];

        const isValidType = validTypes.includes(file.type) || file.name.endsWith('.json');

        if (!isValidType) {
          reject(new Error(`Invalid file type: ${file.type}. Please upload a JSON file.`));
          return;
        }
      }

      // Validate file size if requested
      if (validateSize && file.size > STORAGE_CONFIG.MAX_SIZE) {
        reject(new Error(`File size exceeds maximum limit of ${STORAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB`));
        return;
      }

      // Read file
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const rawData = JSON.parse(event.target.result);

          // Try to extract data - handle both direct data and our metadata format
          let importedData = rawData;

          // If the file has our metadata structure, extract the actual data
          if (rawData && typeof rawData === 'object' && 'data' in rawData) {
            importedData = rawData.data;
          }

          // Validate structure if requested
          if (validateStructure && (!importedData || typeof importedData !== 'object')) {
            reject(new Error('Invalid data structure in imported file'));
            return;
          }

          // Save to storage if requested
          if (saveToStorage) {
            const saved = this.save(targetKey, importedData);
            if (!saved) {
              reject(new Error('Failed to save imported data to storage'));
              return;
            }
          }

          resolve({
            success: true,
            data: importedData,
            metadata: rawData !== importedData ? rawData : null
          });
        } catch (error) {
          console.error('Error parsing imported file:', error);
          reject(new Error(`Invalid JSON format: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  },

  /**
   * Import problems from a file with validation
   * 
   * @param {File} file - File object to import
   * @param {function} onSuccess - Callback for successful import
   * @param {function} onError - Callback for import errors
   */
  importProblems(file, onSuccess, onError) {
    this.import(file, {
      validateType: true,
      validateSize: true,
      validateStructure: true,
      saveToStorage: false // We'll handle this manually after validation
    })
      .then(result => {
        const importedQuestions = result.data;

        // Ensure we have an array of questions
        if (!Array.isArray(importedQuestions)) {
          // Try to wrap single object in array
          if (typeof importedQuestions === 'object' && importedQuestions !== null) {
            const questionArray = [importedQuestions];
            const validation = this.validateQuestionJson(questionArray);

            if (!validation.valid) {
              onError(validation.error || 'Invalid question format');
              return;
            }

            // Save to localStorage
            this.save(STORAGE_CONFIG.KEYS.PROBLEMS, questionArray);

            // Call success callback
            onSuccess(questionArray);
          } else {
            onError('Invalid file format. Expected an array of questions or a single question object.');
          }
          return;
        }

        // Validate the questions array
        const validation = this.validateQuestionJson(importedQuestions);

        if (!validation.valid) {
          onError(validation.errors ? validation.errors.join('\n') : 'Questions validation failed');
          return;
        }

        // Save to localStorage
        this.save(STORAGE_CONFIG.KEYS.PROBLEMS, importedQuestions);

        // Set import flag
        this.save(STORAGE_CONFIG.KEYS.IMPORT_FLAG, 'true', { addMetadata: false });

        // Call success callback
        onSuccess(importedQuestions);
      })
      .catch(error => {
        console.error('Error importing problems:', error);
        onError(error.message || 'Import failed');
      });
  },

  /**
   * Validate question JSON format
   * 
   * @param {Array} questions - Questions array to validate
   * @returns {Object} Validation result
   */
  validateQuestionJson(questions) {
    if (!Array.isArray(questions)) {
      return { valid: false, error: 'JSON must be an array of questions' };
    }

    if (questions.length === 0) {
      return { valid: false, error: 'Questions array is empty' };
    }

    const errors = [];
    const schema = STORAGE_CONFIG.SCHEMAS.PROBLEM;

    questions.forEach((question, index) => {
      const questionNumber = index + 1;

      // Required fields
      schema.required.forEach(field => {
        if (!question[field]) {
          errors.push(`Question ${questionNumber}: Missing required field "${field}"`);
        }
      });

      // Type validation
      if (question.type && !schema.types.includes(question.type)) {
        errors.push(`Question ${questionNumber}: Invalid type "${question.type}". Must be one of: ${schema.types.join(', ')}`);
      }

      // Code validation
      if (!question.code && !question.starterCode) {
        errors.push(`Question ${questionNumber}: Missing "code" or "starterCode" field`);
      } else if (question.type === 'fill' && !(question.code?.includes('____') || question.starterCode?.includes('____'))) {
        errors.push(`Question ${questionNumber}: Fill-in-the-blank question must contain blanks indicated by "____"`);
      }

      // Check for userAnswers object
      if (!question.userAnswers || typeof question.userAnswers !== 'object') {
        errors.push(`Question ${questionNumber}: Missing or invalid "userAnswers" object`);
      }

      // Check for answers object (can be empty but must exist)
      if (!('answers' in question) || typeof question.answers !== 'object') {
        errors.push(`Question ${questionNumber}: Missing or invalid "answers" object`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length > 0
        ? `Found ${errors.length} validation errors`
        : 'JSON is valid'
    };
  },

  /**
   * Standardize questions to match application format
   * 
   * @param {Array|Object} questions - Questions to standardize
   * @returns {Object} Standardization result
   */
  standardizeQuestions(questions) {
    if (!Array.isArray(questions)) {
      // Try to convert to array if it's a single object
      if (typeof questions === 'object' && questions !== null) {
        questions = [questions];
      } else {
        return {
          success: false,
          error: 'Cannot standardize: input is not an array or object'
        };
      }
    }

    const standardizedQuestions = questions.map((question, index) => {
      const standardized = { ...question };

      // Ensure ID
      if (!standardized.id) {
        standardized.id = index + 1;
      }

      // Ensure title
      if (!standardized.title) {
        standardized.title = `Question ${index + 1}`;
      }

      // Ensure description
      if (!standardized.description) {
        standardized.description = 'No description provided.';
      }

      // Ensure type
      if (!standardized.type || !STORAGE_CONFIG.SCHEMAS.PROBLEM.types.includes(standardized.type)) {
        standardized.type = 'code'; // Default to code type
      }

      // Handle code/starterCode compatibility
      if (!standardized.code && standardized.starterCode) {
        standardized.code = standardized.starterCode;
      } else if (!standardized.starterCode && standardized.code) {
        standardized.starterCode = standardized.code;
      } else if (!standardized.code && !standardized.starterCode) {
        // Create default code based on type
        const defaultCode = standardized.type === 'code'
          ? '# เขียนโค้ดของคุณที่นี่\n\n\n\n'
          : standardized.type === 'fill'
            ? '# เติมคำตอบในช่องว่าง\nx = ____\n'
            : '# แสดงผลลัพธ์\nprint("Hello World")';

        standardized.code = defaultCode;
        standardized.starterCode = defaultCode;
      }

      // Ensure userAnswers exists and has appropriate structure
      if (!standardized.userAnswers || typeof standardized.userAnswers !== 'object') {
        standardized.userAnswers = {};
      }

      // Setup appropriate userAnswers based on type
      if (standardized.type === 'code' && !('codeAnswer' in standardized.userAnswers)) {
        standardized.userAnswers.codeAnswer = '';
      } else if (standardized.type === 'output' && !('outputAnswer' in standardized.userAnswers)) {
        standardized.userAnswers.outputAnswer = '';
      } else if (standardized.type === 'fill') {
        if (!('fillAnswers' in standardized.userAnswers) || typeof standardized.userAnswers.fillAnswers !== 'object') {
          standardized.userAnswers.fillAnswers = {};
        }

        // Count blanks and create empty answers for them
        const blanks = (standardized.code.match(/____/g) || []).length;
        for (let i = 0; i < blanks; i++) {
          if (!(`blank-${i}` in standardized.userAnswers.fillAnswers)) {
            standardized.userAnswers.fillAnswers[`blank-${i}`] = '';
          }
        }
      }

      // Ensure answers object exists
      if (!standardized.answers || typeof standardized.answers !== 'object') {
        standardized.answers = {};
      }

      return standardized;
    });

    return {
      success: true,
      questions: standardizedQuestions,
      message: `Standardized ${standardizedQuestions.length} questions`
    };
  },

  /**
   * Create a backup of all IDE data
   * 
   * @returns {Object} Backup result
   */
  createBackup() {
    try {
      const backup = {};

      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            backup[key] = value;
          } catch (err) {
            console.warn(`Could not backup key: ${key}`, err);
          }
        }
      }

      // Generate backup name with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const backupName = `ide-backup-${timestamp}.json`;

      // Create backup file
      const blob = new Blob([JSON.stringify({
        timestamp,
        version: STORAGE_CONFIG.VERSION,
        data: backup
      }, null, 2)], { type: STORAGE_CONFIG.FORMATS.JSON });

      // Trigger download
      const success = this._triggerDownload(blob, backupName, STORAGE_CONFIG.FORMATS.JSON);

      return {
        success,
        message: success ? `Backup created successfully: ${backupName}` : 'Failed to create backup'
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: 'Backup failed: ' + error.message };
    }
  },

  /**
   * Restore from backup file
   * 
   * @param {File} file - Backup file
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(file) {
    try {
      const result = await this.import(file, {
        validateType: true,
        validateSize: true,
        validateStructure: true,
        saveToStorage: false
      });

      if (!result.success) {
        return {
          success: false,
          error: 'Failed to parse backup file'
        };
      }

      const backupData = result.data;

      // Validate backup structure
      if (!backupData || typeof backupData !== 'object') {
        return {
          success: false,
          error: 'Invalid backup format'
        };
      }

      // Ask for confirmation
      const confirmRestore = window.confirm(
        'This will replace ALL current data with the backup. Continue?'
      );

      if (!confirmRestore) {
        return {
          success: false,
          error: 'Restore cancelled by user'
        };
      }

      // Clear current data
      localStorage.clear();

      // Restore all keys
      let restoredCount = 0;
      for (const [key, value] of Object.entries(backupData)) {
        try {
          localStorage.setItem(key, value);
          restoredCount++;
        } catch (err) {
          console.warn(`Could not restore key: ${key}`, err);
        }
      }

      return {
        success: true,
        message: `Successfully restored ${restoredCount} items from backup`,
        restoredCount
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      return { success: false, error: 'Restore failed: ' + error.message };
    }
  },

  /**
   * Helper function to trigger a file download
   * 
   * @private
   * @param {Blob} blob - Data blob
   * @param {string} filename - Download filename
   * @param {string} mimeType - MIME type
   * @returns {boolean} Success state
   */
  _triggerDownload(blob, filename, mimeType) {
    try {
      // Create downloadable link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.type = mimeType;

      // Use safer approach for triggering download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  },

  /**
   * Compress data (placeholder)
   * 
   * @private
   * @param {string} data - Data to compress
   * @returns {string} Compressed data
   */
  _compress(data) {
    // This would use a compression library
    return data;
  },

  /**
   * Decompress data (placeholder)
   * 
   * @private
   * @param {string} data - Data to decompress
   * @returns {string} Decompressed data
   */
  _decompress(data) {
    // This would use a decompression library
    return data;
  },

  /**
   * Validate data against a schema (placeholder)
   * 
   * @private
   * @param {any} data - Data to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validate(data, schema) {
    // This would use a validation library
    return { valid: true };
  }
};

// Export convenience functions for backward compatibility
export const saveToLocalStorage = (data) => StorageService.save(STORAGE_CONFIG.KEYS.IDE_DATA, data);
export const loadFromLocalStorage = () => StorageService.load(STORAGE_CONFIG.KEYS.IDE_DATA);
export const exportData = (options) => StorageService.export(options);
export const importData = (file) => StorageService.import(file);
export const exportQuestions = (questions, options) => StorageService.exportProblems(questions, options);
export const importQuestions = (file, onSuccess, onError) => StorageService.importProblems(file, onSuccess, onError);

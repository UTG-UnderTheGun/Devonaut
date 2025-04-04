// utils/storage.js

/**
 * Constants for storage configuration
 */
const STORAGE_CONFIG = {
  KEY: 'web-ide-data',
  VERSION: '1.0',
  MAX_SIZE: 5 * 1024 * 1024, // 5MB limit
};

/**
 * Enhanced localStorage wrapper with:
 * - Size validation
 * - Version checking
 * - Error handling
 * - Data validation
 */
export const StorageService = {
  /**
   * Save data to localStorage with versioning
   * @param {Object} data - Data to be stored
   * @returns {boolean} Success state
   */
  save(data) {
    try {
      // Add metadata
      const dataWithMeta = {
        version: STORAGE_CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        data
      };

      // Check size before saving
      const serialized = JSON.stringify(dataWithMeta);
      if (serialized.length > STORAGE_CONFIG.MAX_SIZE) {
        console.error('Data exceeds maximum storage size');
        return false;
      }

      localStorage.setItem(STORAGE_CONFIG.KEY, serialized);
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
   * Load data from localStorage with version checking
   * @returns {Object|null} Parsed data or null if error/empty
   */
  load() {
    try {
      const serialized = localStorage.getItem(STORAGE_CONFIG.KEY);
      if (!serialized) return null;

      const parsed = JSON.parse(serialized);

      // Validate structure - important for security and stability
      if (!parsed || typeof parsed !== 'object' || !parsed.data) {
        console.warn('Invalid data structure in storage');
        return null;
      }

      // Version checking for backward compatibility
      if (parsed.version !== STORAGE_CONFIG.VERSION) {
        console.warn(`Storage version mismatch. Stored: ${parsed.version}, Current: ${STORAGE_CONFIG.VERSION}`);
        // Could implement migration logic here
      }

      return parsed.data;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  },

  /**
   * Export data to downloadable JSON file
   * @param {string} [filename] - Optional custom filename
   * @returns {boolean} Success state
   */
  export(filename = null) {
    try {
      const data = this.load();
      if (!data) {
        console.warn('No data to export');
        return false;
      }

      // Generate filename with timestamp for uniqueness
      const defaultFilename = `ide-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const exportFilename = filename || defaultFilename;

      // Include metadata in export
      const exportData = {
        exportVersion: STORAGE_CONFIG.VERSION,
        exportDate: new Date().toISOString(),
        data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      // Create downloadable link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFilename;

      // Use safer approach for triggering download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  },

  /**
   * Import data from JSON file with validation
   * @param {File} file - File object to import
   * @returns {Promise<Object|null>} Parsed data or null on error
   */
  async import(file) {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.match('application/json') && !file.name.endsWith('.json')) {
        reject(new Error('Invalid file type. Please upload a JSON file.'));
        return;
      }

      // Validate file size
      if (file.size > STORAGE_CONFIG.MAX_SIZE) {
        reject(new Error(`File size exceeds maximum limit of ${STORAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB`));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const rawData = JSON.parse(event.target.result);

          // Extract the actual data - handle both direct data and our metadata format
          const importedData = rawData.data || rawData;

          // Validate imported data structure
          if (!importedData || typeof importedData !== 'object') {
            reject(new Error('Invalid data structure in imported file'));
            return;
          }

          // Save to storage
          const saved = this.save(importedData);
          if (!saved) {
            reject(new Error('Failed to save imported data to storage'));
            return;
          }

          resolve(importedData);
        } catch (error) {
          console.error('Error parsing imported file:', error);
          reject(new Error('Invalid JSON format'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  },

  /**
   * Clear all stored data
   * @returns {boolean} Success state
   */
  clear() {
    try {
      localStorage.removeItem(STORAGE_CONFIG.KEY);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
};

// For backward compatibility
export const saveToLocalStorage = (data) => StorageService.save(data);
export const loadFromLocalStorage = () => StorageService.load();
export const exportData = () => StorageService.export();
export const importData = (file) => StorageService.import(file);

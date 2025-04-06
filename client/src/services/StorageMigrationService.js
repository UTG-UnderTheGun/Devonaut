// services/StorageMigrationService.js

/**
 * Storage Migration Service
 * 
 * Handles data format migrations between different versions
 * of the application's storage schema.
 */

import { StorageService } from './StorageService';

// Configuration for migrations
const MIGRATION_CONFIG = {
  // Current storage version
  CURRENT_VERSION: '1.0',

  // Known previous versions and their migration paths
  KNOWN_VERSIONS: ['0.1', '0.2', '0.9'],

  // Migration strategy: 'auto' or 'prompt'
  STRATEGY: 'auto',

  // Whether to backup before migration
  BACKUP_BEFORE_MIGRATION: true
};

/**
 * Service for handling storage schema migrations
 */
export const MigrationService = {
  /**
   * Check if migration is needed
   * 
   * @returns {Object} Migration status
   */
  checkMigrationNeeded() {
    try {
      // Check each known storage key for version information
      const keysToCheck = [
        'web-ide-data',
        'saved-problems',
        'problem-answers'
      ];

      const versionsFound = [];

      for (const key of keysToCheck) {
        try {
          const data = StorageService.load(key, {
            parseMetadata: true,
            defaultValue: null
          });

          if (data && data._version && data._version !== MIGRATION_CONFIG.CURRENT_VERSION) {
            versionsFound.push({
              key,
              version: data._version
            });
          }
        } catch (err) {
          console.warn(`Error checking version for ${key}:`, err);
        }
      }

      return {
        migrationNeeded: versionsFound.length > 0,
        versionsFound
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        migrationNeeded: false,
        error: error.message
      };
    }
  },

  /**
   * Run migration process for all data
   * 
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async runMigration(options = {}) {
    const {
      force = false,
      backup = MIGRATION_CONFIG.BACKUP_BEFORE_MIGRATION,
      strategy = MIGRATION_CONFIG.STRATEGY
    } = options;

    try {
      // Check if migration is needed, unless forced
      const { migrationNeeded, versionsFound } = force ? { migrationNeeded: true, versionsFound: [] } : this.checkMigrationNeeded();

      if (!migrationNeeded && !force) {
        return {
          success: true,
          message: 'No migration needed',
          migrated: false
        };
      }

      // Create backup if requested
      if (backup) {
        const backupResult = StorageService.createBackup();
        if (!backupResult.success) {
          console.warn('Failed to create backup before migration:', backupResult.error);
        }
      }

      // If strategy is 'prompt', ask user for confirmation
      if (strategy === 'prompt') {
        const confirmMigration = window.confirm(
          'The application needs to update your saved data to a new format. ' +
          'This will not affect your questions or answers, but will improve compatibility. ' +
          'Would you like to proceed? (A backup has been created for safety)'
        );

        if (!confirmMigration) {
          return {
            success: false,
            message: 'Migration cancelled by user',
            migrated: false
          };
        }
      }

      // Perform migrations
      const migrationsPerformed = await this._performMigrations(versionsFound);

      return {
        success: true,
        message: `Successfully migrated ${migrationsPerformed.length} data stores`,
        migrationsPerformed,
        migrated: migrationsPerformed.length > 0
      };
    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        error: `Migration failed: ${error.message}`,
        migrated: false
      };
    }
  },

  /**
   * Perform actual migrations based on found versions
   * 
   * @private
   * @param {Array} versionsFound - Versions found during check
   * @returns {Promise<Array>} List of performed migrations
   */
  async _performMigrations(versionsFound) {
    const migrationsPerformed = [];

    // Attempt to migrate each data store
    for (const { key, version } of versionsFound) {
      try {
        // Get the appropriate migration function
        const migrationFn = this._getMigrationFunction(version, MIGRATION_CONFIG.CURRENT_VERSION);

        if (!migrationFn) {
          console.warn(`No migration path found from ${version} to ${MIGRATION_CONFIG.CURRENT_VERSION} for ${key}`);
          continue;
        }

        // Get the data to migrate
        const dataToMigrate = StorageService.load(key, {
          parseMetadata: false,
          defaultValue: null
        });

        if (!dataToMigrate) {
          console.warn(`No data found for ${key} to migrate`);
          continue;
        }

        // Perform migration
        const migratedData = migrationFn(dataToMigrate, key);

        if (!migratedData) {
          console.warn(`Migration returned no data for ${key}`);
          continue;
        }

        // Save migrated data
        const saved = StorageService.save(key, migratedData, {
          addMetadata: true
        });

        if (saved) {
          migrationsPerformed.push({
            key,
            fromVersion: version,
            toVersion: MIGRATION_CONFIG.CURRENT_VERSION
          });
        } else {
          console.error(`Failed to save migrated data for ${key}`);
        }
      } catch (error) {
        console.error(`Error migrating ${key}:`, error);
      }
    }

    return migrationsPerformed;
  },

  /**
   * Get appropriate migration function based on versions
   * 
   * @private
   * @param {string} fromVersion - Source version
   * @param {string} toVersion - Target version
   * @returns {Function|null} Migration function or null if not found
   */
  _getMigrationFunction(fromVersion, toVersion) {
    // Direct migration path
    const directPath = `_migrate_${fromVersion}_to_${toVersion}`;
    if (this[directPath] && typeof this[directPath] === 'function') {
      return this[directPath];
    }

    // Step-by-step migration path
    if (MIGRATION_CONFIG.KNOWN_VERSIONS.includes(fromVersion)) {
      const versionIndex = MIGRATION_CONFIG.KNOWN_VERSIONS.indexOf(fromVersion);

      if (versionIndex < MIGRATION_CONFIG.KNOWN_VERSIONS.length - 1) {
        const nextVersion = MIGRATION_CONFIG.KNOWN_VERSIONS[versionIndex + 1];
        const nextStepPath = `_migrate_${fromVersion}_to_${nextVersion}`;

        if (this[nextStepPath] && typeof this[nextStepPath] === 'function') {
          // Create a composite function that chains migrations
          return (data, key) => {
            const intermediateData = this[nextStepPath](data, key);
            const nextMigration = this._getMigrationFunction(nextVersion, toVersion);

            if (nextMigration) {
              return nextMigration(intermediateData, key);
            }

            return intermediateData;
          };
        }
      }
    }

    // Fallback: Try generic migration
    if (this._migrateGeneric && typeof this._migrateGeneric === 'function') {
      return this._migrateGeneric;
    }

    return null;
  },

  /**
   * Generic migration function (fallback)
   * 
   * @private
   * @param {any} data - Data to migrate
   * @param {string} key - Storage key
   * @returns {any} Migrated data
   */
  _migrateGeneric(data, key) {
    // Simple migration that preserves data but adds version marker
    if (typeof data === 'object' && data !== null) {
      return {
        ...data,
        _version: MIGRATION_CONFIG.CURRENT_VERSION,
        _migrated: new Date().toISOString()
      };
    }

    return data;
  },

  /**
   * Migration from version 0.9 to 1.0
   * 
   * @private
   * @param {any} data - Data to migrate
   * @param {string} key - Storage key
   * @returns {any} Migrated data
   */
  _migrate_0_9_to_1_0(data, key) {
    if (key === 'saved-problems') {
      // Migrate problems array
      if (Array.isArray(data)) {
        return data.map(problem => {
          // Ensure compatibility with new schema
          return {
            ...problem,
            id: problem.id || Math.floor(Math.random() * 10000),
            starterCode: problem.starterCode || problem.code || '',
            userAnswers: problem.userAnswers || {},
            answers: problem.answers || {},
            _version: MIGRATION_CONFIG.CURRENT_VERSION
          };
        });
      }
    } else if (key === 'problem-answers') {
      // Ensure the answers object structure is compatible
      const migratedAnswers = { ...data };

      // Convert old format answers if needed
      Object.keys(migratedAnswers).forEach(answerKey => {
        if (typeof migratedAnswers[answerKey] === 'string') {
          // Convert string answers to object format
          migratedAnswers[answerKey] = {
            value: migratedAnswers[answerKey],
            timestamp: new Date().toISOString()
          };
        }
      });

      return {
        ...migratedAnswers,
        _version: MIGRATION_CONFIG.CURRENT_VERSION
      };
    }

    // Default migration
    return this._migrateGeneric(data, key);
  },

  /**
   * Migration from version 0.2 to 0.9
   * 
   * @private
   * @param {any} data - Data to migrate
   * @param {string} key - Storage key
   * @returns {any} Migrated data
   */
  _migrate_0_2_to_0_9(data, key) {
    if (key === 'saved-problems') {
      // Handle legacy format where problems were objects instead of arrays
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        const problemsArray = [];

        // Convert object of problems to array
        Object.keys(data).forEach((problemKey, index) => {
          const problem = data[problemKey];
          problemsArray.push({
            ...problem,
            id: index + 1,
            _originalKey: problemKey
          });
        });

        return problemsArray;
      }
    }

    // Default migration
    return this._migrateGeneric(data, key);
  },

  /**
   * Migration from version 0.1 to 0.2
   * 
   * @private
   * @param {any} data - Data to migrate
   * @param {string} key - Storage key
   * @returns {any} Migrated data
   */
  _migrate_0_1_to_0_2(data, key) {
    // Early version migrations
    return this._migrateGeneric(data, key);
  }
};

// Export convenience functions
export const checkMigrationNeeded = () => MigrationService.checkMigrationNeeded();
export const runMigration = (options) => MigrationService.runMigration(options);

// Export the service
export default MigrationService;

// hooks/useStorage.js

import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '@/services/StorageService';
import { NotificationService } from '@/services/NotificationService';

/**
 * Custom hook for working with the StorageService in React components
 * 
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if nothing exists in storage
 * @param {Object} options - Additional options
 * @returns {Array} [value, setValue, operations]
 */
export const useStorage = (key, initialValue = null, options = {}) => {
  const {
    serialize = true,
    parseMetadata = false,
    showNotifications = true,
    onError = null,
    onSuccess = null
  } = options;

  // State to store the value
  const [value, setValue] = useState(initialValue);

  // Flag to track if the initial load has completed
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle error display and callback
  const handleError = useCallback((message, error) => {
    console.error(message, error);

    if (showNotifications) {
      NotificationService.error(message, {
        title: 'Storage Error',
        duration: 5000
      });
    }

    if (typeof onError === 'function') {
      onError(message, error);
    }
  }, [showNotifications, onError]);

  // Handle success display and callback
  const handleSuccess = useCallback((message) => {
    if (showNotifications) {
      NotificationService.success(message, {
        title: 'Success',
        duration: 3000
      });
    }

    if (typeof onSuccess === 'function') {
      onSuccess(message);
    }
  }, [showNotifications, onSuccess]);

  // Load the value from storage
  const loadFromStorage = useCallback(() => {
    try {
      const storedValue = StorageService.load(key, {
        parseMetadata,
        defaultValue: initialValue
      });

      setValue(storedValue !== null ? storedValue : initialValue);
      setIsLoaded(true);
      return storedValue;
    } catch (error) {
      handleError(`Failed to load data for key: ${key}`, error);
      setValue(initialValue);
      setIsLoaded(true);
      return initialValue;
    }
  }, [key, initialValue, parseMetadata, handleError]);

  // Save a value to storage
  const saveToStorage = useCallback((newValue) => {
    try {
      // If the value is a function, resolve it
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;

      const success = StorageService.save(key, valueToStore, {
        addMetadata: serialize
      });

      if (success) {
        setValue(valueToStore);
        return true;
      } else {
        handleError(`Failed to save data for key: ${key}`);
        return false;
      }
    } catch (error) {
      handleError(`Error saving data for key: ${key}`, error);
      return false;
    }
  }, [key, value, serialize, handleError]);

  // Clear the stored value
  const clearStorage = useCallback(() => {
    try {
      const success = StorageService.remove(key);

      if (success) {
        setValue(initialValue);
        return true;
      } else {
        handleError(`Failed to clear data for key: ${key}`);
        return false;
      }
    } catch (error) {
      handleError(`Error clearing data for key: ${key}`, error);
      return false;
    }
  }, [key, initialValue, handleError]);

  // Load the initial value from storage
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Export operations
  const operations = {
    // Reload value from storage
    reload: loadFromStorage,

    // Clear the value
    clear: clearStorage,

    // Export the value to a file
    export: (exportOptions = {}) => {
      try {
        const success = StorageService.export({
          key,
          ...exportOptions
        });

        if (success) {
          handleSuccess(`Successfully exported data for key: ${key}`);
          return true;
        } else {
          handleError(`Failed to export data for key: ${key}`);
          return false;
        }
      } catch (error) {
        handleError(`Error exporting data for key: ${key}`, error);
        return false;
      }
    },

    // Import data from a file
    import: async (file, importOptions = {}) => {
      try {
        const result = await StorageService.import(file, {
          targetKey: key,
          ...importOptions
        });

        if (result.success) {
          setValue(result.data);
          handleSuccess(`Successfully imported data for key: ${key}`);
          return result.data;
        } else {
          handleError(`Failed to import data for key: ${key}`);
          return null;
        }
      } catch (error) {
        handleError(`Error importing data for key: ${key}`, error);
        return null;
      }
    },

    // Return loading state
    isLoaded
  };

  return [value, saveToStorage, operations];
};

/**
 * Hook for working with problem data specifically
 * 
 * @param {Object} options - Additional options
 * @returns {Object} Problem state and operations
 */
export const useProblems = (options = {}) => {
  const [problems, setProblems, problemsOps] = useStorage('saved-problems', [], {
    serialize: true,
    ...options
  });

  // Current problem index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get the current problem
  const currentProblem = problems && problems.length > 0 ? problems[currentIndex] : null;

  // Add a new problem
  const addProblem = (problem) => {
    setProblems(currentProblems => {
      const newProblems = [...currentProblems];

      // Standardize the problem
      const standardized = StorageService.standardizeQuestions([problem]).questions[0];

      // Add ID if not present
      if (!standardized.id) {
        standardized.id = newProblems.length > 0
          ? Math.max(...newProblems.map(p => p.id)) + 1
          : 1;
      }

      newProblems.push(standardized);
      return newProblems;
    });
  };

  // Update a problem
  const updateProblem = (index, updatedProblem) => {
    setProblems(currentProblems => {
      const newProblems = [...currentProblems];

      if (index >= 0 && index < newProblems.length) {
        // Preserve the ID
        const id = newProblems[index].id;

        // Standardize the updated problem
        const standardized = StorageService.standardizeQuestions([updatedProblem]).questions[0];
        standardized.id = id;

        newProblems[index] = standardized;
      }

      return newProblems;
    });
  };

  // Remove a problem
  const removeProblem = (index) => {
    setProblems(currentProblems => {
      const newProblems = [...currentProblems];

      if (index >= 0 && index < newProblems.length) {
        newProblems.splice(index, 1);

        // Adjust current index if needed
        if (currentIndex >= newProblems.length) {
          setCurrentIndex(Math.max(0, newProblems.length - 1));
        }
      }

      return newProblems;
    });
  };

  // Import problems
  const importProblems = async (file) => {
    try {
      return await StorageService.importProblems(
        file,
        (importedProblems) => {
          setProblems(importedProblems);
          setCurrentIndex(0);
          return importedProblems;
        },
        (error) => {
          throw new Error(error);
        }
      );
    } catch (error) {
      console.error('Error importing problems:', error);
      return { success: false, error: error.message };
    }
  };

  // Export problems
  const exportProblems = (filename = null) => {
    try {
      return StorageService.exportProblems(problems, { filename });
    } catch (error) {
      console.error('Error exporting problems:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    problems,
    setProblems,
    currentIndex,
    setCurrentIndex,
    currentProblem,
    addProblem,
    updateProblem,
    removeProblem,
    importProblems,
    exportProblems,
    ...problemsOps
  };
};

export default useStorage;

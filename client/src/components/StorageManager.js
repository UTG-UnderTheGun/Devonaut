// StorageManager.js
import React, { useRef, useEffect, useState } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport, currentProblemIndex, testType }) => {
  const fileInputRef = useRef(null);
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [exportData, setExportData] = useState(null);

  // Add useEffect to listen for reset events
  useEffect(() => {
    const handleResetEvent = (event) => {
      console.log("Reset event detected in StorageManager:", event.detail);
      // Perform a cleanup of specific localStorage items
      clearProblemCode();
    };

    // Listen for both reset events
    window.addEventListener('code-reset', handleResetEvent);
    window.addEventListener('storage-reset', handleResetEvent);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('code-reset', handleResetEvent);
      window.removeEventListener('storage-reset', handleResetEvent);
    };
  }, []);

  const clearLocalStorage = () => {
    // First save the timestamp to ensure all components recognize this as a recent reset
    const resetTimestamp = Date.now();
    localStorage.setItem('reset_timestamp', resetTimestamp.toString());
    localStorage.setItem('editor_reset_timestamp', resetTimestamp.toString());
    
    // Create a full snapshot of ALL keys to avoid issues with keys changing during iteration
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    // Define comprehensive patterns to match for removal
    const patternsToRemove = [
      /^code-/,           // All code-* keys (code-code-0, code-fill-0, etc.)
      /^editor-code-/,    // All editor-code-* keys
      /^problem-code-/,   // All problem-code-* keys
      /^starter-code-/,   // All starter-code-* keys
      /^problem-title-/,  // All problem-title-* keys
      /^problem-description-/, // All problem-description-* keys
      /^output-/,         // All output-* keys
      /^editorCode$/,     // editorCode (exact match)
      /^problem-code$/,   // problem-code (exact match)
      /^problem-outputs$/,// problem-outputs (exact match)
      /^problem-answers$/,// problem-answers (exact match)
      /^problem-title$/,  // problem-title (exact match)
      /^problem-description$/,// problem-description (exact match)
      /^is-imported$/,    // is-imported (exact match)
      /^saved-problems$/, // saved-problems (exact match)
      /^problemsImported$/, // problemsImported (exact match)
    ];
    
    // Filter keys that match any pattern
    const keysToRemove = allKeys.filter(key => 
      patternsToRemove.some(pattern => pattern.test(key))
    );
    
    console.log("Clearing ALL code-related localStorage keys:", keysToRemove);
    
    // Remove all matched keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove key: ${key}`, error);
      }
    });
    
    // Do a final verification to make sure critical entries are definitely gone
    const criticalKeys = [
      'problem-code', 'editorCode', 'saved-problems', 
      'problem-answers', 'problem-outputs', 'is-imported',
      'problemsImported'
    ];
    
    criticalKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.warn(`Critical key ${key} still exists after cleanup, forcing removal...`);
        localStorage.removeItem(key);
      }
    });
    
    // Also check for any remaining pattern-based keys that should be gone
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('problem-code-') || 
        key.startsWith('code-') || 
        key.startsWith('problem-title-') || 
        key.startsWith('problem-description-')
      )) {
        console.warn(`Key ${key} still exists after cleanup, forcing removal...`);
        localStorage.removeItem(key);
      }
    }
    
    // Dispatch a custom event to notify components about the reset
    const resetEvent = new CustomEvent('storage-reset', {
      detail: { 
        source: 'import', 
        complete: true, 
        timestamp: resetTimestamp 
      }
    });
    window.dispatchEvent(resetEvent);
    
    // Also dispatch app-reset and code-reset events to ensure all components update
    window.dispatchEvent(new CustomEvent('app-reset', { 
      detail: { timestamp: resetTimestamp } 
    }));
    window.dispatchEvent(new CustomEvent('code-reset', { 
      detail: { timestamp: resetTimestamp, problemIndex: 0 } 
    }));
  };

  // Add a specific function to clear problem code
  const clearProblemCode = () => {
    console.log("Performing complete problem code cleanup");
    
    // Directly try to remove the most common keys first
    localStorage.removeItem('problem-code');
    localStorage.removeItem('editorCode');
    
    // Then do a thorough scan for all problem code related keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
          key.startsWith('code-') ||
          key.startsWith('editor-code-') ||
          key === 'editorCode' ||
          key === 'problem-code' ||
          key.startsWith('problem-code-')
      )) {
        keysToRemove.push(key);
      }
    }
    
    console.log("StorageManager: Clearing problem code keys:", keysToRemove);
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove key: ${key}`, error);
      }
    });
    
    // Do a final check to make sure all problem-code-* are gone
    setTimeout(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('problem-code-') || key === 'problem-code')) {
          console.warn(`Key ${key} still exists after cleanup, forcing removal again...`);
          localStorage.removeItem(key);
        }
      }
    }, 10);
  };

  const handleExport = () => {
    // Get all saved problems
    const savedProblemsJson = localStorage.getItem('saved-problems');
    if (!savedProblemsJson) {
      alert('No problems found to export');
      return;
    }
    
    try {
      const savedProblems = JSON.parse(savedProblemsJson);
      if (!Array.isArray(savedProblems) || savedProblems.length === 0) {
        alert('No valid problems found to export');
        return;
      }
      
      // Get all answers and outputs from localStorage
      const allAnswers = JSON.parse(localStorage.getItem('problem-answers') || '{}');
      const allOutputs = JSON.parse(localStorage.getItem('problem-outputs') || '{}');
      
      // Create an array to hold all problems with their data
      const exportProblems = savedProblems.map((problem, index) => {
        // Get problem-specific code and data for each problem
        const problemType = problem.type || 'code';
        
        // Try to get the user's code from storage using all possible storage keys
        let currentCode;
        
        // For code-type questions, check multiple storage patterns to ensure we get student's answer
        if (problemType === 'code') {
          // Check all possible storage patterns for code answers
          const storageKeys = [
            `problem-code-${problemType}-${index}`,  // New format with problem type
            `code-${problemType}-${index}`,          // Old format with problem type
            `problem-code-${index}`,                 // Old format without problem type
            `editor-code-${index}`                   // Very old format
          ];
          
          // Try each storage key until we find a value
          for (const key of storageKeys) {
            const storedCode = localStorage.getItem(key);
            if (storedCode) {
              console.log(`Found code for ${key}:`, storedCode);
              currentCode = storedCode;
              break;
            }
          }
        }
        
        // If we didn't find code in any of the specific storage locations, fall back to the default
        if (!currentCode) {
          currentCode = localStorage.getItem(`code-${problemType}-${index}`) || problem.code || problem.starterCode || '';
        }
        
        // Filter answers for this specific problem
        const problemAnswers = {};
        Object.keys(allAnswers).forEach(key => {
          if (key.includes(`-${index + 1}-`) || key.includes(`-${index}-`)) {
            problemAnswers[key] = allAnswers[key];
          }
        });

        // Create export object based on problem type
        const baseExport = {
          id: index + 1,
          title: problem.title || '',
          description: problem.description || '',
          code: problem.code || problem.starterCode || '', // Original starter code
          type: problemType,
          userAnswers: {} // Start with empty object
        };

        // Add specific data for each problem type
        switch (problemType) {
          case 'fill':
            if (Object.keys(problemAnswers).length > 0) {
              baseExport.userAnswers.fillAnswers = problemAnswers;
            }
            break;
          case 'output':
            if (allOutputs[index]) {
              baseExport.userAnswers.outputAnswer = allOutputs[index];
            }
            break;
          case 'code':
            // Always include the user's current code answer if it differs from starter code
            if (currentCode && currentCode !== problem.code && currentCode !== problem.starterCode) {
              baseExport.userAnswers.codeAnswer = currentCode;
              console.log(`Exporting user code answer for problem ${index}:`, currentCode);
            }
            if (allOutputs[index]) {
              baseExport.userAnswers.outputAnswer = allOutputs[index];
            }
            break;
        }

        return baseExport;
      });
      
      // Get current date for default filename
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Generate a default filename based on problem type or test type
      const testTypeStr = testType ? `-${testType}` : '';
      const problemTypeStr = savedProblems[0]?.type || 'python';
      const defaultFilename = `${problemTypeStr}-exercises${testTypeStr}-${dateStr}.json`;
      
      // Set default filename and export data
      setFilenameInput(defaultFilename);
      setExportData(exportProblems);
      
      // Show the filename dialog
      setShowFilenameDialog(true);
      
    } catch (error) {
      console.error('Error preparing export data:', error);
      alert('Failed to prepare export: ' + error.message);
    }
  };
  
  // Handle the actual download when user confirms filename
  const handleDownload = () => {
    try {
      if (!exportData) {
        alert('No data to export');
        return;
      }
      
      // Format JSON with 2-space indentation for readability
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create a Blob and downloadable link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Use provided filename or default if empty
      const filename = filenameInput.trim() || `python-exercises-${new Date().toISOString().slice(0, 10)}.json`;
      const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
      
      // Create and click a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      // Hide the dialog and reset state
      setShowFilenameDialog(false);
      setExportData(null);
      
      // Show success notification
      alert(`Successfully exported ${exportData.length} problems to ${finalFilename}`);
      
    } catch (error) {
      console.error('Error exporting problems:', error);
      alert('Failed to export problems: ' + error.message);
    }
  };
  
  // Cancel export
  const handleCancelExport = () => {
    setShowFilenameDialog(false);
    setExportData(null);
    console.log('Export cancelled by user');
  };

  const importData = async (file) => {
    try {
      // Check file size before proceeding (limit to 10MB)
      const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxFileSize) {
        alert(`File is too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
        return;
      }

      // Check file type - should be .json
      if (!file.name.toLowerCase().endsWith('.json')) {
        // Ask for confirmation if it's not a .json file
        const continueImport = window.confirm(`The file "${file.name}" does not have a .json extension. Are you sure it's a valid JSON file and you want to continue?`);
        if (!continueImport) {
          return;
        }
      }

      // Show progress indicator
      alert(`Importing "${file.name}"... This may take a moment.`);

      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate the imported data structure
      if (Array.isArray(data)) {
        const isValid = data.every(item => 
          item.id && 
          item.type && 
          (item.code !== undefined)
        );
        if (!isValid) {
          throw new Error('Invalid problem format in array');
        }
      } else {
        if (!data.id || !data.type || data.code === undefined) {
          throw new Error('Invalid problem format');
        }
      }

      // Check if we're replacing existing problems
      const existingProblems = localStorage.getItem('saved-problems');
      let shouldReplace = true;
      
      if (existingProblems) {
        try {
          const parsedProblems = JSON.parse(existingProblems);
          if (Array.isArray(parsedProblems) && parsedProblems.length > 0) {
            // Ask user if they want to replace or append
            shouldReplace = !window.confirm(
              `You already have ${parsedProblems.length} existing problems. Would you like to append the imported problems? Click Cancel to replace all existing problems.`
            );
          }
        } catch (e) {
          console.error('Error parsing existing problems:', e);
          // If there's an error parsing, default to replace
          shouldReplace = true;
        }
      }

      // Prepare all import data in memory before touching localStorage
      const importData = {
        problems: Array.isArray(data) ? [...data] : [data],
        storageItems: new Map(), // Store all items to be saved to localStorage
        allAnswers: {},
        allOutputs: {}
      };
      
      // If we're appending, get existing problems and answers
      if (!shouldReplace && existingProblems) {
        try {
          // Get existing problems
          const existingProblemData = JSON.parse(existingProblems);
          
          // Get existing answers and outputs
          const existingAnswers = JSON.parse(localStorage.getItem('problem-answers') || '{}');
          const existingOutputs = JSON.parse(localStorage.getItem('problem-outputs') || '{}');
          
          // Calculate the offset for the new problems (will be appended after existing ones)
          const offset = existingProblemData.length;
          
          // First add all existing problems to our import data
          importData.problems = [...existingProblemData];
          
          // Append the new problems with adjusted IDs
          if (Array.isArray(data)) {
            data.forEach((item, index) => {
              const adjustedItem = {...item, id: offset + index + 1};
              importData.problems.push(adjustedItem);
            });
          } else {
            const adjustedItem = {...data, id: offset + 1};
            importData.problems.push(adjustedItem);
          }
          
          // Merge existing answers and outputs
          importData.allAnswers = existingAnswers;
          importData.allOutputs = existingOutputs;
        } catch (e) {
          console.error('Error merging problems:', e);
          // If there's an error, fall back to replace mode
          importData.problems = Array.isArray(data) ? [...data] : [data];
          shouldReplace = true;
        }
      }
      
      // Process the imported data to extract all information first
      importData.problems.forEach((item, index) => {
        // Prepare title and description
        if (item.title) {
          importData.storageItems.set(`problem-title-${index}`, item.title);
        }
        if (item.description) {
          importData.storageItems.set(`problem-description-${index}`, item.description);
        }

        // Process user answers
        if (item.userAnswers) {
          // Store type-specific answers
          Object.keys(item.userAnswers).forEach(key => {
            if (!shouldReplace && importData.allAnswers[key]) {
              // If we're appending, merge with existing answers
              if (typeof importData.allAnswers[key] === 'object') {
                importData.allAnswers[key] = {...importData.allAnswers[key], ...item.userAnswers[key]};
              } else {
                importData.allAnswers[key] = item.userAnswers[key];
              }
            } else {
              importData.allAnswers[key] = item.userAnswers[key];
            }
          });
          
          // Handle code-type questions specifically
          if (item.type === 'code' && item.userAnswers.codeAnswer) {
            // Store student code with the correct key format
            const codeKey = `problem-code-${item.type}-${index}`;
            importData.storageItems.set(codeKey, item.userAnswers.codeAnswer);
            
            // Save in both common formats to ensure retrieval
            importData.storageItems.set(`code-${item.type}-${index}`, item.userAnswers.codeAnswer);
            
            // Track this in our answers object
            if (!importData.allAnswers.codeAnswers) {
              importData.allAnswers.codeAnswers = {};
            }
            importData.allAnswers.codeAnswers[index] = item.userAnswers.codeAnswer;
            
            // Also set individual codeAnswer for compatibility if this is the current problem
            if (index === currentProblemIndex) {
              importData.allAnswers.codeAnswer = item.userAnswers.codeAnswer;
            }
          }
        }
        
        // Handle output answers
        if (item.outputAnswer || (item.userAnswers && item.userAnswers.outputAnswer)) {
          const output = item.outputAnswer || item.userAnswers.outputAnswer;
          importData.allOutputs[index] = output;
        }
      });
      
      // If we're replacing, clear localStorage first
      if (shouldReplace) {
        clearLocalStorage();
      }
      
      // Mark this as an imported session
      localStorage.setItem('is-imported', 'true');
      localStorage.setItem('import-timestamp', Date.now().toString());
      
      // Store everything from our prepared data
      importData.storageItems.forEach((value, key) => {
        localStorage.setItem(key, value);
      });
      
      // Save problem answers and outputs
      if (Object.keys(importData.allAnswers).length > 0) {
        localStorage.setItem('problem-answers', JSON.stringify(importData.allAnswers));
      }
      
      if (Object.keys(importData.allOutputs).length > 0) {
        localStorage.setItem('problem-outputs', JSON.stringify(importData.allOutputs));
      }
      
      // Save problems into localStorage for tracking
      localStorage.setItem('saved-problems', JSON.stringify(importData.problems));
      localStorage.setItem('problemsImported', true);
      
      // Set a flag that indicates import is complete to prevent race conditions
      localStorage.setItem('import-complete', 'true');
      
      // Dispatch import completion event with minimal resets
      const importCompleteEvent = new CustomEvent('import-complete', {
        detail: { data: importData.problems }
      });
      window.dispatchEvent(importCompleteEvent);
      
      if (typeof onImport === 'function') {
        onImport(importData.problems);
      } else {
        throw new Error('Import handler not provided');
      }

      // Show success message
      alert(`Successfully imported ${Array.isArray(data) ? data.length : 1} problems from "${file.name}"`);

    } catch (error) {
      console.error('Error importing data:', error);
      alert(`Failed to import data from "${file.name}": ${error.message}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await importData(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-tab">
      <button 
        onClick={handleExport} 
        className="btn-compact"
        title="Export problems to a JSON file"
      >
        Export
      </button>
      <button 
        onClick={handleImportClick} 
        className="btn-compact"
        title="Import problems from a JSON file"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Custom filename dialog for exports */}
      {showFilenameDialog && (
        <div className="filename-dialog-overlay">
          <div className="filename-dialog">
            <div className="filename-dialog-header">
              <h3>Export Problems</h3>
              <button className="filename-dialog-close" onClick={handleCancelExport}>×</button>
            </div>
            <div className="filename-dialog-body">
              <p>Enter a filename for your exported problems:</p>
              <input
                type="text"
                className="filename-input"
                value={filenameInput}
                onChange={(e) => setFilenameInput(e.target.value)}
                placeholder="problems.json"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleDownload();
                  }
                }}
              />
            </div>
            <div className="filename-dialog-footer">
              <button className="cancel-btn" onClick={handleCancelExport}>Cancel</button>
              <button className="download-btn" onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManager;
// StorageManager.js
import React, { useRef, useEffect } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport, currentProblemIndex, testType }) => {
  const fileInputRef = useRef(null);

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
        const currentCode = localStorage.getItem(`code-${problemType}-${index}`) || problem.code || problem.starterCode || '';
        
        // Filter answers for this specific problem
        const problemAnswers = {};
        Object.keys(allAnswers).forEach(key => {
          if (key.includes(`-${index + 1}-`) || key.includes(`-${index}-`)) {
            problemAnswers[key] = allAnswers[key];
          }
        });

        // สร้าง export object ตามประเภทของโจทย์
        const baseExport = {
          id: index + 1,
          title: problem.title || '',
          description: problem.description || '',
          code: currentCode,
          type: problemType,
          userAnswers: {} // เริ่มต้นด้วย empty object
        };

        // เพิ่มข้อมูลเฉพาะตามประเภทของโจทย์
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
            if (currentCode && currentCode !== problem.code) {
              baseExport.userAnswers.codeAnswer = currentCode;
            }
            if (allOutputs[index]) {
              baseExport.userAnswers.outputAnswer = allOutputs[index];
            }
            break;
        }

        return baseExport;
      });
      
      // Convert to JSON and create download
      const blob = new Blob([JSON.stringify(exportProblems, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `python-exercises-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting problems:', error);
      alert('Failed to export problems: ' + error.message);
    }
  };

  const importData = async (file) => {
    try {
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

      // Clear localStorage before importing new problems
      clearLocalStorage();
      
      // Set the imported flag
      localStorage.setItem('is-imported', 'true');

      // Prepare to collect all answers and outputs
      const allAnswers = {};
      const allOutputs = {};
      
      // Process the imported data to extract answers and outputs
      if (Array.isArray(data)) {
        // Save individual problem titles and descriptions
        data.forEach((item, index) => {
          // Store title and description in localStorage for each problem
          if (item.title) {
            localStorage.setItem(`problem-title-${index}`, item.title);
          }
          if (item.description) {
            localStorage.setItem(`problem-description-${index}`, item.description);
          }

          // Save user answers if they exist
          if (item.userAnswers) {
            Object.keys(item.userAnswers).forEach(key => {
              allAnswers[key] = item.userAnswers[key];
            });
          }
          
          // Save output answers if they exist
          if (item.outputAnswer) {
            allOutputs[index] = item.outputAnswer;
          }
          
          // For backward compatibility
          if (!item.answers) {
            item.answers = {};
          }
        });
      } else {
        // Single problem case
        if (data.title) {
          localStorage.setItem('problem-title-0', data.title);
        }
        if (data.description) {
          localStorage.setItem('problem-description-0', data.description);
        }

        if (data.userAnswers) {
          Object.keys(data.userAnswers).forEach(key => {
            allAnswers[key] = data.userAnswers[key];
          });
        }
        
        if (data.outputAnswer) {
          allOutputs[0] = data.outputAnswer;
        }
        
        if (!data.answers) {
          data.answers = {};
        }
      }
      
      // Save all collected answers and outputs to localStorage
      if (Object.keys(allAnswers).length > 0) {
        localStorage.setItem('problem-answers', JSON.stringify(allAnswers));
      }
      
      if (Object.keys(allOutputs).length > 0) {
        localStorage.setItem('problem-outputs', JSON.stringify(allOutputs));
      }

      if (typeof onImport === 'function') {
        onImport(data);
      } else {
        throw new Error('Import handler not provided');
      }

    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data: ' + error.message);
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
      <button onClick={handleExport} className="btn-compact">
        Export
      </button>
      <button onClick={handleImportClick} className="btn-compact">
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default StorageManager;
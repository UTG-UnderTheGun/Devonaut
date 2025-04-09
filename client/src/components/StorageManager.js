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
    // New approach: first collect ALL keys, then filter what to remove
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    // Define patterns to match for removal
    const patternsToRemove = [
      /^code-/,           // code-*
      /^editor-code-/,    // editor-code-*
      /^problem-code-/,   // problem-code-*
      /^starter-code-/,   // starter-code-*
      /^problem-title-/,  // problem-title-*
      /^problem-description-/, // problem-description-*
      /^output-/,         // output-*
      /^editorCode$/,     // editorCode (exact match)
      /^problem-code$/,   // problem-code (exact match)
      /^problem-outputs$/,// problem-outputs (exact match)
      /^problem-answers$/,// problem-answers (exact match)
      /^problem-title$/,  // problem-title (exact match)
      /^problem-description$/,// problem-description (exact match)
      /^is-imported$/,    // is-imported (exact match)
      /^saved-problems$/, // saved-problems (exact match)
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
    
    // Do a final verification to make sure ALL problem-code-* entries are definitely gone
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('problem-code-') || key === 'problem-code')) {
        console.warn(`Key ${key} still exists after cleanup, forcing removal...`);
        localStorage.removeItem(key);
      }
    }
    
    // Dispatch a custom event to notify components about the reset
    const resetEvent = new CustomEvent('storage-reset', {
      detail: { source: 'import', complete: true, timestamp: Date.now() }
    });
    window.dispatchEvent(resetEvent);

    const testCodeSeparation = () => {
      // Sample test data
      const testProblems = [
        { index: 0, code: "def problem_0():\n    return 'test0'" },
        { index: 1, code: "def problem_1():\n    return 'test1'" }
      ];
      
      console.log("TESTING CODE SEPARATION: Storing test codes for different problems");
      
      // Store test code for each problem
      testProblems.forEach(problem => {
        const key = `code-code-${problem.index}`;
        localStorage.setItem(key, problem.code);
        console.log(`Set ${key} = ${problem.code}`);
      });
      
      // Verify each problem has correct code
      testProblems.forEach(problem => {
        const key = `code-code-${problem.index}`;
        const storedCode = localStorage.getItem(key);
        console.log(`Verification: ${key} = ${storedCode}`);
        const isCorrect = storedCode === problem.code;
        console.log(`Test ${problem.index} ${isCorrect ? 'PASSED' : 'FAILED'}`);
      });
    };
    
    // Uncomment next line to run test
    // testCodeSeparation();
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
      
      // Get the current editor content directly from the DOM if possible
      let currentEditorContent = '';
      try {
        // Try to access the current editor content via Monaco editor instance
        if (window.monacoEditors && window.monacoEditors.length > 0) {
          currentEditorContent = window.monacoEditors[0].getValue();
          console.log("Got current editor content from Monaco:", currentEditorContent);
        }
      } catch (err) {
        console.warn("Couldn't get editor content directly:", err);
      }
      
      // Create an array to hold all problems with their data
      const exportProblems = savedProblems.map((problem, index) => {
        // Get problem-specific code and data for each problem
        const problemType = problem.type || 'code';
        
        // Try multiple sources to get the current code for this problem
        let currentCode = '';
        
        // If this is the current problem being edited and we have editor content, use that
        if (index === currentProblemIndex && currentEditorContent) {
          currentCode = currentEditorContent;
          console.log(`Using current editor content for problem ${index}`);
        } else {
          // Otherwise try various localStorage keys
          const possibleKeys = [
            `code-${problemType}-${index}`,
            `editor-code-${problemType}-${index}`,
            `problem-code-${index}`,
            `editorCode-${index}`
          ];
          
          for (const key of possibleKeys) {
            const storedCode = localStorage.getItem(key);
            if (storedCode && storedCode.trim() !== '') {
              currentCode = storedCode;
              console.log(`Found code for problem ${index} in key ${key}`);
              break;
            }
          }
          
          // If no stored code found, fall back to problem definition
          if (!currentCode || currentCode.trim() === '') {
            currentCode = problem.code || problem.starterCode || '';
          }
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
          code: currentCode,
          type: problemType,
          userAnswers: {} // Start with empty object
        };

        // Add type-specific data
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
            // Always include the code as an answer for code type problems
            if (currentCode && currentCode.trim() !== '') {
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
        // Map exercise types more carefully - only convert if needed
        data.forEach((item, index) => {
          // Only convert types that need conversion
          if (item.type === 'coding' && item.type !== 'code') {
            console.log(`Converting exercise ${index + 1} type from 'coding' to 'code'`);
            item.type = 'code';
          } else if (item.type === 'explain' && item.type !== 'output') {
            console.log(`Converting exercise ${index + 1} type from 'explain' to 'output'`);
            item.type = 'output';
          }
          
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
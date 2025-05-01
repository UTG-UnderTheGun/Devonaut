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
      console.log('Loaded outputs from localStorage:', allOutputs);
      
      // Create an array to hold all problems with their data
      const exportProblems = savedProblems.map((problem, index) => {
        // Get problem-specific code and data for each problem
        const problemType = problem.type || 'code';
        
        // For output type problems, use the original problem code
        let currentCode = '';
        if (problemType === 'output' || problemType === 'explain') {
          currentCode = problem.code || problem.starterCode || '';
          console.log(`Using original code for output problem ${index}:`, currentCode);
        } else {
          // For other types, try to get saved code
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
        
        // Structure answers according to the AssignmentSubmission schema
        // with exercise ID as the key in a Dict[int, Any] format
        const exerciseId = problem.id || index + 1;
        const answer = {};
        
        // Build answer data based on problem type
        if (problemType === 'fill') {
          // Get all blank answers for this exercise
          const exerciseBlanks = {};
          Object.entries(allAnswers).forEach(([key, value]) => {
            if (key.startsWith(`blank-${exerciseId}-`) || 
                key.startsWith(`blank-${index}-`) ||
                key.startsWith(`blank-${index + 1}-`)) {
              exerciseBlanks[key] = value;
            }
          });
          
          // If there are blanks, add them to the answer
          if (Object.keys(exerciseBlanks).length > 0) {
            Object.assign(answer, exerciseBlanks);
          }
        } else if (problemType === 'output' || problemType === 'explain') {
          // Get output answer
          const outputAnswer = allOutputs[index] || allOutputs[index.toString()] || 
                              allOutputs[exerciseId] || allOutputs[exerciseId.toString()];
          if (outputAnswer) {
            // For output-type problems, the answer is the output string
            return {
              id: exerciseId,
              title: problem.title || '',
              description: problem.description || '',
              code: currentCode,
              type: problemType,
              answers: {
                [exerciseId]: outputAnswer
              }
            };
          }
        } else if (problemType === 'code' || problemType === 'coding') {
          // For code problems, the answer is the code itself
          // Store it directly with the exercise ID as shown in the schema example
          return {
            id: exerciseId,
            title: problem.title || '',
            description: problem.description || '',
            code: currentCode,
            type: problemType === 'coding' ? 'code' : problemType, // Normalize type
            answers: {
              [exerciseId]: currentCode // Directly use the code as the answer value
            }
          };
        }
        
        // If we have a specific answer structure from above, return it
        if (Object.keys(answer).length > 0) {
          return {
            id: exerciseId,
            title: problem.title || '',
            description: problem.description || '',
            code: currentCode,
            type: problemType,
            answers: {
              [exerciseId]: answer
            }
          };
        }
        
        // Default export object with empty answers
        return {
          id: exerciseId,
          title: problem.title || '',
          description: problem.description || '',
          code: currentCode,
          type: problemType,
          answers: {}
        };
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

      // Prepare to collect answers in the schema-compatible format
      const schemaAnswers = {};
      
      // Process the imported data to extract answers in the correct format
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          // Normalize exercise type
          if (item.type === 'coding' && item.type !== 'code') {
            console.log(`Converting exercise ${index + 1} type from 'coding' to 'code'`);
            item.type = 'code';
          }
          
          // Store title and description in localStorage for each problem
          if (item.title) {
            localStorage.setItem(`problem-title-${index}`, item.title);
          }
          if (item.description) {
            localStorage.setItem(`problem-description-${index}`, item.description);
          }

          // Store code for each problem with proper type and index
          const problemType = item.type || 'code';
          const codeKey = `code-${problemType}-${index}`;
          if (item.code) {
            localStorage.setItem(codeKey, item.code);
            console.log(`Stored code for problem ${index} with key ${codeKey}`);
          }

          // Store answers in the schema-compatible format
          const exerciseId = item.id || (index + 1).toString();
          
          // Process answers from the answers object if it exists
          if (item.answers && typeof item.answers === 'object') {
            // If answers follows the schema format (Dict[int, Any])
            Object.entries(item.answers).forEach(([answerKey, answerValue]) => {
              schemaAnswers[answerKey] = answerValue;
            });
          } 
          
          // Also check legacy format in userAnswers
          if (item.userAnswers) {
            if (item.type === 'output' || item.type === 'explain') {
              if (item.userAnswers.outputAnswer) {
                schemaAnswers[exerciseId] = item.userAnswers.outputAnswer;
              }
            } else if (item.type === 'code' || item.type === 'coding') {
              if (item.userAnswers.codeAnswer) {
                schemaAnswers[exerciseId] = item.userAnswers.codeAnswer;
              }
            } else if (item.type === 'fill') {
              if (item.userAnswers.fillAnswers) {
                // For fill exercises, store the individual blank answers
                Object.entries(item.userAnswers.fillAnswers).forEach(([blankKey, blankValue]) => {
                  // Make sure the blank key is in the format blank-exerciseId-index
                  if (!blankKey.startsWith(`blank-${exerciseId}-`)) {
                    // Reformat to ensure it's properly associated with the exercise
                    const blankIndex = blankKey.split('-').pop();
                    schemaAnswers[`blank-${exerciseId}-${blankIndex}`] = blankValue;
                  } else {
                    schemaAnswers[blankKey] = blankValue;
                  }
                });
              }
            }
          }
        });
      } else {
        // Single problem case - handle the same way
        const exerciseId = data.id || '1';
        const index = 0;
        
        if (data.title) {
          localStorage.setItem('problem-title-0', data.title);
        }
        if (data.description) {
          localStorage.setItem('problem-description-0', data.description);
        }

        // Store code for single problem
        const problemType = data.type || 'code';
        const codeKey = `code-${problemType}-0`;
        if (data.code) {
          localStorage.setItem(codeKey, data.code);
          console.log(`Stored code for single problem with key ${codeKey}`);
        }

        // Process answers from the schema-compatible format if present
        if (data.answers && typeof data.answers === 'object') {
          Object.entries(data.answers).forEach(([answerKey, answerValue]) => {
            schemaAnswers[answerKey] = answerValue;
          });
        }
        
        // Also check legacy format in userAnswers
        if (data.userAnswers) {
          if (data.type === 'output' || data.type === 'explain') {
            if (data.userAnswers.outputAnswer) {
              schemaAnswers[exerciseId] = data.userAnswers.outputAnswer;
            }
          } else if (data.type === 'code' || data.type === 'coding') {
            // For coding exercises, store the code directly with the exercise ID
            if (data.userAnswers.codeAnswer) {
              schemaAnswers[exerciseId] = data.userAnswers.codeAnswer;
            } else if (data.code) {
              // Fallback to using the problem code
              schemaAnswers[exerciseId] = data.code;
            }
          }
        }
      }
      
      // Save the schema-compatible answers to localStorage
      if (Object.keys(schemaAnswers).length > 0) {
        localStorage.setItem('problem-answers', JSON.stringify(schemaAnswers));
        console.log("Stored schema-compatible answers:", schemaAnswers);
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
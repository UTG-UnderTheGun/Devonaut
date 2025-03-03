// StorageManager.js
import React, { useRef } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport, currentProblemIndex, testType }) => {
  const fileInputRef = useRef(null);

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
        
        // Extract blanks for fill-in-the-blank problems
        const blanks = [];
        if (problemType === 'fill' && currentCode) {
          // For fill problems, extract answers as blanks
          Object.keys(problemAnswers).forEach(key => {
            if (problemAnswers[key]) {
              blanks.push(problemAnswers[key]);
            }
          });
        }
        
        // Create export object for this problem
        return {
          id: index + 1,
          title: problem.title || '',
          description: problem.description || '',
          code: currentCode,
          type: problemType,
          blanks: blanks,
          expectedOutput: allOutputs[index] || '',
          userAnswers: problemAnswers, // Include user answers
          outputAnswer: allOutputs[index] || '' // Include output answer
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

  const clearLocalStorage = () => {
    // Clear all code-related localStorage items
    const keysToRemove = [];
    
    // Find all keys related to code, outputs, and answers
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
          key.startsWith('code-') || 
          key.startsWith('editor-code-') || 
          key.startsWith('starter-code-') ||
          key === 'problem-outputs' ||
          key === 'problem-answers' ||
          key === 'editorCode'
        )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all collected keys
    console.log("Clearing localStorage keys:", keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Dispatch a custom event to notify components about the reset
    const resetEvent = new CustomEvent('storage-reset', {
      detail: { source: 'import' }
    });
    window.dispatchEvent(resetEvent);
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

      // Prepare to collect all answers and outputs
      const allAnswers = {};
      const allOutputs = {};
      
      // Process the imported data to extract answers and outputs
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
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
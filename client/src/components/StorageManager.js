// StorageManager.js
import React, { useRef } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport, currentProblemIndex, testType }) => {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    // Get problem-specific code
    const currentCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
    const title = localStorage.getItem('problem-title');
    const description = localStorage.getItem('problem-description');
    const starterCode = localStorage.getItem(`starter-code-${currentProblemIndex}`);
    const answers = JSON.parse(localStorage.getItem('problem-answers') || '{}');

    // Create export object in same structure as import
    const exportData = {
      id: currentProblemIndex + 1,
      title: title || '',
      description: description || '',
      code: starterCode || '',
      type: testType,
      answers: '',
      blanks: []
    };

    // Convert to JSON and create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `problem${currentProblemIndex + 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      // Reset answers when importing new problem
      if (Array.isArray(data)) {
        data.forEach(item => {
          item.answers = item.answers || {};
        });
      } else {
        data.answers = data.answers || {};
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
// StorageManager.js
import React, { useRef } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport }) => {
  const fileInputRef = useRef(null);

  const exportData = () => {
    try {
      // Export current problem as JSON
      const currentProblem = {
        id: localStorage.getItem('current-problem-id') || 1,
        title: localStorage.getItem('problem-title') || '',
        description: localStorage.getItem('problem-description') || '',
        code: localStorage.getItem('editorCode') || '',
        type: localStorage.getItem('problem-type') || 'code',
        blanks: JSON.parse(localStorage.getItem('problem-blanks') || '[]'),
        expectedOutput: localStorage.getItem('problem-expected-output') || ''
      };

      const blob = new Blob([JSON.stringify(currentProblem, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `problem_${currentProblem.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const importData = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate the imported data structure
      if (Array.isArray(data)) {
        const isValid = data.every(item => item.id && item.type);
        if (!isValid) {
          throw new Error('Invalid problem format in array');
        }
      } else {
        if (!data.id || !data.type) {
          throw new Error('Invalid problem format');
        }
      }

      // ตรวจสอบว่า onImport มีค่าก่อนเรียกใช้
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
      <button onClick={exportData} className="btn-compact">
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
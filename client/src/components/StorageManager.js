// StorageManager.js
import React, { useRef } from 'react';
import '@/components/StorageManager.css';

const StorageManager = ({ onImport, currentProblemIndex, testType }) => {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      // Get answers from localStorage
      const savedAnswers = JSON.parse(localStorage.getItem('problem-answers') || '{}');
      const problemId = currentProblemIndex + 1; // คำนวณ id จาก index
      
      let filteredAnswers = {};

      if (testType === 'fill') {
        // สำหรับ type 'fill'
        Object.entries(savedAnswers).forEach(([key, value]) => {
          // ใช้ problemId แทน currentProblemIndex
          if (key.startsWith(`blank-${problemId}-`)) {
            filteredAnswers[key] = value;
          }
        });
      } else if (testType === 'code') {
        // สำหรับ type 'code'
        const studentCode = localStorage.getItem(`code-code-${currentProblemIndex}`);
        console.log('Student code:', studentCode);
        
        if (studentCode && studentCode.trim() !== '') {
          filteredAnswers = { code: studentCode };
        }
      }

      // Get output if it's output type
      const output = testType === 'output' ? 
        localStorage.getItem(`output-${currentProblemIndex}`) || null : null;

      // Prepare export data
      const exportData = {
        id: problemId,
        problemIndex: currentProblemIndex,
        code: null,
        type: testType,
        answers: filteredAnswers,
        output: output,
        starterCode: localStorage.getItem(`starter-code-${currentProblemIndex}`)
      };

      console.log('Exporting data:', exportData);

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `problem${problemId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
// StorageManager.js
import React, { useRef } from 'react';
import '@/components/StorageManager.css';
import { useCodeContext } from '@/app/context/CodeContext';

const StorageManager = () => {
  const fileInputRef = useRef(null);
  const { code, setCode } = useCodeContext(); // Get code and setCode from context

  const exportData = () => {
    try {
      const title = localStorage.getItem('problem-title') || 'solution.py';

      // Create a Blob with the current code
      const blob = new Blob([code], {
        type: 'text/plain'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.py`;
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
      
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        if (data.title) localStorage.setItem('problem-title', data.title);
        if (data.description) localStorage.setItem('problem-description', data.description);
        if (data.code) {
          setCode(data.code);
          localStorage.setItem('editorCode', data.code);
        }
      } else {
        // If it's a .py file, just import the code
        setCode(text);
        localStorage.setItem('editorCode', text);
      }

      window.dispatchEvent(new CustomEvent('ide-data-import', {
        detail: {
          title: file.name.replace('.py', ''),
          code: text
        }
      }));

      localStorage.setItem('ide-import-timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data');
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
        onClick={exportData}
        className="btn-compact"
      >
        Export
      </button>
      <button
        onClick={handleImportClick}
        className="btn-compact"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default StorageManager;
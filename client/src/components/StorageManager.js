import React, { useRef } from 'react';

const StorageManager = () => {
  const fileInputRef = useRef(null);

  const exportData = () => {
    try {
      const data = {
        title: localStorage.getItem('problem-title') || 'solution.py',
        description: localStorage.getItem('problem-description') || '',
        code: localStorage.getItem('editorCode') || ''
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.title.toLowerCase().replace(/\s+/g, '-')}.json`;
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

      // Save to localStorage
      if (data.title) localStorage.setItem('problem-title', data.title);
      if (data.description) localStorage.setItem('problem-description', data.description);
      if (data.code) localStorage.setItem('editorCode', data.code);

      // Dispatch event for real-time update
      window.dispatchEvent(new CustomEvent('ide-data-import', {
        detail: {
          title: data.title,
          description: data.description,
          code: data.code
        }
      }));

      // Trigger a storage event for cross-tab synchronization
      localStorage.setItem('ide-import-timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data');
    }
  };

  const handleExport = () => {
    exportData();
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
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        ⬇️ Export
      </button>
      <button
        onClick={handleImportClick}
        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
      >
        ⬆️ Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default StorageManager;

// components/TableControls.js
'use client'
import "./table-control.css"

const TableControls = ({ 
  activeView,
  searchTerm,
  selectedSection,
  onSearchChange,
  onSectionChange 
}) => {
  return (
    <div className="table-controls">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder={activeView === 'students' 
            ? "Search students..." 
            : activeView === 'sections'
            ? "Search sections..."
            : "Search assignments..."}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {activeView === 'students' && (
        <div className="filters">
          <select
            value={selectedSection}
            onChange={(e) => onSectionChange(e.target.value)}
            className="section-filter"
          >
            <option value="all">All Sections</option>
            <option value="760001">Section 760001</option>
            <option value="760002">Section 760002</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default TableControls;
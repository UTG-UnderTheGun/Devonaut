// components/StudentTable.js
'use client'
import "./student-table.css"

const StudentTable = ({ 
  data, 
  sortConfig, 
  onSort, 
  loading 
}) => {
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="table-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <table className="student-table">
        <thead>
          <tr>
            {['id', 'name', 'section', 'score'].map((key) => (
              <th
                key={key}
                onClick={() => onSort(key)}
                className={sortConfig.key === key ? 'sorted' : ''}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
                <span className="sort-indicator">{getSortIcon(key)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((student, index) => (
            <tr key={student.id} className={index % 2 === 1 ? 'alternate' : ''}>
              <td>{student.id}</td>
              <td>{student.name}</td>
              <td>{student.section}</td>
              <td>
                <div className="score-cell">
                  <div className="score-bar" style={{ width: `${student.score * 10}%` }}></div>
                  <span className="score-value">{student.score}/10</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
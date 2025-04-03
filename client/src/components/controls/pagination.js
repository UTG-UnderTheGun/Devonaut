// components/Pagination.js
'use client'
import "./pagination.css"

const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  onReload,
  isReloading = false // Add isReloading prop
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleReload = () => {
    if (onReload && !isReloading) {
      onReload();
    }
  };

  return (
    <div className="pagination">
      <div className="pagination-left">
        <span className="pagination-info">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </span>
        <button 
          className={`reload-button ${isReloading ? 'loading' : ''}`} 
          onClick={handleReload}
          aria-label="Reload data"
          title="Reload data"
          disabled={isReloading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"></path>
            <path d="M23 20v-6h-6"></path>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
        </button>
      </div>
      <div className="pagination-controls">
        <button
          className="pagination-button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <button
          className="pagination-button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
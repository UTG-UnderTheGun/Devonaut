// components/Stats.js
'use client'
import "./stats.css"

const Stats = ({ stats, onStatClick }) => {
  return (
    <div className="stats-container">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`stat-card clickable ${stat.highlighted ? 'highlighted' : ''}`}
            onClick={() => onStatClick(stat.id)}
          >
            <h3 className="stat-title">{stat.title}</h3>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;
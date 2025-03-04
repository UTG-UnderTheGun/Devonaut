import React, { useEffect } from 'react';
import AIChatInterface from '../ai-interface/ai-interface';

const DescriptionPanel = ({
  isDescriptionFolded,
  setIsDescriptionFolded,
  testType,
  selectedDescriptionTab,
  setSelectedDescriptionTab,
  title,
  description,
  handleTitleChange,
  handleDescriptionChange,
  user_id,
  exercise_id  // New prop for exercise-specific chats
}) => {
  // Log exercise_id changes for debugging
  useEffect(() => {
    console.log(`DescriptionPanel: exercise_id changed to ${exercise_id}`);
  }, [exercise_id]);

  return (
    <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
      <div className="panel-header">
        <div className="description-tabs">
          {testType === 'code' && (
            <button
              className={`description-tab ${selectedDescriptionTab === 'Description' ? 'active' : ''}`}
              onClick={() => setSelectedDescriptionTab('Description')}
            >
              Description
            </button>
          )}
          <button
            className={`description-tab ${selectedDescriptionTab === 'ASK AI' ? 'active' : ''}`}
            onClick={() => setSelectedDescriptionTab('ASK AI')}
          >
            ASK AI
          </button>
        </div>
        <button
          className="fold-button"
          onClick={() => setIsDescriptionFolded(!isDescriptionFolded)}
        >
          {isDescriptionFolded ? '►' : '◄'}
        </button>
      </div>
      <div className="panel-content">
        {selectedDescriptionTab === 'Description' && testType === 'code' ? (
          <>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="problem-title"
              placeholder="Enter problem title..."
            />
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              className="problem-description"
              placeholder="Enter problem description..."
            />
          </>
        ) : (
          <div className="ask-ai-content">
            {/* Pass exercise_id and key to force re-render when exercise changes */}
            <AIChatInterface
              user_id={user_id}
              exercise_id={exercise_id}
              key={`chat-${exercise_id || 'global'}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DescriptionPanel;

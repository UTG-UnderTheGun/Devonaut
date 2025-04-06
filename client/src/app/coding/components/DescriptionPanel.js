import React, { useEffect, useState, useRef } from 'react';
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
  // State to track if the problem is from an import
  const [isImported, setIsImported] = useState(false);
  const [animatingTab, setAnimatingTab] = useState('');

  // Create refs for tab buttons
  const descriptionTabRef = useRef(null);
  const askAITabRef = useRef(null);

  // Function to create ripple effect on click
  const createRipple = (event) => {
    const button = event.currentTarget;

    // Remove any existing ripple
    const ripple = button.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }

    // Create new ripple element
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    // Calculate position
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left}px`;
    circle.style.top = `${event.clientY - rect.top}px`;
    circle.classList.add('ripple');

    // Add to button
    button.appendChild(circle);

    // Remove after animation completes
    setTimeout(() => {
      circle.remove();
    }, 800);
  };

  // Function to handle tab click with animation
  const handleTabClick = (event, tabName) => {
    // Create ripple effect
    createRipple(event);

    // Immediately set the selected tab (this ensures bold text applies instantly)
    setSelectedDescriptionTab(tabName);

    // Set animating state for the animation effect only
    setAnimatingTab(tabName);

    // Reset animation state after animation completes
    setTimeout(() => {
      setAnimatingTab('');
    }, 400);
  };

  // Check if this is an imported problem by checking localStorage
  useEffect(() => {
    const importedFlag = localStorage.getItem('is-imported');
    setIsImported(importedFlag === 'true');

    // Set up a listener for storage changes
    const handleStorageChange = () => {
      const currentFlag = localStorage.getItem('is-imported');
      setIsImported(currentFlag === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage-reset', handleStorageChange);
    window.addEventListener('code-reset', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage-reset', handleStorageChange);
      window.removeEventListener('code-reset', handleStorageChange);
    };
  }, []);

  // Ensure initial tab is properly styled
  useEffect(() => {
    // Apply active state to the initial tab
    if (selectedDescriptionTab === 'Description' && descriptionTabRef.current) {
      descriptionTabRef.current.classList.add('active');
    } else if (selectedDescriptionTab === 'ASK AI' && askAITabRef.current) {
      askAITabRef.current.classList.add('active');
    }
  }, []);

  // Log exercise_id changes for debugging
  useEffect(() => {
    console.log(`DescriptionPanel: exercise_id changed to ${exercise_id}`);
  }, [exercise_id]);

  // Log title and description changes for debugging
  useEffect(() => {
    console.log(`DescriptionPanel: title changed to: ${title}`);
    console.log(`DescriptionPanel: description changed (length: ${description ? description.length : 0})`);
    console.log(`DescriptionPanel: isImported = ${isImported}`);
  }, [title, description, isImported]);

  return (
    <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
      <div className="panel-header">
        <div className="description-tabs">
          {testType === 'code' && (
            <button
              ref={descriptionTabRef}
              className={`description-tab ${selectedDescriptionTab === 'Description' ? 'active' : ''} ${animatingTab === 'Description' ? 'animating' : ''}`}
              onClick={(e) => handleTabClick(e, 'Description')}
            >
              Description
            </button>
          )}
          <button
            ref={askAITabRef}
            className={`description-tab ${selectedDescriptionTab === 'ASK AI' ? 'active' : ''} ${animatingTab === 'ASK AI' ? 'animating' : ''}`}
            onClick={(e) => handleTabClick(e, 'ASK AI')}
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
            <div className="problem-display">
              <h3 className="problem-title-display">{title || 'No Title'}</h3>
              <div className="problem-description-display">
                {description || 'No description available.'}
              </div>
            </div>
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

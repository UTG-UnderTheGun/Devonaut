import React, { useEffect, useState, useRef } from 'react';
import AIChatInterface from '../ai-interface/ai-interface';

// Helper function to determine if the test type should show the description tab
const shouldShowDescription = (type) => {
  // Allow both original and mapped type values
  return type === 'code' || type === 'coding' || type === 'fill';
};

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

  // Check if this is an imported problem or if we have an exercise_id (assignment)
  useEffect(() => {
    const importedFlag = localStorage.getItem('is-imported');
    // Consider both imported problems and assignments (with exercise_id) as non-editable
    setIsImported(importedFlag === 'true' || !!exercise_id);

    // Set up a listener for storage changes
    const handleStorageChange = () => {
      const currentFlag = localStorage.getItem('is-imported');
      setIsImported(currentFlag === 'true' || !!exercise_id);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage-reset', handleStorageChange);
    window.addEventListener('code-reset', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage-reset', handleStorageChange);
      window.removeEventListener('code-reset', handleStorageChange);
    };
  }, [exercise_id]);

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
    // Whenever exercise_id changes, update imported status
    if (exercise_id) {
      setIsImported(true);
    }
  }, [exercise_id]);

  // Log title and description changes for debugging
  useEffect(() => {
    console.log(`DescriptionPanel: title changed to: ${title}`);
    console.log(`DescriptionPanel: description changed (length: ${description ? description.length : 0})`);
    console.log(`DescriptionPanel: isImported = ${isImported}`);
    console.log(`DescriptionPanel: testType = ${testType}`);
  }, [title, description, isImported, testType]);

  // Determine if we should show the description tab based on test type
  const showDescriptionTab = shouldShowDescription(testType);

  // Force assignments to be non-editable - if we have an exercise_id, it's an assignment
  const isAssignment = !!exercise_id;
  const isEditable = !isImported && !isAssignment;

  return (
    <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
      <div className="panel-header">
        <div className="description-tabs">
          {showDescriptionTab && (
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
        {selectedDescriptionTab === 'Description' && showDescriptionTab ? (
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

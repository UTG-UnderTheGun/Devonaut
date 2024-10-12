import { useState, useEffect } from 'react';
import './custom-context-menu.css'

const CustomContextMenu = () => {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  // Function to handle right-click (context menu) event
  const handleContextMenu = (event) => {
    event.preventDefault(); // Prevent the default context menu
    setMenuPosition({ x: event.pageX, y: event.pageY });
    setShowMenu(true);
  };

  // Hide the menu when clicking outside
  const handleClick = () => {
    setShowMenu(false);
  };

  // Attach event listeners when component mounts
  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);

    // Cleanup event listeners when component unmounts
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      {showMenu && (
        <ul
          className="context-menu"
          style={{
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            position: 'absolute',
            listStyle: 'none',
            zIndex: 1000
          }}
        >
          <li className='ask-teacher'><div>Ask teacher</div><div className='describe-context'>Ai</div></li>
          <hr className='hr-context' />
          <li>Teacher contact</li>
          <li>Help</li>
        </ul>
      )}
    </>
  );
};

export default CustomContextMenu;

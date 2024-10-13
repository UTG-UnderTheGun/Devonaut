import { useState, useEffect } from 'react';
import './custom-context-menu.css'

const CustomContextMenu = () => {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  const handleContextMenu = (event) => {
    event.preventDefault();
    setMenuPosition({ x: event.pageX, y: event.pageY });
    setShowMenu(true);
  };

  const handleClick = () => {
    setShowMenu(false);
  };

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);

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

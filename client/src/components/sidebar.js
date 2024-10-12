import Link from 'next/link';
import './sidebar.css';

const Sidebar = ({ user, onLogout }) => {
  return (
    <div className="sidebar-container">
      <nav className="sidebar">
        <ul className="navList">
          <li className="navItem">
            <Link href="/" className="navLink">{user}</Link>
          </li>
          <li className="navItem">
            <Link href="/exercises" className="navLink">Exercises</Link>
          </li>
          <li className="navItem">
            <Link href="/submitted" className="navLink">Success</Link>
          </li>
          <li className="navItem">
            <Link href="/contact" className="navLink">Contact</Link>
          </li>
        </ul>
        {/* Logout Button */}
        <div className="logout-container">
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>
      <div className="hover-area"></div>
    </div>
  );
};

export default Sidebar;

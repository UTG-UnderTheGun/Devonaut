// services/NotificationService.js

/**
 * Notification Service
 * 
 * Provides consistent notification capabilities across the application
 * for import/export operations and other user feedback.
 */

// Configuration
const NOTIFICATION_CONFIG = {
  // Default duration in milliseconds
  DEFAULT_DURATION: 5000,

  // Types of notifications
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },

  // Position options
  POSITIONS: {
    TOP_RIGHT: 'top-right',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_LEFT: 'bottom-left',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center'
  },

  // Default position
  DEFAULT_POSITION: 'top-right'
};

// Global notification container ID
const CONTAINER_ID = 'notification-container';

/**
 * Core notification service
 */
export const NotificationService = {
  /**
   * Initialize the notification container
   * 
   * @returns {HTMLElement} The notification container
   */
  _initContainer() {
    let container = document.getElementById(CONTAINER_ID);

    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.className = 'notification-container';
      document.body.appendChild(container);

      // Add styles if not already present
      if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.innerHTML = `
          .notification-container {
            position: fixed;
            z-index: 9999;
            max-width: 320px;
            box-sizing: border-box;
          }
          
          .notification-container.top-right {
            top: 12px;
            right: 12px;
          }
          
          .notification-container.top-left {
            top: 12px;
            left: 12px;
          }
          
          .notification-container.bottom-right {
            bottom: 12px;
            right: 12px;
          }
          
          .notification-container.bottom-left {
            bottom: 12px;
            left: 12px;
          }
          
          .notification-container.top-center {
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
          }
          
          .notification-container.bottom-center {
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
          }
          
          .notification {
            background: #fff;
            box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
            border-radius: 4px;
            margin-bottom: 12px;
            padding: 15px;
            position: relative;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease-out;
            max-width: 100%;
            display: flex;
            align-items: flex-start;
          }
          
          .notification.visible {
            opacity: 1;
            transform: translateY(0);
          }
          
          .notification.success {
            border-left: 4px solid #4CAF50;
          }
          
          .notification.error {
            border-left: 4px solid #F44336;
          }
          
          .notification.warning {
            border-left: 4px solid #FF9800;
          }
          
          .notification.info {
            border-left: 4px solid #2196F3;
          }
          
          .notification-icon {
            margin-right: 12px;
            font-size: 20px;
            min-width: 24px;
            text-align: center;
          }
          
          .notification-content {
            flex: 1;
          }
          
          .notification-title {
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .notification-message {
            margin: 0;
            font-size: 14px;
          }
          
          .notification-close {
            cursor: pointer;
            position: absolute;
            top: 5px;
            right: 5px;
            padding: 5px;
            background: transparent;
            border: none;
            font-size: 16px;
            line-height: 1;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Update container position
    const position = localStorage.getItem('notification-position') || NOTIFICATION_CONFIG.DEFAULT_POSITION;
    container.className = `notification-container ${position}`;

    return container;
  },

  /**
   * Show a notification
   * 
   * @param {Object} options - Notification options
   * @returns {Object} Notification control functions
   */
  show(options = {}) {
    const {
      type = NOTIFICATION_CONFIG.TYPES.INFO,
      title = '',
      message = '',
      duration = NOTIFICATION_CONFIG.DEFAULT_DURATION,
      position,
      showClose = true,
      icon = null,
      onClose = null
    } = options;

    // Initialize container
    const container = this._initContainer();

    // Update position if specified
    if (position && Object.values(NOTIFICATION_CONFIG.POSITIONS).includes(position)) {
      container.className = `notification-container ${position}`;
      localStorage.setItem('notification-position', position);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Generate a unique ID
    const id = `notification-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    notification.id = id;

    // Create notification content
    let iconHtml = '';

    if (icon) {
      iconHtml = `<div class="notification-icon">${icon}</div>`;
    } else {
      // Default icons based on type
      const icons = {
        [NOTIFICATION_CONFIG.TYPES.SUCCESS]: '✓',
        [NOTIFICATION_CONFIG.TYPES.ERROR]: '✕',
        [NOTIFICATION_CONFIG.TYPES.WARNING]: '⚠',
        [NOTIFICATION_CONFIG.TYPES.INFO]: 'ℹ'
      };

      iconHtml = `<div class="notification-icon">${icons[type] || 'ℹ'}</div>`;
    }

    notification.innerHTML = `
      ${iconHtml}
      <div class="notification-content">
        ${title ? `<div class="notification-title">${title}</div>` : ''}
        <p class="notification-message">${message}</p>
      </div>
      ${showClose ? `<button class="notification-close" aria-label="Close">×</button>` : ''}
    `;

    // Add to container
    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);

    // Create close function
    const close = () => {
      notification.classList.remove('visible');

      // Remove after animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }

        // Call onClose callback if provided
        if (typeof onClose === 'function') {
          onClose();
        }
      }, 300);
    };

    // Attach close handler
    if (showClose) {
      const closeButton = notification.querySelector('.notification-close');
      if (closeButton) {
        closeButton.addEventListener('click', close);
      }
    }

    // Auto-close after duration (if > 0)
    let timeoutId = null;

    if (duration > 0) {
      timeoutId = setTimeout(close, duration);
    }

    // Return control functions
    return {
      id,
      close,
      update: (newOptions = {}) => {
        // Update title if provided
        if (newOptions.title !== undefined) {
          const titleEl = notification.querySelector('.notification-title');
          if (titleEl) {
            titleEl.textContent = newOptions.title;
          } else if (newOptions.title) {
            const contentEl = notification.querySelector('.notification-content');
            if (contentEl) {
              const newTitleEl = document.createElement('div');
              newTitleEl.className = 'notification-title';
              newTitleEl.textContent = newOptions.title;
              contentEl.insertBefore(newTitleEl, contentEl.firstChild);
            }
          }
        }

        // Update message if provided
        if (newOptions.message !== undefined) {
          const messageEl = notification.querySelector('.notification-message');
          if (messageEl) {
            messageEl.textContent = newOptions.message;
          }
        }

        // Update type if provided
        if (newOptions.type !== undefined && Object.values(NOTIFICATION_CONFIG.TYPES).includes(newOptions.type)) {
          notification.className = `notification ${newOptions.type} visible`;
        }

        // Update duration if provided
        if (newOptions.duration !== undefined && newOptions.duration > 0) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(close, newOptions.duration);
        }
      }
    };
  },

  /**
   * Show a success notification
   * 
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification control functions
   */
  success(message, options = {}) {
    return this.show({
      type: NOTIFICATION_CONFIG.TYPES.SUCCESS,
      message,
      ...options
    });
  },

  /**
   * Show an error notification
   * 
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification control functions
   */
  error(message, options = {}) {
    return this.show({
      type: NOTIFICATION_CONFIG.TYPES.ERROR,
      message,
      ...options
    });
  },

  /**
   * Show a warning notification
   * 
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification control functions
   */
  warning(message, options = {}) {
    return this.show({
      type: NOTIFICATION_CONFIG.TYPES.WARNING,
      message,
      ...options
    });
  },

  /**
   * Show an info notification
   * 
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification control functions
   */
  info(message, options = {}) {
    return this.show({
      type: NOTIFICATION_CONFIG.TYPES.INFO,
      message,
      ...options
    });
  },

  /**
   * Clear all notifications
   */
  clearAll() {
    const container = document.getElementById(CONTAINER_ID);

    if (container) {
      // Remove visible class from all notifications
      const notifications = container.querySelectorAll('.notification');

      notifications.forEach(notification => {
        notification.classList.remove('visible');
      });

      // Remove all after animation
      setTimeout(() => {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }, 300);
    }
  },

  /**
   * Set default position for notifications
   * 
   * @param {string} position - Position from NOTIFICATION_CONFIG.POSITIONS
   */
  setPosition(position) {
    if (Object.values(NOTIFICATION_CONFIG.POSITIONS).includes(position)) {
      localStorage.setItem('notification-position', position);

      const container = document.getElementById(CONTAINER_ID);
      if (container) {
        container.className = `notification-container ${position}`;
      }
    }
  }
};

// Export convenience functions
export const showNotification = (options) => NotificationService.show(options);
export const showSuccess = (message, options) => NotificationService.success(message, options);
export const showError = (message, options) => NotificationService.error(message, options);
export const showWarning = (message, options) => NotificationService.warning(message, options);
export const showInfo = (message, options) => NotificationService.info(message, options);
export const clearAllNotifications = () => NotificationService.clearAll();

// Export for React component usage
export default NotificationService;

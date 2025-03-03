import { useEffect } from 'react';

/**
 * Enhanced Anti Copy/Paste hook that prevents content copying through 
 * multiple vectors including keyboard shortcuts, clipboard API, 
 * context menu, and selection.
 * 
 * @returns {void}
 */
const useAntiCopyPaste = () => {
  useEffect(() => {
    // 1. Block keyboard shortcuts with improved detection
    const handleKeyDown = (e) => {
      // Block standard copy/paste/cut operations
      const blockedKeys = ['c', 'v', 'x'];
      if ((e.ctrlKey || e.metaKey) && blockedKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }

      // Block alternative paste methods
      if ((e.shiftKey && e.key === 'Insert') ||
        (e.altKey && e.key === 'Insert')) {
        e.preventDefault();
        return false;
      }

      // Block select all to prevent easy copying of large blocks
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        return false;
      }

      // Block print and save functions that could be used to extract content
      if ((e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        return false;
      }

      // Block developer tools access
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Override clipboard API
    const overrideClipboard = () => {
      // Store original methods
      const originalClipboard = {};

      if (navigator.clipboard) {
        // Save originals before overriding
        if (navigator.clipboard.writeText) {
          originalClipboard.writeText = navigator.clipboard.writeText;
          navigator.clipboard.writeText = () => Promise.reject('Operation not permitted');
        }

        if (navigator.clipboard.readText) {
          originalClipboard.readText = navigator.clipboard.readText;
          navigator.clipboard.readText = () => Promise.reject('Operation not permitted');
        }
      }

      return originalClipboard;
    };

    // 4. Block drag operations which can be used for extracting text
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // 5. Detect and block large text selections
    const handleSelectionChange = () => {
      const selection = window.getSelection();

      // If selection is too large, clear it
      if (selection && selection.toString().length > 200) {
        selection.removeAllRanges();
      }
    };

    // 6. Block cut/copy events directly
    const handleCutCopy = (e) => {
      e.preventDefault();
      return false;
    };

    // Store original clipboard methods to restore on cleanup
    const originalClipboard = overrideClipboard();

    // Add all event listeners with capture phase to ensure they run first
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    document.addEventListener('selectionchange', handleSelectionChange, { capture: true });
    document.addEventListener('copy', handleCutCopy, { capture: true });
    document.addEventListener('cut', handleCutCopy, { capture: true });

    // CSS-based protection as an additional layer
    const style = document.createElement('style');
    style.innerHTML = `
      .protected-content {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    // Add protected class to specific elements
    // (You'll need to add this class to elements you want to protect)
    const protectElements = () => {
      const codeElements = document.querySelectorAll('.code-editor, textarea, pre, code');
      codeElements.forEach(element => {
        element.classList.add('protected-content');
      });
    };

    // Run once and then on any DOM changes
    protectElements();
    const observer = new MutationObserver(protectElements);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup function to remove all listeners and restore original functionality
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      document.removeEventListener('selectionchange', handleSelectionChange, { capture: true });
      document.removeEventListener('copy', handleCutCopy, { capture: true });
      document.removeEventListener('cut', handleCutCopy, { capture: true });

      // Restore original clipboard methods
      if (navigator.clipboard) {
        if (originalClipboard.writeText) {
          navigator.clipboard.writeText = originalClipboard.writeText;
        }
        if (originalClipboard.readText) {
          navigator.clipboard.readText = originalClipboard.readText;
        }
      }

      // Remove the added style
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }

      // Disconnect observer
      observer.disconnect();
    };
  }, []);
};

export default useAntiCopyPaste;

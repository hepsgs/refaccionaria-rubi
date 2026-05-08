/**
 * Utility to copy text to clipboard with multiple fallbacks
 * Works in secure and non-secure contexts
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // 1. Try modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern Clipboard API failed, trying fallback...', err);
    }
  }

  // 2. Fallback to legacy execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure it's not visible but part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('All clipboard fallback methods failed:', err);
    return false;
  }
};

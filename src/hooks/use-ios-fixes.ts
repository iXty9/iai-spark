
import { useEffect, RefObject } from 'react';
import { logger } from '@/utils/logging';
import { useDevMode } from '@/store/use-dev-mode';

export const useIOSFixes = (
  formRef: RefObject<HTMLFormElement>, 
  message: string,
  isIOSSafari: boolean
) => {
  const { isDevMode } = useDevMode();
  
  useEffect(() => {
    // Early return if not iOS Safari
    if (!isIOSSafari || !formRef.current) return;

    // Debug logging only in development or DevMode
    if ((process.env.NODE_ENV === 'development' || isDevMode) && !sessionStorage.getItem('ios-safari-logged')) {
      logger.info("iOS Safari compatibility active", null, { 
        once: true, 
        module: 'iOS-compat' 
      });
      sessionStorage.setItem('ios-safari-logged', 'true');
    }
    
    // Apply iOS fixes once
    const applyIOSFixes = () => {
      const formEl = formRef.current;
      if (!formEl) return;
      
      const rect = formEl.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(formEl);
      
      if (rect.height === 0 || computedStyle.display === 'none') {
        formEl.style.display = 'flex';
        formEl.style.visibility = 'visible';
        formEl.style.position = 'relative';
        formEl.style.zIndex = '1000';
        formEl.style.width = '100%';
        formEl.style.minHeight = '50px';
        formEl.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
        
        const parent = formEl.parentElement;
        if (parent) {
          parent.style.display = 'block';
          parent.style.visibility = 'visible';
          parent.style.position = 'relative';
        }
        
        // Find and ensure the textarea has proper font size
        const textarea = formEl.querySelector('textarea');
        if (textarea) {
          textarea.style.fontSize = '16px';
          textarea.style.touchAction = 'manipulation';
        }
        
        if (process.env.NODE_ENV === 'development' || isDevMode) {
          logger.info("Fixed invisible form on iOS Safari", null, { 
            once: true, 
            module: 'iOS-compat' 
          });
        }
      }
    };
    
    // Apply fixes immediately
    applyIOSFixes();
    
    // Listen to events that might affect form visibility
    const events = ['orientationchange', 'resize', 'scroll', 'focus'];
    
    const handleEvent = () => {
      setTimeout(applyIOSFixes, 300);
    };
    
    // Add specific handler for keyboard appearance
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && 
          (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        // Properly type-cast the target to HTMLElement before using scrollIntoView
        // Scroll to the input after a delay to account for keyboard appearance
        setTimeout(() => {
          if (e.target instanceof HTMLElement) {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    };
    
    // Add event listeners
    events.forEach(event => window.addEventListener(event, handleEvent));
    document.addEventListener('focusin', handleFocusIn);
    
    // Clean up
    return () => {
      events.forEach(event => window.removeEventListener(event, handleEvent));
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isIOSSafari, isDevMode]); // Only re-run when Safari detection or DevMode changes
};

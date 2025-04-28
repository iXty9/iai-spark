
import { useEffect, RefObject } from 'react';
import { logger } from '@/utils/logging';

export const useIOSFixes = (
  formRef: RefObject<HTMLFormElement>, 
  message: string,
  isIOSSafari: boolean
) => {
  useEffect(() => {
    // Only log in development and at most once per session
    const hasLogged = sessionStorage.getItem('ios-safari-logged');
    if (process.env.NODE_ENV === 'development' && !hasLogged && isIOSSafari) {
      logger.info("Checking iOS Safari compatibility", null, { 
        once: true, 
        module: 'iOS-compat' 
      });
      sessionStorage.setItem('ios-safari-logged', 'true');
    }
    
    if (formRef.current && isIOSSafari) {
      const checkVisibility = () => {
        const formEl = formRef.current;
        if (formEl) {
          const rect = formEl.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(formEl);
          
          // Only log once per session in development mode
          if (process.env.NODE_ENV === 'development' && !sessionStorage.getItem('form-visibility-logged')) {
            logger.debug("MessageInput form visibility", {
              rect: {
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                width: rect.width
              },
              isVisible: rect.height > 0 && rect.width > 0,
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              position: computedStyle.position,
              zIndex: computedStyle.zIndex
            }, { once: true, module: 'iOS-compat' });
            
            sessionStorage.setItem('form-visibility-logged', 'true');
          }
          
          if (isIOSSafari && (rect.height === 0 || computedStyle.display === 'none')) {
            // Only log fix attempts in development
            if (process.env.NODE_ENV === 'development' && !sessionStorage.getItem('ios-fix-attempt-logged')) {
              logger.info("Attempting to fix invisible form on iOS Safari", null, { 
                once: true, 
                module: 'iOS-compat' 
              });
              sessionStorage.setItem('ios-fix-attempt-logged', 'true');
            }
            
            formEl.style.display = 'flex';
            formEl.style.visibility = 'visible';
            formEl.style.position = 'relative';
            formEl.style.zIndex = '1000';
            formEl.style.width = '100%';
            formEl.style.minHeight = '50px';
            
            const parent = formEl.parentElement;
            if (parent) {
              parent.style.display = 'block';
              parent.style.visibility = 'visible';
              parent.style.position = 'relative';
            }
          }
        }
      };
      
      // Only check once initially
      checkVisibility();
      
      // Instead of timeout, we'll use a one-time resize event listener
      // for iOS keyboard changes which is more efficient
      const handleResize = () => {
        setTimeout(checkVisibility, 300);
        // Remove listener after it fires once
        window.removeEventListener('resize', handleResize);
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isIOSSafari]); // Only re-run when Safari detection changes
};

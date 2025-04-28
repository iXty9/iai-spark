
import { useEffect, RefObject } from 'react';

export const useIOSFixes = (
  formRef: RefObject<HTMLFormElement>, 
  message: string,
  isIOSSafari: boolean
) => {
  useEffect(() => {
    // Only log in development and at most once per session
    const hasLogged = sessionStorage.getItem('ios-safari-logged');
    if (process.env.NODE_ENV === 'development' && !hasLogged && isIOSSafari) {
      console.log("Checking iOS Safari compatibility");
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
            console.log("MessageInput form visibility:", {
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
            });
            sessionStorage.setItem('form-visibility-logged', 'true');
          }
          
          if (isIOSSafari && (rect.height === 0 || computedStyle.display === 'none')) {
            // Only log fix attempts in development
            if (process.env.NODE_ENV === 'development' && !sessionStorage.getItem('ios-fix-attempt-logged')) {
              console.log("Attempting to fix invisible form on iOS Safari");
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
      
      // Only check once initially instead of repeatedly
      checkVisibility();
      
      // Reduced frequency - only check again after 3 seconds if needed
      const timer = isIOSSafari ? setTimeout(checkVisibility, 3000) : null;
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [message, isIOSSafari]); // Only re-run on message change or Safari detection change
};

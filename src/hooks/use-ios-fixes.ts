
import { useEffect, RefObject } from 'react';

export const useIOSFixes = (
  formRef: RefObject<HTMLFormElement>, 
  message: string,
  isIOSSafari: boolean
) => {
  useEffect(() => {
    console.log("Checking iOS Safari compatibility");
    
    if (formRef.current) {
      const checkVisibility = () => {
        const formEl = formRef.current;
        if (formEl) {
          const rect = formEl.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(formEl);
          
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
          
          if (isIOSSafari && (rect.height === 0 || computedStyle.display === 'none')) {
            console.log("Attempting to fix invisible form on iOS Safari");
            
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
      
      checkVisibility();
      const timer = setTimeout(checkVisibility, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [message, isIOSSafari]);
};

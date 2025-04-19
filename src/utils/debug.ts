
/**
 * Debug utility functions to help troubleshoot iOS Safari issues
 */

// Log the computed style of an element for debugging
export const logElementStyle = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`Element with id ${elementId} not found in DOM`);
    return;
  }
  
  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  console.log(`Debug info for #${elementId}:`, {
    rect: {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height
    },
    computed: {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      overflow: computedStyle.overflow,
      top: computedStyle.top,
      left: computedStyle.left,
      bottom: computedStyle.bottom,
      right: computedStyle.right
    },
    parent: element.parentElement ? 
      element.parentElement.id || element.parentElement.tagName : 'none',
    children: element.children.length,
    classes: Array.from(element.classList)
  });
};

// Check iOS Safari specific info
export const logIOSSafariInfo = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    console.log("iOS Safari detected:", {
      userAgent: navigator.userAgent,
      viewportHeight: window.innerHeight,
      windowHeight: window.outerHeight,
      screenHeight: window.screen.height,
      visualViewport: window.visualViewport ? {
        height: window.visualViewport.height,
        width: window.visualViewport.width,
        scale: window.visualViewport.scale
      } : 'not available'
    });
  } else {
    console.log("Not iOS Safari:", { isIOS, isSafari });
  }
};

// Logs the DOM path from element to root
export const logDOMPath = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`Element with id ${elementId} not found in DOM`);
    return;
  }
  
  let currentEl: HTMLElement | null = element;
  const path: string[] = [];
  
  while (currentEl) {
    const id = currentEl.id ? `#${currentEl.id}` : '';
    const classes = currentEl.className ? 
      `.${currentEl.className.split(' ').join('.')}` : '';
    
    path.push(`${currentEl.tagName.toLowerCase()}${id}${classes}`);
    currentEl = currentEl.parentElement;
  }
  
  console.log(`DOM path for #${elementId}:`, path.join(' > '));
};

// Add this to App component to run debugging when things change
export const setupDebugListeners = () => {
  // Log when viewport changes (keyboard appears/disappears)
  window.addEventListener('resize', () => {
    console.log("Window resize event:", {
      innerHeight: window.innerHeight,
      outerHeight: window.outerHeight
    });
  });
  
  // Log visual viewport changes if available
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      console.log("Visual viewport changed:", {
        width: window.visualViewport?.width,
        height: window.visualViewport?.height,
        scale: window.visualViewport?.scale
      });
    });
    
    window.visualViewport.addEventListener('scroll', () => {
      console.log("Visual viewport scrolled:", {
        offsetTop: window.visualViewport?.offsetTop,
        offsetLeft: window.visualViewport?.offsetLeft
      });
    });
  }
  
  // Setup interval to check if input container is still in the DOM
  setInterval(() => {
    const inputContainer = document.getElementById('message-input-container');
    const inputForm = document.getElementById('message-input-form');
    
    if (!inputContainer && inputForm) {
      console.warn("Container missing but form present - DOM inconsistency detected");
    } else if (!inputContainer && !inputForm) {
      console.error("Both container and form missing from DOM");
    }
  }, 2000);
};

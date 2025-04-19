
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
      right: computedStyle.right,
      height: computedStyle.height,
      minHeight: computedStyle.minHeight,
      transform: computedStyle.transform,
      opacity: computedStyle.opacity
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
        scale: window.visualViewport.scale,
        offsetTop: window.visualViewport.offsetTop
      } : 'not available',
      safeAreaInsets: window.CSS && CSS.supports('(top: env(safe-area-inset-top))') ? {
        top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')
      } : 'not available' 
    });
    
    // Calculate the visible height (excluding browser chrome)
    const visibleHeight = window.innerHeight;
    console.log("Calculated visible height:", visibleHeight);
    
    // Check if any element with fixed position at bottom 0 is visible
    setTimeout(() => {
      checkFixedElementsVisibility();
    }, 1000);
  } else {
    console.log("Not iOS Safari:", { isIOS, isSafari });
  }
};

// Check if fixed elements at the bottom are visible
const checkFixedElementsVisibility = () => {
  // Get all potential fixed/sticky elements
  const bottomElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return (style.position === 'fixed' || style.position === 'sticky') && 
           (style.bottom === '0px' || parseInt(style.bottom, 10) < 20);
  });
  
  console.log("Found bottom-fixed/sticky elements:", bottomElements.length);
  
  bottomElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    console.log(`Bottom element #${index}:`, {
      tag: el.tagName,
      id: el.id,
      classes: Array.from(el.classList),
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height
      },
      style: {
        position: style.position,
        bottom: style.bottom,
        height: style.height,
        display: style.display,
        visibility: style.visibility
      },
      isVisible: rect.height > 0 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden'
    });
  });
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
        scale: window.visualViewport?.scale,
        offsetTop: window.visualViewport?.offsetTop,
        offsetLeft: window.visualViewport?.offsetLeft
      });
      
      // Check input visibility after viewport changes
      setTimeout(() => {
        const inputContainer = document.getElementById('message-input-container');
        if (inputContainer) {
          const rect = inputContainer.getBoundingClientRect();
          const style = window.getComputedStyle(inputContainer);
          console.log("Input container after viewport change:", {
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
            position: style.position,
            display: style.display,
            isVisibleInViewport: rect.bottom <= window.innerHeight && rect.top >= 0
          });
          
          // Additional fix: If keyboard is shown and input is off-screen, make it visible
          const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                            /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          
          if (isIOSSafari && (rect.top > window.innerHeight || rect.bottom < 0)) {
            console.log("Input detected as off-screen, forcing visibility");
            inputContainer.style.position = 'sticky';
            inputContainer.style.bottom = '0';
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
            
            // Ensure it's in view
            setTimeout(() => {
              inputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
          }
        }
      }, 500);
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
    
    if (inputContainer) {
      const rect = inputContainer.getBoundingClientRect();
      const computed = window.getComputedStyle(inputContainer);
      
      console.log("Periodic input container check:", {
        exists: true,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          isVisible: rect.height > 0 && rect.bottom <= window.innerHeight && rect.top >= 0
        },
        style: {
          display: computed.display,
          visibility: computed.visibility,
          position: computed.position,
          bottom: computed.bottom,
          height: computed.height
        },
        formExists: !!inputForm
      });
      
      // Add an automatic fix for iOS Safari - if input exists but is off-screen
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                         /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOSSafari) {
        const isOffScreen = rect.top > window.innerHeight || rect.bottom < 0;
        const notVisible = computed.display === 'none' || computed.visibility === 'hidden';
        
        if (isOffScreen || notVisible) {
          console.log("Automatically fixing off-screen or hidden input");
          
          // Force the input to be visible and positioned at the bottom
          inputContainer.style.position = 'sticky';
          inputContainer.style.bottom = '0';
          inputContainer.style.display = 'block';
          inputContainer.style.visibility = 'visible';
          inputContainer.style.zIndex = '1000';
          
          // Show the fallback button if we can't fix the main input
          const fallbackInput = document.getElementById('ios-fallback-input');
          if (fallbackInput && (isOffScreen || notVisible)) {
            fallbackInput.style.display = 'block';
          }
        }
      }
    } else {
      console.log("Periodic input container check: Not found in DOM");
    }
  }, 5000);
};

// Modified CSS test to try alternative layout approach
export const testAlternativeLayout = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    console.log("Applying alternative layout for iOS Safari testing");
    
    setTimeout(() => {
      const inputContainer = document.getElementById('message-input-container');
      if (inputContainer) {
        // Try removing flex, position, and height constraints
        inputContainer.style.position = 'relative';
        inputContainer.style.bottom = 'auto';
        inputContainer.style.height = 'auto';
        inputContainer.style.minHeight = '80px';
        inputContainer.style.backgroundColor = 'rgba(255,255,255,0.95)';
        inputContainer.style.transform = 'translateZ(0)'; // Force hardware acceleration
        
        // Also check for parent overflow issues
        let parent = inputContainer.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflow === 'hidden') {
            console.log("Found parent with overflow:hidden", parent);
            // Try temporarily disabling overflow hidden
            parent.style.overflow = 'visible';
          }
          
          // Check for height constraints
          if (style.height === '100%' || style.height.includes('vh')) {
            console.log("Found parent with height constraints", parent);
            // Try setting explicit height
            parent.style.height = 'auto';
            parent.style.minHeight = '100%';
          }
          
          parent = parent.parentElement;
        }
        
        console.log("Applied alternative layout styles");
      }
    }, 1000);
  }
};

// Add this to debug the root layout structure
export const checkLayoutRoot = () => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    console.log("Root element layout:", {
      height: window.getComputedStyle(rootEl).height,
      overflow: window.getComputedStyle(rootEl).overflow,
      position: window.getComputedStyle(rootEl).position,
      display: window.getComputedStyle(rootEl).display
    });
    
    // Check immediate children
    Array.from(rootEl.children).forEach((child, i) => {
      console.log(`Root child ${i}:`, {
        tag: child.tagName,
        height: window.getComputedStyle(child as Element).height,
        overflow: window.getComputedStyle(child as Element).overflow,
        position: window.getComputedStyle(child as Element).position
      });
    });
  }
};

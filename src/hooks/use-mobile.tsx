
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Function to check if device is mobile (includes better tablet detection)
    const checkMobile = () => {
      // Check for touch capability
      const isTouchDevice = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 ||
                          (navigator as any).msMaxTouchPoints > 0;
      
      // Check screen width
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      
      // Check user agent for mobile/tablet indicators
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent);
      
      // Consider it a mobile device if it's touch-capable AND either has a small screen or mobile UA
      return isTouchDevice && (isSmallScreen || isMobileDevice);
    };
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(checkMobile());
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(checkMobile());
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

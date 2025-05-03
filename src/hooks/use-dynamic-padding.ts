
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { useIsMobile } from '@/hooks/use-mobile';

export function useDynamicPadding(options?: {
  baseValue?: number;
  scaleFactor?: number;
  minPadding?: number;
  maxPadding?: number;
  mobileBaseValue?: number;
}) {
  const {
    baseValue = 4,      // Base padding in rem units
    scaleFactor = 0.1,  // How quickly padding increases with width
    minPadding = 1,     // Minimum padding in rem
    maxPadding = 12,    // Maximum padding in rem
    mobileBaseValue = 0.5, // Default padding for mobile
  } = options || {};

  const isMobile = useIsMobile();
  
  const [padding, setPadding] = useState({
    left: isMobile ? mobileBaseValue : baseValue,
    right: isMobile ? mobileBaseValue : baseValue
  });

  useEffect(() => {
    // Calculate padding based on viewport width
    const calculatePadding = () => {
      const viewportWidth = window.innerWidth;
      
      // Use mobile value for small screens
      if (isMobile || viewportWidth < 768) {
        setPadding({
          left: mobileBaseValue,
          right: mobileBaseValue
        });
        return;
      }
      
      const baseWidth = 1024; // Base width in pixels
      
      // Calculate dynamic padding that scales with screen width
      let dynamicPadding = baseValue + (viewportWidth - baseWidth) / 100 * scaleFactor;
      
      // Clamp padding between min and max values
      dynamicPadding = Math.max(minPadding, Math.min(maxPadding, dynamicPadding));
      
      setPadding({
        left: dynamicPadding,
        right: dynamicPadding
      });
      
      logger.debug('Dynamic padding updated', { 
        viewportWidth,
        dynamicPadding,
        isMobile
      }, { module: 'ui' });
    };

    // Calculate padding on mount and when window resizes
    calculatePadding();
    window.addEventListener('resize', calculatePadding);
    
    return () => {
      window.removeEventListener('resize', calculatePadding);
    };
  }, [baseValue, scaleFactor, minPadding, maxPadding, mobileBaseValue, isMobile]);

  return padding;
}

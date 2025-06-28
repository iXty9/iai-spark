
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Mobile Safari detection
const isMobileSafari = () => {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) && 
         /^((?!chrome|android).)*safari/i.test(userAgent);
};

export class MobileSafariErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const mobile = isMobileSafari();
    
    logger.error('Mobile Safari Error Boundary caught an error:', error, {
      errorInfo,
      isMobile: mobile,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      module: 'mobile-error-boundary'
    });

    this.setState({
      error,
      errorInfo,
    });

    // Mobile Safari specific error recovery
    if (mobile) {
      // Attempt recovery after a delay
      setTimeout(() => {
        logger.info('Attempting mobile Safari error recovery', {
          module: 'mobile-error-boundary'
        });
        
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      }, 2000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Mobile Safari specific fallback
      if (isMobileSafari()) {
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-background min-h-[200px]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Mobile Safari Compatibility Issue
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                We're automatically recovering from a mobile-specific issue. Please wait a moment.
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        );
      }

      // Default fallback
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            An error occurred while rendering this component.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

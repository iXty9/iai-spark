
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react';
import { logger } from '@/utils/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  errorId: string | null;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    logger.error('React Error Boundary caught error', error, {
      module: 'error-boundary',
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ProductionErrorBoundary'
    });

    this.setState({
      errorInfo: errorInfo.componentStack
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Clear all application state
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-pink-100">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                Application Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <Bug className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  The application encountered an unexpected error. 
                  {this.state.errorId && (
                    <span className="block mt-1 text-xs opacity-75">
                      Error ID: {this.state.errorId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 p-3 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">Error Details:</h4>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <h4 className="font-semibold text-sm mb-2 mt-3">Component Stack:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                        {this.state.errorInfo}
                      </pre>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReload} className="flex-1">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                
                <Button onClick={this.handleReset} variant="destructive" className="flex-1">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Reset App
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                If this problem persists, try clearing your browser cache or contact support.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

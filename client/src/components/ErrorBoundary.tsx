import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
  lastErrorTime?: number;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;
  private errorLog: Array<{ error: Error; timestamp: number }> = [];
  private readonly MAX_ERROR_LOG = 10;
  private readonly ERROR_RECOVERY_DELAY = 2000;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🛡️ TruckNav Pro Error Boundary caught an error:', error, errorInfo);
    
    // Log error to history
    this.errorLog.push({ error, timestamp: Date.now() });
    if (this.errorLog.length > this.MAX_ERROR_LOG) {
      this.errorLog.shift();
    }

    // Track error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error in localStorage for debugging
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      localStorage.setItem('trucknav_last_error', JSON.stringify(errorData));
    } catch (e) {
      console.warn('Failed to store error data:', e);
    }

    // Auto-recovery attempt for transient errors
    if (this.shouldAttemptAutoRecovery(error)) {
      this.attemptAutoRecovery();
    }
  }

  shouldAttemptAutoRecovery(error: Error): boolean {
    // Check if error is likely transient
    const transientErrors = [
      'ChunkLoadError',
      'NetworkError', 
      'TimeoutError',
      'Script error',
      'ResizeObserver loop limit exceeded'
    ];

    return (
      this.state.errorCount < this.MAX_RETRY_ATTEMPTS &&
      transientErrors.some(msg => error.message?.includes(msg))
    );
  }

  attemptAutoRecovery = () => {
    console.log('🔄 Attempting auto-recovery...');
    this.setState({ isRecovering: true });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined,
        isRecovering: false
      });
    }, this.ERROR_RECOVERY_DELAY);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleReload = () => {
    // Clear error state from localStorage
    try {
      localStorage.removeItem('trucknav_last_error');
      sessionStorage.setItem('trucknav_recovery_reload', 'true');
    } catch (e) {
      console.warn('Failed to clear error state:', e);
    }
    
    window.location.reload();
  }

  handleGoHome = () => {
    // Navigate to home safely
    window.location.href = '/';
  }

  handleRetry = () => {
    // Clear error and retry
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorCount: 0
    });
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Show recovery spinner for auto-recovery
      if (this.state.isRecovering) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground">Recovering from error...</p>
            </div>
          </div>
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-16 h-16 text-destructive" />
            </div>
            <h1 className="mobile-text-2xl font-bold text-foreground">
              {this.state.errorCount > 1 ? 'Persistent Error' : 'Application Error'}
            </h1>
            <p className="text-muted-foreground">
              {this.state.errorCount > 1 
                ? 'TruckNav Pro is experiencing issues. A full reload is recommended.'
                : 'TruckNav Pro encountered an unexpected error. You can try again or reload.'}
            </p>
            
            {/* Error details (collapsible) */}
            <details className="text-left mobile-text-sm text-muted-foreground bg-muted p-3 rounded">
              <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
              <div className="space-y-2">
                <div className="mobile-text-xs">
                  <strong>Error #{this.state.errorCount}</strong>
                  {this.state.lastErrorTime && (
                    <span className="ml-2 text-xs opacity-70">
                      {new Date(this.state.lastErrorTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap overflow-auto mobile-text-xs">
                  {this.state.error?.message}
                  {'\n'}
                  {this.state.error?.stack}
                </pre>
              </div>
            </details>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {this.state.errorCount <= 1 && (
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1 automotive-button"
                  data-testid="button-try-again"
                  variant="default"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button 
                onClick={this.handleReload}
                className="flex-1 automotive-button"
                data-testid="button-reload-app"
                variant={this.state.errorCount > 1 ? "default" : "outline"}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload App
              </Button>
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 automotive-button"
                data-testid="button-go-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
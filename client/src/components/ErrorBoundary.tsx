import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('TruckNav Pro Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-16 h-16 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Application Error</h1>
            <p className="text-muted-foreground">
              TruckNav Pro encountered an unexpected error. Please try reloading the page.
            </p>
            <details className="text-left text-sm text-muted-foreground bg-muted p-3 rounded">
              <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
              <pre className="whitespace-pre-wrap overflow-auto text-xs">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1 automotive-button"
                data-testid="button-reload-app"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Application
              </Button>
              <Button 
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="flex-1 automotive-button"
                data-testid="button-try-again"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
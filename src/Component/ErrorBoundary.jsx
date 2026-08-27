import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-error mb-6 block">
              error
            </span>
            <h1 className="font-display-lg text-headline-md text-on-surface mb-4">
              Something went wrong
            </h1>
            <p className="font-body-md text-on-surface-variant mb-8">
              An unexpected error occurred. Please try again or return to the
              home page.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-8 py-3 bg-primary-container text-on-primary-container rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-8 py-3 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

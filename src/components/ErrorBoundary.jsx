import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🛑 ViewReports crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 p-4 text-red-700">
          ⚠️ Something went wrong in ViewReports: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

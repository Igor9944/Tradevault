import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
  errorStack: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      errorMsg: "",
      errorStack: ""
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message, errorStack: error.stack || "" };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const props = (this as any).props;
    const state = (this as any).state;
    if (state.hasError) {
      if (props.fallback) {
        return props.fallback;
      }
      return (
        <div style={{ padding: 20, backgroundColor: '#5c0000', color: 'white', minHeight: '100vh', zIndex: 99999, position: 'relative' }}>
          <h2>Something went wrong in the React Tree!</h2>
          <p>{state.errorMsg}</p>
          <pre style={{ fontSize: '10px', marginTop: '10px', whiteSpace: 'pre-wrap' }}>{state.errorStack}</pre>
        </div>
      );
    }

    return props.children;
  }
}

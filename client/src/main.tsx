import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App Error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { style: { padding: 20 } },
        React.createElement("h2", null, "TruckNav4Pros"),
        React.createElement("p", null, "Something went wrong. Please restart the app."),
        React.createElement("pre", { style: { fontSize: 12, color: "red", whiteSpace: "pre-wrap" } },
          this.state.error?.message
        ),
        React.createElement("button", {
          onClick: () => window.location.reload(),
          style: { padding: "10px 20px", marginTop: 10, fontSize: 16 }
        }, "Restart")
      );
    }
    return this.props.children;
  }
}

const App = React.lazy(() => import("./pages/navigation"));

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <React.Suspense fallback={<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",fontSize:18}}>Loading TruckNav4Pros...</div>}>
          <App />
        </React.Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

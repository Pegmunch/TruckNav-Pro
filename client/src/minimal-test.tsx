import { createRoot } from "react-dom/client";

function MinimalApp() {
  return <div style={{color: 'red', fontSize: '24px'}}>MINIMAL TEST - IF YOU SEE THIS, REACT IS WORKING</div>;
}

// Test if React can mount at all
const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("Root element found, attempting to mount minimal test...");
  createRoot(rootElement).render(<MinimalApp />);
} else {
  console.error("Root element not found!");
}
import { execSync } from 'child_process';

const PORT = process.env.PORT || '5000';

function killPort(port: string) {
  console.log(`Checking for processes on port ${port}...`);
  
  try {
    // Try to find and kill processes using the port
    // This works on Unix-like systems (including Replit)
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    console.log(`Cleared port ${port}`);
  } catch (error) {
    // Port might already be free
    console.log(`Port ${port} is already free or cannot be cleared`);
  }
}

// Kill the port before starting the server
killPort(PORT);
console.log(`Port ${PORT} is ready for use`);
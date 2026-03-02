import { execSync } from 'child_process';

const PORT = process.env.PORT || '5000';

function killPort(port: string) {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.log(`Invalid port value, skipping kill-port step.`);
    return;
  }

  console.log(`Checking for processes on port ${portNum}...`);

  try {
    // Try to find and kill processes using the port
    // This works on Unix-like systems (including Replit)
    execSync(`fuser -k ${portNum}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    console.log(`Cleared port ${portNum}`);
  } catch (error) {
    // Port might already be free
    console.log(`Port ${portNum} is already free or cannot be cleared`);
  }
}

// Kill the port before starting the server
killPort(PORT);
console.log(`Port ${PORT} is ready for use`);
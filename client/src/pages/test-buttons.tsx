import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Play } from 'lucide-react';

interface TestResult {
  name: string;
  testId: string;
  exists: boolean;
  clicked: boolean;
  handlerFired: boolean;
  timestamp?: number;
}

export default function TestButtons() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const buttonTests = [
    { name: 'Zoom In', testId: 'button-zoom-in' },
    { name: 'Zoom Out', testId: 'button-zoom-out' },
    { name: 'Recenter', testId: 'button-recenter' },
    { name: 'Toggle Map View', testId: 'button-toggle-view' },
    { name: 'View Incidents', testId: 'button-view-incidents' },
    { name: 'Traffic Report', testId: 'button-traffic-report' },
    { name: 'Mute Alerts', testId: 'button-mute-alerts' },
    { name: 'Menu', testId: 'button-menu' },
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const checkButtonExists = (testId: string): boolean => {
    return document.querySelector(`[data-testid="${testId}"]`) !== null;
  };

  const simulateClick = async (testId: string, name: string) => {
    const button = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
    
    if (!button) {
      addLog(`❌ ${name}: Button not found in DOM`);
      setResults(prev => prev.map(r => 
        r.testId === testId ? { ...r, clicked: false, handlerFired: false } : r
      ));
      return;
    }

    addLog(`🔵 ${name}: Simulating click...`);

    // Create and dispatch touch events (for mobile simulation)
    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [new Touch({ identifier: 1, target: button, clientX: 0, clientY: 0 })]
    });
    
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: []
    });

    // Create pointer event
    const pointerDown = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch'
    });

    // Create click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    try {
      // Dispatch events in sequence
      button.dispatchEvent(touchStart);
      await new Promise(r => setTimeout(r, 50));
      button.dispatchEvent(touchEnd);
      await new Promise(r => setTimeout(r, 50));
      button.dispatchEvent(pointerDown);
      await new Promise(r => setTimeout(r, 50));
      button.dispatchEvent(clickEvent);

      addLog(`✅ ${name}: Events dispatched successfully`);
      setResults(prev => prev.map(r => 
        r.testId === testId ? { ...r, clicked: true, handlerFired: true, timestamp: Date.now() } : r
      ));
    } catch (error) {
      addLog(`❌ ${name}: Error dispatching events: ${error}`);
      setResults(prev => prev.map(r => 
        r.testId === testId ? { ...r, clicked: true, handlerFired: false } : r
      ));
    }
  };

  const runAllTests = async () => {
    addLog('🚀 Starting all button tests...');
    
    // First check existence
    const initialResults = buttonTests.map(test => ({
      name: test.name,
      testId: test.testId,
      exists: checkButtonExists(test.testId),
      clicked: false,
      handlerFired: false
    }));
    setResults(initialResults);

    // Log existence results
    initialResults.forEach(r => {
      addLog(`${r.exists ? '✅' : '❌'} ${r.name}: ${r.exists ? 'Found in DOM' : 'NOT FOUND'}`);
    });

    // Wait a bit then simulate clicks on existing buttons
    await new Promise(r => setTimeout(r, 500));
    
    for (const test of buttonTests) {
      if (checkButtonExists(test.testId)) {
        await simulateClick(test.testId, test.name);
        await new Promise(r => setTimeout(r, 300));
      }
    }

    addLog('✅ All tests completed');
  };

  const testSingleButton = async (testId: string, name: string) => {
    const exists = checkButtonExists(testId);
    setResults(prev => {
      const existing = prev.find(r => r.testId === testId);
      if (existing) {
        return prev.map(r => r.testId === testId ? { ...r, exists } : r);
      }
      return [...prev, { name, testId, exists, clicked: false, handlerFired: false }];
    });

    if (exists) {
      await simulateClick(testId, name);
    } else {
      addLog(`❌ ${name}: Button not found - cannot test`);
    }
  };

  useEffect(() => {
    // Initial check on mount
    const initialResults = buttonTests.map(test => ({
      name: test.name,
      testId: test.testId,
      exists: checkButtonExists(test.testId),
      clicked: false,
      handlerFired: false
    }));
    setResults(initialResults);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Navigation Button Test Suite</span>
              <Button onClick={runAllTests} className="gap-2">
                <Play className="h-4 w-4" />
                Run All Tests
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This page tests all navigation buttons. Open the main app in another tab, 
              then run tests here. Buttons must be visible in the DOM to be tested.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {buttonTests.map(test => {
                const result = results.find(r => r.testId === test.testId);
                return (
                  <div 
                    key={test.testId}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      {result?.exists ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{test.name}</div>
                        <div className="text-xs text-gray-500">{test.testId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result?.handlerFired && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Handler OK
                        </span>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testSingleButton(test.testId, test.name)}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Logs</span>
              <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Run tests to see results.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="py-0.5">{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Console Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              Run these in the main app's browser console to test buttons directly:
            </p>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// Test zoom buttons
document.querySelector('[data-testid="button-zoom-in"]')?.click();
document.querySelector('[data-testid="button-zoom-out"]')?.click();

// Test incidents
document.querySelector('[data-testid="button-view-incidents"]')?.click();

// Test traffic report
document.querySelector('[data-testid="button-traffic-report"]')?.click();

// Test mute
document.querySelector('[data-testid="button-mute-alerts"]')?.click();`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

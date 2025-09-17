import { useState, useEffect, useRef } from "react";
import { useTheme } from "./theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// WCAG contrast utilities - extracted from theme-provider for testing
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (l1: number, l2: number): number => {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h = h % 360;
  s = Math.max(0, Math.min(1, s / 100));
  l = Math.max(0, Math.min(1, l / 100));
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

const getCSSVariableValue = (variable: string): string => {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

interface ContrastTest {
  id: string;
  name: string;
  bgColor: string;
  fgColor: string;
  expectedRatio: number;
  actualRatio: number;
  passes: boolean;
  requirement: "AA" | "AAA";
  isLargeText?: boolean;
}

interface AccessibilityTestProps {
  className?: string;
}

export function AccessibilityTest({ className }: AccessibilityTestProps) {
  const { currentTheme, effectiveTheme, grayL } = useTheme();
  const [tests, setTests] = useState<ContrastTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const testIntervalRef = useRef<number | null>(null);

  // Test various grayscale values
  const testGrayscaleValues = [0, 10, 25, 40, 50, 60, 75, 90, 100];

  const calculateContrastForColors = (bg: string, fg: string): number => {
    // Handle HSL colors
    const parseHSL = (hslString: string) => {
      const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (match) {
        const [, h, s, l] = match.map(Number);
        return hslToRgb(h, s, l);
      }
      return null;
    };

    // Handle RGB colors
    const parseRGB = (rgbString: string) => {
      const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        return { r, g, b };
      }
      return null;
    };

    let bgRgb = parseHSL(bg) || parseRGB(bg) || hexToRgb(bg);
    let fgRgb = parseHSL(fg) || parseRGB(fg) || hexToRgb(fg);

    if (!bgRgb || !fgRgb) {
      return 0;
    }

    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const fgLuminance = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);

    return getContrastRatio(bgLuminance, fgLuminance);
  };

  const runContrastTests = () => {
    setIsRunning(true);
    setTestProgress(0);
    
    const newTests: ContrastTest[] = [];
    let testIndex = 0;
    const totalTests = testGrayscaleValues.length * 2; // For both themes

    const runSingleTest = () => {
      if (testIndex >= totalTests) {
        setTests(newTests);
        setIsRunning(false);
        setTestProgress(100);
        if (testIntervalRef.current) {
          clearInterval(testIntervalRef.current);
        }
        return;
      }

      const grayValueIndex = Math.floor(testIndex / 2);
      const isDarkTheme = testIndex % 2 === 1;
      const grayValue = testGrayscaleValues[grayValueIndex];

      // Simulate applying grayscale value
      const backgroundL = grayValue;
      const isDark = isDarkTheme;
      
      // Calculate contrast-safe foreground
      const bgLuminance = getLuminance(backgroundL * 2.55, backgroundL * 2.55, backgroundL * 2.55);
      const whiteLuminance = getLuminance(255, 255, 255);
      const blackLuminance = getLuminance(0, 0, 0);
      
      const contrastWithWhite = getContrastRatio(bgLuminance, whiteLuminance);
      const contrastWithBlack = getContrastRatio(bgLuminance, blackLuminance);
      
      const requiredContrast = 4.5;
      let foregroundColor = "";
      let actualRatio = 0;
      
      if (contrastWithWhite >= requiredContrast && contrastWithBlack >= requiredContrast) {
        foregroundColor = isDark ? 'hsl(0, 0%, 85%)' : 'hsl(220, 90%, 8%)';
        actualRatio = isDark ? contrastWithWhite : contrastWithBlack;
      } else if (contrastWithWhite >= requiredContrast) {
        foregroundColor = 'hsl(0, 0%, 100%)';
        actualRatio = contrastWithWhite;
      } else if (contrastWithBlack >= requiredContrast) {
        foregroundColor = 'hsl(0, 0%, 0%)';
        actualRatio = contrastWithBlack;
      } else {
        foregroundColor = isDark ? 'hsl(0, 0%, 85%)' : 'hsl(220, 90%, 8%)';
        actualRatio = isDark ? contrastWithWhite : contrastWithBlack;
      }

      newTests.push({
        id: `test-${grayValue}-${isDark ? 'dark' : 'light'}`,
        name: `${grayValue}% Gray (${isDark ? 'Dark' : 'Light'} Theme)`,
        bgColor: `hsl(0, 0%, ${backgroundL}%)`,
        fgColor: foregroundColor,
        expectedRatio: requiredContrast,
        actualRatio: parseFloat(actualRatio.toFixed(2)),
        passes: actualRatio >= requiredContrast,
        requirement: "AA"
      });

      testIndex++;
      setTestProgress((testIndex / totalTests) * 100);
    };

    // Run tests with slight delay to show progress
    testIntervalRef.current = window.setInterval(runSingleTest, 100);
  };

  useEffect(() => {
    return () => {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
      }
    };
  }, []);

  const passedTests = tests.filter(test => test.passes);
  const failedTests = tests.filter(test => !test.passes);

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            WCAG Contrast Ratio Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Current Theme: <Badge variant="outline">{currentTheme}</Badge>
                {currentTheme === "auto" && (
                  <span className="ml-2">
                    (Currently: <Badge variant={effectiveTheme === "night" ? "destructive" : "default"}>
                      {effectiveTheme}
                    </Badge>)
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Grayscale Override: <Badge variant={grayL ? "secondary" : "outline"}>
                  {grayL ? `${grayL}%` : "Default"}
                </Badge>
              </p>
            </div>
            <Button 
              onClick={runContrastTests} 
              disabled={isRunning}
              data-testid="run-contrast-tests"
            >
              {isRunning ? "Running Tests..." : "Run Contrast Tests"}
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={testProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Testing contrast ratios... {Math.round(testProgress)}%
              </p>
            </div>
          )}

          {tests.length > 0 && (
            <div className="space-y-4">
              <Separator />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {passedTests.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {failedTests.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {tests.length > 0 ? Math.round((passedTests.length / tests.length) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {tests.length > 0 && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="passed">Passed Tests</TabsTrigger>
            <TabsTrigger value="failed">Failed Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            <div className="grid gap-4">
              {tests.map((test) => (
                <Card key={test.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {test.passes ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <h4 className="font-medium">{test.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Contrast: {test.actualRatio}:1 (Required: {test.expectedRatio}:1)
                          </p>
                        </div>
                      </div>
                      <div 
                        className="w-20 h-12 rounded border border-border flex items-center justify-center text-xs font-mono"
                        style={{ 
                          backgroundColor: test.bgColor,
                          color: test.fgColor
                        }}
                        data-testid={`contrast-preview-${test.id}`}
                      >
                        Sample
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="passed" className="space-y-4">
            {passedTests.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No tests have passed yet. Run the contrast tests to see results.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {passedTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <span className="font-medium text-green-800 dark:text-green-200">{test.name}</span>
                    <Badge variant="outline" className="text-green-700 dark:text-green-300">
                      {test.actualRatio}:1
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            {failedTests.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All tests passed! Great job on maintaining accessibility standards.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {failedTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <span className="font-medium text-red-800 dark:text-red-200">{test.name}</span>
                    <Badge variant="destructive">
                      {test.actualRatio}:1 (Need {test.expectedRatio}:1)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default AccessibilityTest;
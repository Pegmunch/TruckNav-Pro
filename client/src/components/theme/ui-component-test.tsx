import { useState } from "react";
import { useTheme } from "./theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation, Settings, MapPin, Truck, Shield, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface UIComponentTestProps {
  className?: string;
}

// Component to test various UI elements with current theme
export function UIComponentTest({ className }: UIComponentTestProps) {
  const { currentTheme, effectiveTheme, grayL } = useTheme();
  const [inputValue, setInputValue] = useState("Test input text");
  const [isChecked, setIsChecked] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [selectValue, setSelectValue] = useState("option1");

  const testComponents = [
    {
      name: "Primary Button",
      component: (
        <Button data-testid="test-primary-button">
          Primary Action
        </Button>
      )
    },
    {
      name: "Secondary Button",
      component: (
        <Button variant="secondary" data-testid="test-secondary-button">
          Secondary Action
        </Button>
      )
    },
    {
      name: "Outline Button",
      component: (
        <Button variant="outline" data-testid="test-outline-button">
          Outline Action
        </Button>
      )
    },
    {
      name: "Destructive Button",
      component: (
        <Button variant="destructive" data-testid="test-destructive-button">
          Destructive Action
        </Button>
      )
    },
    {
      name: "Text Input",
      component: (
        <Input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter text here..."
          data-testid="test-input"
        />
      )
    },
    {
      name: "Select Dropdown",
      component: (
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger data-testid="test-select">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      name: "Badges",
      component: (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default" data-testid="test-badge-default">Default</Badge>
          <Badge variant="secondary" data-testid="test-badge-secondary">Secondary</Badge>
          <Badge variant="outline" data-testid="test-badge-outline">Outline</Badge>
          <Badge variant="destructive" data-testid="test-badge-destructive">Destructive</Badge>
        </div>
      )
    },
    {
      name: "Alerts",
      component: (
        <div className="space-y-3">
          <Alert data-testid="test-alert-default">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is a default alert message for testing contrast.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive" data-testid="test-alert-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a destructive alert message for testing contrast.
            </AlertDescription>
          </Alert>
        </div>
      )
    },
    {
      name: "Form Controls",
      component: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="test-checkbox" 
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              data-testid="test-checkbox"
            />
            <label htmlFor="test-checkbox" className="text-sm font-medium">
              Checkbox option
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="test-switch"
              checked={isToggled}
              onCheckedChange={setIsToggled}
              data-testid="test-switch"
            />
            <label htmlFor="test-switch" className="text-sm font-medium">
              Switch option
            </label>
          </div>
        </div>
      )
    },
    {
      name: "Navigation Elements",
      component: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors">
            <Navigation className="w-4 h-4" />
            <span className="text-sm">Navigation Item</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Location Item</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors">
            <Truck className="w-4 h-4" />
            <span className="text-sm">Vehicle Item</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            UI Component Readability Test
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <p>Current Theme: <Badge variant="outline">{currentTheme}</Badge></p>
            <p>Effective Theme: <Badge variant={effectiveTheme === "night" ? "destructive" : "default"}>{effectiveTheme}</Badge></p>
            <p>Grayscale Override: <Badge variant={grayL ? "secondary" : "outline"}>{grayL ? `${grayL}%` : "None"}</Badge></p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Test the readability and contrast of various UI components with the current theme and grayscale settings.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            {testComponents.map((test, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{test.name}</h4>
                  <Badge variant="outline" className="text-xs">Test {index + 1}</Badge>
                </div>
                <div className="p-4 border border-border rounded-md bg-card">
                  {test.component}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />
          
          {/* Tabs test for complex components */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Complex Components</h4>
            <Tabs defaultValue="tab1" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tab1" data-testid="test-tab-1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2" data-testid="test-tab-2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3" data-testid="test-tab-3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">Tab 1 content with regular text for contrast testing.</p>
                    <p className="text-xs text-muted-foreground mt-2">Muted text for secondary information.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="tab2" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">Tab 2 content with different text styles.</p>
                    <p className="text-xs text-muted-foreground mt-2">Additional muted information.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="tab3" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">Tab 3 content for thorough testing.</p>
                    <p className="text-xs text-muted-foreground mt-2">Tertiary information display.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <Separator className="my-6" />

          {/* Typography testing */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Typography Test</h4>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Heading 1 (3xl)</h1>
              <h2 className="text-2xl font-semibold">Heading 2 (2xl)</h2>
              <h3 className="text-xl font-medium">Heading 3 (xl)</h3>
              <h4 className="text-lg font-medium">Heading 4 (lg)</h4>
              <p className="text-base">Regular paragraph text (base)</p>
              <p className="text-sm">Small text (sm)</p>
              <p className="text-xs">Extra small text (xs)</p>
              <p className="text-xs text-muted-foreground">Muted extra small text</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UIComponentTest;
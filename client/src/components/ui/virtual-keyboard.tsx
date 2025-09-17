import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Delete, 
  Space, 
  ArrowLeft, 
  ArrowRight, 
  Search,
  MapPin,
  Navigation,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  isVisible: boolean;
  onToggleKeyboard?: () => void;
  // Automotive customization
  keyboardLayout?: 'qwerty' | 'alphabetical';
  showSuggestions?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  // Size and styling
  compact?: boolean;
  className?: string;
  testId?: string;
}

const VirtualKeyboard = memo(function VirtualKeyboard({
  value,
  onChange,
  onEnter,
  onSearch,
  placeholder = "Enter location...",
  isVisible,
  onToggleKeyboard,
  keyboardLayout = 'qwerty',
  showSuggestions = true,
  suggestions = [],
  onSuggestionClick,
  compact = false,
  className,
  testId = "virtual-keyboard"
}: VirtualKeyboardProps) {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showNumbers, setShowNumbers] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // Automotive-optimized keyboard layouts
  const qwertyRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const alphabeticalRows = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  ];

  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const symbolsRow = ['-', '@', '.', ',', '\'', '"', '(', ')', '/', ' '];

  const keyboardRows = keyboardLayout === 'qwerty' ? qwertyRows : alphabeticalRows;

  // Update cursor position when value changes externally
  useEffect(() => {
    setCursorPosition(value.length);
  }, [value]);

  const insertAtCursor = useCallback((char: string) => {
    const newValue = value.slice(0, cursorPosition) + char + value.slice(cursorPosition);
    onChange(newValue);
    setCursorPosition(cursorPosition + char.length);
  }, [value, cursorPosition, onChange]);

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'BACKSPACE') {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition - 1);
      }
    } else if (key === 'SPACE') {
      insertAtCursor(' ');
    } else if (key === 'ENTER') {
      if (onEnter) {
        onEnter();
      } else if (onSearch) {
        onSearch(value);
      }
    } else if (key === 'CAPS') {
      setCapsLock(!capsLock);
    } else {
      const finalKey = capsLock ? key.toUpperCase() : key.toLowerCase();
      insertAtCursor(finalKey);
    }
  }, [value, cursorPosition, onChange, onEnter, onSearch, capsLock, insertAtCursor]);

  const moveCursor = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left' && cursorPosition > 0) {
      setCursorPosition(cursorPosition - 1);
    } else if (direction === 'right' && cursorPosition < value.length) {
      setCursorPosition(cursorPosition + 1);
    }
  }, [cursorPosition, value.length]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onChange(suggestion);
    setCursorPosition(suggestion.length);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  }, [onChange, onSuggestionClick]);

  if (!isVisible) {
    return null;
  }

  const keySize = compact ? "automotive-touch-target min-w-8 h-8 text-sm" : "automotive-touch-target min-w-12 h-12 text-base";
  const keySpacing = compact ? "gap-1" : "gap-2";

  return (
    <Card className={cn("w-full border-2 shadow-lg automotive-card", className)} data-testid={testId}>
      <CardContent className="p-4">
        {/* Input Display */}
        <div className="mb-4">
          <div className="automotive-input w-full min-h-12 p-3 bg-background border-2 border-input rounded-md flex items-center gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 font-mono text-base">
              {value || (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <span className="animate-pulse">|</span>
            </div>
            {onSearch && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onSearch(value)}
                className="automotive-touch-target"
                data-testid="button-search"
              >
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 6).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="automotive-button text-xs max-w-32 truncate"
                  data-testid={`button-suggestion-${index}`}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Number Row */}
        <div className={cn("flex justify-center mb-2", keySpacing)}>
          {numberRow.map((num) => (
            <Button
              key={num}
              variant="outline"
              size="icon"
              onClick={() => handleKeyPress(num)}
              className={keySize}
              data-testid={`key-${num}`}
            >
              {num}
            </Button>
          ))}
        </div>

        {/* Letter Rows */}
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className={cn("flex justify-center mb-2", keySpacing)}>
            {row.map((letter) => (
              <Button
                key={letter}
                variant="outline"
                size="icon"
                onClick={() => handleKeyPress(letter)}
                className={cn(keySize, capsLock && "bg-primary text-primary-foreground")}
                data-testid={`key-${letter.toLowerCase()}`}
              >
                {capsLock ? letter : letter.toLowerCase()}
              </Button>
            ))}
          </div>
        ))}

        {/* Symbols Row */}
        {!compact && (
          <div className={cn("flex justify-center mb-2", keySpacing)}>
            {symbolsRow.slice(0, 8).map((symbol, index) => (
              <Button
                key={index}
                variant="outline"
                size="icon"
                onClick={() => symbol === ' ' ? handleKeyPress('SPACE') : handleKeyPress(symbol)}
                className={keySize}
                data-testid={`key-symbol-${index}`}
              >
                {symbol === ' ' ? <Space className="w-4 h-4" /> : symbol}
              </Button>
            ))}
          </div>
        )}

        {/* Function Keys Row */}
        <div className={cn("flex justify-center items-center", keySpacing)}>
          {/* Caps Lock */}
          <Button
            variant={capsLock ? "default" : "outline"}
            size="icon"
            onClick={() => handleKeyPress('CAPS')}
            className={cn(keySize, "min-w-16")}
            data-testid="key-caps"
          >
            Caps
          </Button>

          {/* Cursor Controls */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveCursor('left')}
            className={keySize}
            data-testid="key-cursor-left"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => moveCursor('right')}
            className={keySize}
            data-testid="key-cursor-right"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Space Bar */}
          <Button
            variant="outline"
            onClick={() => handleKeyPress('SPACE')}
            className={cn(keySize, "min-w-24 flex items-center gap-2")}
            data-testid="key-space"
          >
            <Space className="w-4 h-4" />
            Space
          </Button>

          {/* Backspace */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleKeyPress('BACKSPACE')}
            className={cn(keySize, "min-w-16")}
            data-testid="key-backspace"
          >
            <Delete className="w-4 h-4" />
          </Button>

          {/* Enter/Search */}
          <Button
            variant="default"
            onClick={() => handleKeyPress('ENTER')}
            className={cn(keySize, "min-w-16 bg-primary text-primary-foreground")}
            data-testid="key-enter"
          >
            {onSearch ? <Search className="w-4 h-4" /> : "Enter"}
          </Button>
        </div>

        {/* Toggle Keyboard Button */}
        {onToggleKeyboard && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleKeyboard}
              className="automotive-button"
              data-testid="button-toggle-keyboard"
            >
              <MoreHorizontal className="w-4 h-4 mr-2" />
              Hide Keyboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default VirtualKeyboard;
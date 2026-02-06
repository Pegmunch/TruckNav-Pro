/**
 * Flag Icon Component for TruckNav Pro
 * Patent-protected by Bespoke Marketing. Ai Ltd
 * Displays country flags with fallback support
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Country } from '@/data/countries';

interface FlagIconProps {
  country: Country;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  variant?: 'emoji' | 'svg'; // Future support for SVG flags
}

const sizeClasses = {
  xs: 'text-xs w-3 h-3',
  sm: 'text-sm w-4 h-4',
  md: 'text-base w-5 h-5',
  lg: 'text-lg w-6 h-6',
  xl: 'text-xl w-8 h-8'
};

/**
 * Optimized flag icon component with emoji fallback
 * Supports future SVG flag integration
 */
const FlagIcon = memo(function FlagIcon({ 
  country, 
  size = 'md', 
  className = '', 
  showTooltip = false, 
  variant = 'emoji' 
}: FlagIconProps) {
  
  // For now, use Unicode emoji flags (fast and reliable)
  // TODO: Add SVG flag support when high-quality flag assets are available
  const renderEmojiFlag = () => (
    <span 
      className={cn(
        'inline-flex items-center justify-center font-emoji select-none',
        sizeClasses[size],
        className
      )}
      title={showTooltip ? `${country.name} (${country.code})` : undefined}
      data-testid={`flag-${country.code.toLowerCase()}`}
      role="img"
      aria-label={`Flag of ${country.name}`}
    >
      {country.flag}
    </span>
  );

  // Future SVG flag rendering (placeholder)
  const renderSvgFlag = () => {
    // TODO: Implement SVG flag loading when assets are available
    // This would load from client/src/assets/flags/{country.code.toLowerCase()}.svg
    return renderEmojiFlag(); // Fallback to emoji for now
  };

  return variant === 'svg' ? renderSvgFlag() : renderEmojiFlag();
});

export default FlagIcon;

/**
 * Specialized flag icon for dropdown menus
 * Optimized for consistent sizing in select components
 */
export const DropdownFlagIcon = memo(function DropdownFlagIcon({ 
  country, 
  className = '' 
}: { 
  country: Country; 
  className?: string; 
}) {
  return (
    <FlagIcon
      country={country}
      size="sm"
      className={cn('flex-shrink-0 flag-enhanced', className)}
      showTooltip={false}
    />
  );
});

/**
 * Large flag icon for featured displays
 * Used in welcome screens or country selection pages
 */
export const LargeFlagIcon = memo(function LargeFlagIcon({ 
  country, 
  className = '' 
}: { 
  country: Country; 
  className?: string; 
}) {
  return (
    <FlagIcon
      country={country}
      size="xl"
      className={cn('shadow-sm', className)}
      showTooltip={true}
    />
  );
});

/**
 * Flag badge component for compact displays
 * Includes country code for identification
 */
export const FlagBadge = memo(function FlagBadge({ 
  country, 
  showCode = true, 
  className = '' 
}: { 
  country: Country; 
  showCode?: boolean; 
  className?: string; 
}) {
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 dark:bg-muted/30',
        className
      )}
      data-testid={`flag-badge-${country.code.toLowerCase()}`}
    >
      <FlagIcon country={country} size="sm" />
      {showCode && (
        <span className="text-xs font-medium text-muted-foreground">
          {country.code}
        </span>
      )}
    </div>
  );
});

// CSS for emoji font support (to be added to global CSS)
export const flagIconStyles = `
.font-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
  font-feature-settings: "liga" off;
  font-variant-ligatures: none;
}
`;
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Truck, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DesktopHeader() {
  const [location] = useLocation();

  return (
    <header className="hidden lg:block fixed top-0 left-0 right-0 bg-background border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">TruckNav Pro</h1>
          </div>

          <nav className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant={location === '/' || location === '/navigation' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
                data-testid="link-navigation"
              >
                <Truck className="w-4 h-4" />
                Navigation
              </Button>
            </Link>

            <Link href="/fleet-management">
              <Button
                variant={location === '/fleet-management' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
                data-testid="link-fleet-management"
              >
                <Building2 className="w-4 h-4" />
                Fleet Management
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

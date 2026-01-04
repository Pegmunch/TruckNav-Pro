import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Truck, Building2 } from "lucide-react";
import type { UserSubscription } from "@shared/schema";

interface SubscriptionStatusResponse {
  hasActiveSubscription: boolean;
  subscription?: UserSubscription;
}

interface SubscriptionGateProps {
  children: React.ReactNode;
  requiredTier?: "navigation" | "fleet" | "any";
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function SubscriptionGate({
  children,
  requiredTier = "any",
  fallback,
  showUpgradePrompt = true,
}: SubscriptionGateProps) {
  const { data: status, isLoading } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/subscription/status"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="subscription-gate-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAccess = checkSubscriptionAccess(status, requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return <SubscriptionPaywall requiredTier={requiredTier} />;
}

function checkSubscriptionAccess(
  status: SubscriptionStatusResponse | undefined,
  requiredTier: "navigation" | "fleet" | "any"
): boolean {
  if (!status?.hasActiveSubscription) {
    return false;
  }

  const subscription = status.subscription;
  if (!subscription) {
    return false;
  }

  if (requiredTier === "any") {
    return true;
  }

  const category = subscription.category || "navigation";
  
  if (requiredTier === "navigation") {
    return ["navigation", "fleet_management"].includes(category);
  }

  if (requiredTier === "fleet") {
    return category === "fleet_management";
  }

  return false;
}

interface SubscriptionPaywallProps {
  requiredTier: "navigation" | "fleet" | "any";
}

function SubscriptionPaywall({ requiredTier }: SubscriptionPaywallProps) {
  const isFleetTier = requiredTier === "fleet";

  return (
    <div className="flex items-center justify-center p-6" data-testid="subscription-paywall">
      <Card className="max-w-md w-full border-2 border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {isFleetTier ? (
              <Building2 className="w-8 h-8 text-primary" />
            ) : (
              <Lock className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isFleetTier ? "Fleet Management Access Required" : "Premium Feature"}
          </CardTitle>
          <CardDescription className="text-base">
            {isFleetTier
              ? "This feature requires a Fleet Management subscription to access all enterprise tools."
              : "Subscribe to TruckNav Pro to unlock this feature and get the most out of your navigation experience."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {isFleetTier ? "Fleet tier includes:" : "With your subscription, you get:"}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {isFleetTier ? (
                <>
                  <li className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    Vehicle Registry & Tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Operator Management
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Service Records & Compliance
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Cost Analytics & Reporting
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    GPS Tracking & Geofencing
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Truck-safe route planning
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Height & weight restrictions
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    3D navigation with turn-by-turn
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Offline maps & voice guidance
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/pricing">
              <Button className="w-full" size="lg" data-testid="button-upgrade-subscription">
                {isFleetTier ? "Upgrade to Fleet" : "View Plans & Subscribe"}
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. Email reminders before renewal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useSubscriptionStatus() {
  const { data, isLoading, error } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/subscription/status"],
  });

  return {
    hasActiveSubscription: data?.hasActiveSubscription ?? false,
    subscription: data?.subscription,
    category: data?.subscription?.category || null,
    isFleetTier: data?.subscription?.category === "fleet_management",
    isNavigationTier: ["navigation", "fleet_management"].includes(data?.subscription?.category || ""),
    isLoading,
    error,
  };
}

export function RequireSubscription({
  children,
  tier = "any",
}: {
  children: React.ReactNode;
  tier?: "navigation" | "fleet" | "any";
}) {
  return (
    <SubscriptionGate requiredTier={tier}>
      {children}
    </SubscriptionGate>
  );
}

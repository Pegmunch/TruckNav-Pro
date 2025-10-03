import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useLocation } from "wouter";
import type { SubscriptionPlan, UserSubscription } from "@shared/schema";

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; subscription?: UserSubscription }>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/api/login';
      return;
    }
    setLocation(`/subscribe/${planId}`);
  };

  const isCurrentPlan = (planId: string) => {
    return subscriptionStatus?.subscription?.planId === planId;
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Get access to premium truck navigation features with TruckNav Pro
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {plans?.map((plan) => {
            const isBestValue = plan.name === "12 Months";
            const isCurrentUserPlan = isCurrentPlan(plan.id);
            const features = plan.features as string[] || [];
            
            return (
              <Card
                key={plan.id}
                data-testid={`card-plan-${plan.id}`}
                className={`relative flex flex-col ${
                  isBestValue
                    ? "border-primary shadow-xl scale-105 lg:scale-110"
                    : "border-border"
                }`}
              >
                {/* Best Value Badge */}
                {isBestValue && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
                      Best Value
                    </Badge>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentUserPlan && (
                  <div className="absolute -top-4 right-4">
                    <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-6">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.isLifetime ? "One-time payment" : `${plan.durationMonths} month${plan.durationMonths !== 1 ? 's' : ''} access`}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-extrabold text-foreground">
                      £{parseFloat(plan.priceGBP).toFixed(2)}
                    </span>
                    {!plan.isLifetime && (
                      <span className="text-muted-foreground ml-2">
                        /£{(parseFloat(plan.priceGBP) / (plan.durationMonths || 1)).toFixed(2)} per month
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mr-3 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button
                    data-testid={`button-subscribe-${plan.id}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentUserPlan}
                    className="w-full"
                    variant={isBestValue ? "default" : "outline"}
                    size="lg"
                  >
                    {isCurrentUserPlan ? "Current Plan" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include full access to TruckNav Pro features. Cancel anytime.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Secure payment processing by Stripe. Your payment information is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

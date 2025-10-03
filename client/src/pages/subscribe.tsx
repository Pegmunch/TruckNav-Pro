import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@shared/schema";

interface SubscriptionCreateResponse {
  subscriptionId: string;
  clientSecret: string;
  status: string;
}

function CheckoutForm({ plan, clientSecret }: { plan: SubscriptionPlan; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        toast({
          title: "Payment Failed",
          description: error.message || 'An error occurred during payment processing.',
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Activated!",
          description: `You now have access to ${plan.name}.`,
        });
        setLocation('/');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      toast({
        title: "Payment Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const features = plan.features as string[] || [];

  return (
    <form onSubmit={handleSubmit} data-testid="form-subscribe" className="space-y-6">
      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          <CardDescription>
            {plan.isLifetime ? "Lifetime access" : `${plan.durationMonths} month subscription`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold">£{parseFloat(plan.priceGBP).toFixed(2)}</span>
            {!plan.isLifetime && (
              <span className="text-muted-foreground">
                / £{(parseFloat(plan.priceGBP) / (plan.durationMonths || 1)).toFixed(2)} per month
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="font-semibold text-sm">Includes:</p>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter your payment information below</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation('/pricing')}
          className="flex-1"
          disabled={isProcessing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          data-testid="button-submit-payment"
          disabled={!stripe || isProcessing}
          className="flex-1"
          size="lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            `Pay £${parseFloat(plan.priceGBP).toFixed(2)}`
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your payment is secured by Stripe. We never store your payment details.
      </p>
    </form>
  );
}

export default function SubscribePage() {
  const { planId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: plan, isLoading: planLoading } = useQuery<SubscriptionPlan[], Error, SubscriptionPlan | undefined>({
    queryKey: ["/api/subscription/plans"],
    select: (plans) => plans.find(p => p.id === planId),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/subscription/create', { planId });
      const data: SubscriptionCreateResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
      setLocation('/pricing');
    },
  });

  useEffect(() => {
    if (planId && plan && !clientSecret && !createSubscriptionMutation.isPending) {
      createSubscriptionMutation.mutate(planId);
    }
  }, [planId, plan, clientSecret]);

  if (planLoading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plan details...</p>
        </div>
      </div>
    );
  }

  if (!planId) {
    setLocation('/pricing');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Complete Your Subscription
          </h1>
          <p className="mt-2 text-muted-foreground">
            You're just one step away from accessing premium features
          </p>
        </div>

        {createSubscriptionMutation.isPending && !clientSecret ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Setting up your subscription...</p>
              </div>
            </CardContent>
          </Card>
        ) : clientSecret && plan ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: 'hsl(var(--primary))',
                },
              },
            }}
          >
            <CheckoutForm plan={plan} clientSecret={clientSecret} />
          </Elements>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Unable to initialize payment. Please try again.
                </p>
                <Button onClick={() => setLocation('/pricing')}>
                  Back to Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

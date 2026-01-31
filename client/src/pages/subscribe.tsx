import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, AlertCircle, AlertTriangle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import type { SubscriptionPlan, User } from "@shared/schema";

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
  const { hasAcceptedTerms, setConsentAccepted } = useLegalConsent();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const onExpressCheckoutConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    
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
        setConsentAccepted();
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
        // Save consent on successful payment
        setConsentAccepted();
        
        // toast({
        //   title: "Subscription Activated!",
        //   description: `You now have access to ${plan.name}.`,
        // });
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

      {/* Express Checkout - Apple Pay, Google Pay, Link */}
      <Card>
        <CardHeader>
          <CardTitle>Express Checkout</CardTitle>
          <CardDescription>Pay quickly with Apple Pay, Google Pay, or Link</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpressCheckoutElement 
            onConfirm={onExpressCheckoutConfirm}
            options={{
              buttonType: {
                applePay: 'subscribe',
                googlePay: 'subscribe',
              },
            }}
          />
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or pay with card</span>
        </div>
      </div>

      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter your card information below</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      {/* Terms Acceptance Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms-acceptance"
                  data-testid="checkbox-terms-acceptance"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="terms-acceptance"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <a
                    href="/legal-popup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 font-medium"
                    data-testid="link-terms-of-service"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/legal-popup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 font-medium"
                    data-testid="link-privacy-policy"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              {!termsAccepted && (
                <p className="text-xs text-muted-foreground ml-6">
                  You must accept the terms before completing your payment
                </p>
              )}
            </div>
          </div>
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
          disabled={!stripe || isProcessing || !termsAccepted}
          className="flex-1"
          size="lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : !termsAccepted ? (
            "Accept Terms to Continue"
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
  const { hasAcceptedTerms, setConsentAccepted } = useLegalConsent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  const { data: plan, isLoading: planLoading } = useQuery<SubscriptionPlan[], Error, SubscriptionPlan | undefined>({
    queryKey: ["/api/subscription/plans"],
    select: (plans) => plans.find(p => p.id === planId),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/subscription/create', { planId, termsAccepted: hasAcceptedTerms });
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
    },
  });

  const initiateSubscription = useCallback(() => {
    if (planId && plan && user && !clientSecret && !createSubscriptionMutation.isPending) {
      createSubscriptionMutation.mutate(planId);
    }
  }, [planId, plan, user, clientSecret, createSubscriptionMutation]);

  useEffect(() => {
    if (hasAcceptedTerms && user) {
      initiateSubscription();
    }
  }, [hasAcceptedTerms, user, initiateSubscription]);

  if (!userLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Truck Nav Pro</CardTitle>
            <CardDescription>
              Sign In
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => window.location.href = '/api/login'} className="w-full" size="lg">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            <Button variant="outline" onClick={() => setLocation('/pricing')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userLoading || planLoading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!planId) {
    setLocation('/pricing');
    return null;
  }

  // If terms not yet accepted, show simplified terms acceptance with plan info
  if (!hasAcceptedTerms && !clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Accept Terms to Continue
            </h1>
            <p className="mt-2 text-muted-foreground">
              Please review and accept our terms before subscribing to {plan.name}
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                By subscribing to TruckNav Pro, you agree to our terms of service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="mb-2">By proceeding, you agree to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>TruckNav Pro Terms of Service</li>
                  <li>Privacy Policy and data handling practices</li>
                  <li>Navigation is advisory only - you remain responsible for safe driving</li>
                  <li>Route information may not reflect current road conditions</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={async () => {
                    await setConsentAccepted();
                    initiateSubscription();
                  }}
                  size="lg"
                  className="w-full"
                >
                  Accept Terms & Continue to Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/pricing')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Pricing
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground pt-2">
                <a href="/legal-popup" target="_blank" className="underline">Read full terms</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
                  {createSubscriptionMutation.error 
                    ? `Error: ${createSubscriptionMutation.error.message}` 
                    : "Unable to initialize payment. Please try again."}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => initiateSubscription()}
                    disabled={createSubscriptionMutation.isPending}
                  >
                    {createSubscriptionMutation.isPending ? "Retrying..." : "Try Again"}
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/pricing')}>
                    Back to Pricing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

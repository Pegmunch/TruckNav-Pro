import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Store, 
  Plus, 
  ExternalLink, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  Loader2
} from "lucide-react";

interface User {
  id: number;
  stripeConnectAccountId?: string;
  connectOnboardingStatus?: string;
}

interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pendingVerification: string[];
  };
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
}

interface ConnectProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  defaultPrice: {
    id: string;
    unitAmount: number;
    currency: string;
  } | null;
}

interface AccountLinkResponse {
  url: string;
}

interface BillingPortalResponse {
  url: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function ConnectDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
  });

  const typedUser = user as User | null;

  const { data: accountStatus, isLoading: statusLoading, error: statusError } = useQuery<AccountStatus>({
    queryKey: ['/api/connect/account-status'],
    enabled: !!typedUser?.stripeConnectAccountId,
  });

  const { data: products, isLoading: productsLoading } = useQuery<ConnectProduct[]>({
    queryKey: ['/api/connect/products', typedUser?.stripeConnectAccountId],
    enabled: !!typedUser?.stripeConnectAccountId && accountStatus?.onboardingComplete,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/connect/create-account');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connect/account-status'] });
    },
  });

  const createAccountLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/connect/create-account-link');
      return await response.json() as AccountLinkResponse;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: { name: string; description: string; priceInPence: number }) => {
      const response = await apiRequest('POST', '/api/connect/products', productData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connect/products', typedUser?.stripeConnectAccountId] });
      setProductForm({ name: "", description: "", price: "" });
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/connect/billing-portal');
      return await response.json() as BillingPortalResponse;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceInPounds = parseFloat(productForm.price);
    if (isNaN(priceInPounds) || priceInPounds <= 0) return;
    
    const priceInPence = Math.round(priceInPounds * 100);
    createProductMutation.mutate({
      name: productForm.name,
      description: productForm.description,
      priceInPence,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access the seller dashboard.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.location.href = '/api/login'}>
              Log In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const hasConnectAccount = !!typedUser?.stripeConnectAccountId;
  const onboardingComplete = accountStatus?.onboardingComplete ?? false;
  const readyToProcess = accountStatus?.readyToProcessPayments ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center justify-center gap-3">
            <Store className="h-8 w-8" />
            Seller Dashboard
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Manage your Stripe Connect account and products
          </p>
        </div>

        {/* Onboarding Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Setup
            </CardTitle>
            <CardDescription>
              {!hasConnectAccount 
                ? "Create your seller account to start accepting payments"
                : onboardingComplete 
                  ? "Your account is fully set up and ready to process payments"
                  : "Complete your account setup to start accepting payments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasConnectAccount ? (
              <Button 
                onClick={() => createAccountMutation.mutate()}
                disabled={createAccountMutation.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {createAccountMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Seller Account
                  </>
                )}
              </Button>
            ) : statusLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={onboardingComplete ? "default" : "secondary"}>
                    {onboardingComplete ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Onboarding Complete</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" /> Onboarding Pending</>
                    )}
                  </Badge>
                  {readyToProcess && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ready to Process Payments
                    </Badge>
                  )}
                </div>

                {!onboardingComplete && (
                  <Button 
                    onClick={() => createAccountLinkMutation.mutate()}
                    disabled={createAccountLinkMutation.isPending}
                  >
                    {createAccountLinkMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Complete Onboarding
                      </>
                    )}
                  </Button>
                )}

                {accountStatus?.requirements?.currentlyDue && accountStatus.requirements.currentlyDue.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Action required:</strong> {accountStatus.requirements.currentlyDue.length} item(s) need your attention to complete setup.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {(createAccountMutation.error || createAccountLinkMutation.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {createAccountMutation.error instanceof Error 
                    ? createAccountMutation.error.message 
                    : createAccountLinkMutation.error instanceof Error
                      ? createAccountLinkMutation.error.message
                      : 'An error occurred. Please try again.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Product Management Section - Only show when onboarding is complete */}
        {hasConnectAccount && onboardingComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
              <CardDescription>
                Create and manage your products for sale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Product Form */}
              <form onSubmit={handleCreateProduct} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Create New Product</h3>
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price (£)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={createProductMutation.isPending || !productForm.name || !productForm.price}
                >
                  {createProductMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </>
                  )}
                </Button>
                {createProductMutation.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {createProductMutation.error instanceof Error 
                        ? createProductMutation.error.message 
                        : 'Failed to create product. Please try again.'}
                    </AlertDescription>
                  </Alert>
                )}
              </form>

              {/* Products List */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Your Products</h3>
                {productsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full mt-2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-20" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : products && products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <Card key={product.id}>
                        <CardHeader>
                          {product.images && product.images.length > 0 && (
                            <div className="aspect-video w-full mb-3 overflow-hidden rounded-md">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <CardTitle className="text-base">{product.name}</CardTitle>
                          {product.description && (
                            <CardDescription className="line-clamp-2">
                              {product.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          {product.defaultPrice && (
                            <p className="text-xl font-bold text-foreground">
                              {formatPrice(product.defaultPrice.unitAmount, product.defaultPrice.currency)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No products yet. Create your first product above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Info Section */}
        {hasConnectAccount && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Connected Account ID</Label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {typedUser?.stripeConnectAccountId}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  asChild
                >
                  <a 
                    href={`https://dashboard.stripe.com/${typedUser?.stripeConnectAccountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </a>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => billingPortalMutation.mutate()}
                  disabled={billingPortalMutation.isPending}
                >
                  {billingPortalMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing Portal
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setLocation(`/connect/store/${typedUser?.stripeConnectAccountId}`)}
                >
                  <Store className="h-4 w-4 mr-2" />
                  View Storefront
                </Button>
              </div>

              {billingPortalMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {billingPortalMutation.error instanceof Error 
                      ? billingPortalMutation.error.message 
                      : 'Failed to open billing portal. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

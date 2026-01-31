import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
// NOTE: In production, accountId should be replaced with a more user-friendly identifier
// such as a slug, username, or custom store ID to improve UX and avoid exposing Stripe account IDs
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingBag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

interface CheckoutResponse {
  url: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function ConnectStore() {
  const { accountId } = useParams<{ accountId: string }>();

  const { data: products, isLoading, error } = useQuery<ConnectProduct[]>({
    queryKey: ['/api/connect/products', accountId],
    enabled: !!accountId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string }) => {
      const response = await apiRequest('POST', '/api/connect/checkout', {
        accountId,
        priceId,
      });
      return await response.json() as CheckoutResponse;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleBuyNow = (priceId: string) => {
    checkoutMutation.mutate({ priceId });
  };

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Store</CardTitle>
            <CardDescription>No store identifier provided.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error Loading Store</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load products. Please try again later.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No Products Available</CardTitle>
            <CardDescription>
              This store doesn't have any products available at the moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Store
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Browse our available products
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader className="flex-grow">
                {product.images && product.images.length > 0 && (
                  <div className="aspect-square w-full mb-4 overflow-hidden rounded-md">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardTitle className="text-lg">{product.name}</CardTitle>
                {product.description && (
                  <CardDescription className="line-clamp-3">
                    {product.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {product.defaultPrice && (
                  <p className="text-2xl font-bold text-foreground">
                    {formatPrice(product.defaultPrice.unitAmount, product.defaultPrice.currency)}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => product.defaultPrice && handleBuyNow(product.defaultPrice.id)}
                  disabled={!product.defaultPrice || checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? 'Processing...' : 'Buy Now'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {checkoutMutation.error && (
          <div className="mt-6 text-center">
            <p className="text-destructive">
              {checkoutMutation.error instanceof Error 
                ? checkoutMutation.error.message 
                : 'Failed to create checkout session. Please try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ConnectSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base mt-2">
            Thank you for your purchase. Your order has been confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            You will receive a confirmation email shortly with your order details.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

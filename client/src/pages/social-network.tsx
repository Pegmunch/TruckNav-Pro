import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCircle, Route, Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { DriverProfile } from "@/components/social/driver-profile";
import { DriverDirectory } from "@/components/social/driver-directory";
import { ConnectionsList } from "@/components/social/connections-list";
import { SharedRoutesBrowser } from "@/components/social/shared-routes-browser";

export function SocialNetworkPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access the Social Trucking Network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Navigation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b lg:top-[57px]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title-social">
                <Users className="w-6 h-6 text-primary" />
                Social Trucking Network
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connect, share, and grow your professional driver network
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back-navigation">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Navigation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: Dropdown-style tabs */}
          <div className="lg:hidden mb-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
              <TabsTrigger 
                value="profile" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-mobile-profile"
              >
                <UserCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="directory" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-mobile-directory"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Directory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="connections" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-mobile-connections"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Network</span>
              </TabsTrigger>
              <TabsTrigger 
                value="routes" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-mobile-routes"
              >
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Routes</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop: Sidebar-style tabs */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6">
            <div className="col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Navigation</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TabsList className="flex flex-col h-auto w-full bg-transparent gap-1 p-2">
                    <TabsTrigger 
                      value="profile" 
                      className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-desktop-profile"
                    >
                      <UserCircle className="w-4 h-4 mr-2" />
                      My Profile
                    </TabsTrigger>
                    <TabsTrigger 
                      value="directory" 
                      className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-desktop-directory"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Driver Directory
                    </TabsTrigger>
                    <TabsTrigger 
                      value="connections" 
                      className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-desktop-connections"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      My Connections
                    </TabsTrigger>
                    <TabsTrigger 
                      value="routes" 
                      className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-desktop-routes"
                    >
                      <Route className="w-4 h-4 mr-2" />
                      Shared Routes
                    </TabsTrigger>
                  </TabsList>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-9">
              <TabsContent value="profile" className="mt-0">
                <DriverProfile userId={(user as any).id || ""} />
              </TabsContent>

              <TabsContent value="directory" className="mt-0">
                <DriverDirectory />
              </TabsContent>

              <TabsContent value="connections" className="mt-0">
                <ConnectionsList />
              </TabsContent>

              <TabsContent value="routes" className="mt-0">
                <SharedRoutesBrowser />
              </TabsContent>
            </div>
          </div>

          {/* Mobile: Content below tabs */}
          <div className="lg:hidden">
            <TabsContent value="profile">
              <DriverProfile userId={(user as any).id || ""} />
            </TabsContent>

            <TabsContent value="directory">
              <DriverDirectory />
            </TabsContent>

            <TabsContent value="connections">
              <ConnectionsList />
            </TabsContent>

            <TabsContent value="routes">
              <SharedRoutesBrowser />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

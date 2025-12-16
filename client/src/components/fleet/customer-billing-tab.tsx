import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Search, TrendingUp, DollarSign, Users, BarChart3, AlertCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  contractType: 'per_mile' | 'per_hour' | 'fixed' | 'hybrid';
  ratePerMile?: number;
  ratePerHour?: number;
  fixedRate?: number;
  totalTrips: number;
  totalRevenue: number;
  profitMargin: number;
  outstandingBalance: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

interface BillingAnalytics {
  totalRevenue: number;
  outstandingBalance: number;
  averageProfitMargin: number;
  topCustomers: { name: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  customerCount: number;
  activeContracts: number;
}

export function CustomerBillingTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading: isLoadingCustomers, isError: isCustomersError } = useQuery<Customer[]>({
    queryKey: ['/api/enterprise/billing/customers'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/billing/customers');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Customer billing API unavailable, using demo data');
          return [
            { id: 'c1', name: 'ABC Logistics Ltd', email: 'billing@abclogistics.com', phone: '+44 20 1234 5678', contractType: 'per_mile' as const, ratePerMile: 2.50, totalTrips: 145, totalRevenue: 28500, profitMargin: 22.5, outstandingBalance: 2400, status: 'active' as const, createdAt: '2024-01-15T00:00:00Z' },
            { id: 'c2', name: 'FastFreight Co', email: 'accounts@fastfreight.co.uk', phone: '+44 121 987 6543', contractType: 'per_hour' as const, ratePerHour: 45, totalTrips: 89, totalRevenue: 18200, profitMargin: 18.3, outstandingBalance: 0, status: 'active' as const, createdAt: '2024-02-20T00:00:00Z' },
            { id: 'c3', name: 'Regional Haulage', email: 'finance@regionalhaulage.com', contractType: 'fixed' as const, fixedRate: 5000, totalTrips: 62, totalRevenue: 15000, profitMargin: 25.0, outstandingBalance: 5000, status: 'active' as const, createdAt: '2024-03-10T00:00:00Z' },
            { id: 'c4', name: 'Metro Distribution', email: 'billing@metrodist.com', contractType: 'hybrid' as const, ratePerMile: 1.80, ratePerHour: 35, totalTrips: 234, totalRevenue: 42800, profitMargin: 20.1, outstandingBalance: 1250, status: 'active' as const, createdAt: '2023-11-05T00:00:00Z' },
            { id: 'c5', name: 'Sunset Shipping', email: 'accounts@sunsetship.com', contractType: 'per_mile' as const, ratePerMile: 2.20, totalTrips: 28, totalRevenue: 5600, profitMargin: 15.5, outstandingBalance: 800, status: 'pending' as const, createdAt: '2024-06-01T00:00:00Z' },
          ];
        }
        throw new Error(t('fleet.billing.toast.loadFailed'));
      }
      return response.json();
    },
    meta: {
      onError: () => {
        toast({ title: t('fleet.billing.toast.loadFailed'), description: t('fleet.billing.toast.loadFailedDesc'), variant: 'destructive' });
      }
    }
  });

  const { data: analytics, isLoading: isLoadingAnalytics, isError: isAnalyticsError } = useQuery<BillingAnalytics>({
    queryKey: ['/api/enterprise/billing/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/billing/analytics');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Billing analytics API unavailable, using demo data');
          return {
            totalRevenue: 110100,
            outstandingBalance: 9450,
            averageProfitMargin: 20.3,
            topCustomers: [
              { name: 'Metro Distribution', revenue: 42800 },
              { name: 'ABC Logistics Ltd', revenue: 28500 },
              { name: 'FastFreight Co', revenue: 18200 },
            ],
            revenueByMonth: [
              { month: 'Jan', revenue: 15200 },
              { month: 'Feb', revenue: 18500 },
              { month: 'Mar', revenue: 16800 },
              { month: 'Apr', revenue: 19200 },
              { month: 'May', revenue: 21400 },
              { month: 'Jun', revenue: 19000 },
            ],
            customerCount: 5,
            activeContracts: 4,
          };
        }
        throw new Error(t('fleet.billing.toast.loadFailedAnalytics'));
      }
      return response.json();
    },
  });

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getContractBadge = (contractType: Customer['contractType']) => {
    const config = {
      per_mile: { label: t('fleet.billing.perMile'), class: 'bg-blue-100 text-blue-800' },
      per_hour: { label: t('fleet.billing.perHour'), class: 'bg-green-100 text-green-800' },
      fixed: { label: t('fleet.billing.fixedRate'), class: 'bg-purple-100 text-purple-800' },
      hybrid: { label: t('fleet.billing.hybrid'), class: 'bg-orange-100 text-orange-800' },
    };
    const c = config[contractType];
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  const getStatusBadge = (status: Customer['status']) => {
    const config = {
      active: { label: t('fleet.common.active'), variant: 'default' as const },
      inactive: { label: t('fleet.common.inactive'), variant: 'secondary' as const },
      pending: { label: t('fleet.common.pending'), variant: 'outline' as const },
    };
    const c = config[status];
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatRate = (customer: Customer) => {
    switch (customer.contractType) {
      case 'per_mile':
        return `£${customer.ratePerMile?.toFixed(2)}/mile`;
      case 'per_hour':
        return `£${customer.ratePerHour?.toFixed(2)}/hour`;
      case 'fixed':
        return `£${customer.fixedRate?.toLocaleString()}/month`;
      case 'hybrid':
        return `£${customer.ratePerMile?.toFixed(2)}/mi + £${customer.ratePerHour?.toFixed(2)}/hr`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              {t('fleet.billing.totalRevenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
              £{analytics?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">{t('fleet.billing.thisPeriod')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-600" />
              {t('fleet.billing.outstandingBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-outstanding-balance">
              £{analytics?.outstandingBalance?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">{t('fleet.billing.pendingPayments')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {t('fleet.billing.avgProfitMargin')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-avg-profit-margin">
              {analytics?.averageProfitMargin?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">{t('fleet.billing.acrossAllCustomers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              {t('fleet.billing.activeContracts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-active-contracts">
              {analytics?.activeContracts || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('fleet.billing.ofCustomers', { count: analytics?.customerCount || 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {analytics?.topCustomers && analytics.topCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('fleet.billing.topCustomers')}
            </CardTitle>
            <CardDescription>{t('fleet.billing.byRevenue')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCustomers.map((customer, index) => (
                <div 
                  key={customer.name} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`top-customer-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <span className="font-bold text-green-600">£{customer.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('fleet.billing.customerBilling')}
            </CardTitle>
            <CardDescription>{t('fleet.billing.manageContracts')}</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer">
                <Plus className="w-4 h-4 mr-2" />
                {t('fleet.billing.addCustomer')}
              </Button>
            </DialogTrigger>
            <AddCustomerDialog onClose={() => setIsAddOpen(false)} />
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('fleet.billing.searchCustomers')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder={t('fleet.billing.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fleet.billing.allStatus')}</SelectItem>
                <SelectItem value="active">{t('fleet.common.active')}</SelectItem>
                <SelectItem value="inactive">{t('fleet.common.inactive')}</SelectItem>
                <SelectItem value="pending">{t('fleet.common.pending')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoadingCustomers ? (
            <div className="text-center py-8 text-muted-foreground">{t('fleet.common.loading')}</div>
          ) : isCustomersError && !import.meta.env.DEV ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('fleet.common.unableToLoad')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('fleet.common.tryRefreshing')}</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('fleet.billing.noCustomersFound')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fleet.billing.customer')}</TableHead>
                    <TableHead>{t('fleet.billing.contractType')}</TableHead>
                    <TableHead>{t('fleet.billing.rate')}</TableHead>
                    <TableHead>{t('fleet.billing.totalTrips')}</TableHead>
                    <TableHead>{t('fleet.billing.revenue')}</TableHead>
                    <TableHead>{t('fleet.billing.profitMargin')}</TableHead>
                    <TableHead>{t('fleet.billing.outstanding')}</TableHead>
                    <TableHead>{t('fleet.common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(customer)}
                      data-testid={`row-customer-${customer.id}`}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getContractBadge(customer.contractType)}</TableCell>
                      <TableCell>{formatRate(customer)}</TableCell>
                      <TableCell>{customer.totalTrips}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        £{customer.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell>{customer.profitMargin.toFixed(1)}%</TableCell>
                      <TableCell className={customer.outstandingBalance > 0 ? 'text-orange-600 font-medium' : ''}>
                        £{customer.outstandingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>{t('fleet.billing.customerDetails')}: {selectedCustomer.name}</CardTitle>
            <CardDescription>{t('fleet.billing.fullBillingInfo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.contactEmail')}</div>
                <div className="font-medium" data-testid="text-customer-email">{selectedCustomer.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.phone')}</div>
                <div className="font-medium" data-testid="text-customer-phone">{selectedCustomer.phone || t('fleet.common.na')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.contractType')}</div>
                <div className="font-medium">{getContractBadge(selectedCustomer.contractType)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.rate')}</div>
                <div className="font-medium" data-testid="text-customer-rate">{formatRate(selectedCustomer)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.totalTrips')}</div>
                <div className="font-medium" data-testid="text-customer-trips">{selectedCustomer.totalTrips}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.totalRevenue')}</div>
                <div className="font-medium text-green-600" data-testid="text-customer-revenue">
                  £{selectedCustomer.totalRevenue.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.profitMargin')}</div>
                <div className="font-medium" data-testid="text-customer-margin">
                  {selectedCustomer.profitMargin.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.billing.outstandingBalance')}</div>
                <div className={`font-medium ${selectedCustomer.outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`} data-testid="text-customer-outstanding">
                  £{selectedCustomer.outstandingBalance.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                {t('fleet.common.close')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AddCustomerDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contractType: 'per_mile' as Customer['contractType'],
    ratePerMile: '',
    ratePerHour: '',
    fixedRate: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/enterprise/billing/customers', {
        ...data,
        ratePerMile: data.ratePerMile ? parseFloat(data.ratePerMile) : undefined,
        ratePerHour: data.ratePerHour ? parseFloat(data.ratePerHour) : undefined,
        fixedRate: data.fixedRate ? parseFloat(data.fixedRate) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/billing/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/billing/analytics'] });
      toast({ title: 'Customer added successfully' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Failed to add customer', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogDescription>Enter customer billing information</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-customer-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Billing Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-customer-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-customer-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractType">Contract Type *</Label>
            <Select 
              value={formData.contractType} 
              onValueChange={(value: Customer['contractType']) => setFormData({ ...formData, contractType: value })}
            >
              <SelectTrigger data-testid="select-contract-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_mile">Per Mile</SelectItem>
                <SelectItem value="per_hour">Per Hour</SelectItem>
                <SelectItem value="fixed">Fixed Rate</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(formData.contractType === 'per_mile' || formData.contractType === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="ratePerMile">Rate Per Mile (£)</Label>
              <Input
                id="ratePerMile"
                type="number"
                step="0.01"
                value={formData.ratePerMile}
                onChange={(e) => setFormData({ ...formData, ratePerMile: e.target.value })}
                data-testid="input-rate-per-mile"
              />
            </div>
          )}
          {(formData.contractType === 'per_hour' || formData.contractType === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="ratePerHour">Rate Per Hour (£)</Label>
              <Input
                id="ratePerHour"
                type="number"
                step="0.01"
                value={formData.ratePerHour}
                onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                data-testid="input-rate-per-hour"
              />
            </div>
          )}
          {formData.contractType === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="fixedRate">Fixed Monthly Rate (£)</Label>
              <Input
                id="fixedRate"
                type="number"
                step="0.01"
                value={formData.fixedRate}
                onChange={(e) => setFormData({ ...formData, fixedRate: e.target.value })}
                data-testid="input-fixed-rate"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-customer">
            {createMutation.isPending ? 'Adding...' : 'Add Customer'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

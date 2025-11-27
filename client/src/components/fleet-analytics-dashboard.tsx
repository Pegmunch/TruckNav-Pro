import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { CostAnalytics, FleetVehicle } from '@shared/schema';

export function CostAnalyticsDashboard() {
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
  });

  const costQueries = vehicles.map(vehicle =>
    useQuery<CostAnalytics[]>({
      queryKey: ['/api/fleet/costs/vehicle', vehicle.id],
      enabled: !!vehicle.id,
    })
  );

  const allCosts = costQueries.flatMap(query => query.data || []);

  // Calculate total costs by type
  const costByType: Record<string, number> = {};
  allCosts.forEach(cost => {
    costByType[cost.costType] = (costByType[cost.costType] || 0) + parseFloat(cost.amount.toString());
  });

  const costTypeData = Object.entries(costByType).map(([type, amount]) => ({
    name: type,
    value: amount,
  }));

  // Calculate costs by vehicle
  const costByVehicle: Record<string, number> = {};
  allCosts.forEach(cost => {
    const vehicle = vehicles.find(v => v.id === cost.vehicleId);
    if (vehicle) {
      const key = `${vehicle.registration} (${vehicle.make})`;
      costByVehicle[key] = (costByVehicle[key] || 0) + parseFloat(cost.amount.toString());
    }
  });

  const vehicleCostData = Object.entries(costByVehicle).map(([vehicle, amount]) => ({
    vehicle,
    amount,
  }));

  // Calculate monthly cost trend
  const costByMonth: Record<string, number> = {};
  allCosts.forEach(cost => {
    const month = new Date(cost.occurrenceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    costByMonth[month] = (costByMonth[month] || 0) + parseFloat(cost.amount.toString());
  });

  const monthlyTrendData = Object.entries(costByMonth).map(([month, total]) => ({
    month,
    total,
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  const totalSpent = allCosts.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
  const avgCostPerVehicle = vehicles.length > 0 ? totalSpent / vehicles.length : 0;

  const isLoading = costQueries.some(q => q.isLoading);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalSpent.toFixed(2)}</div>
            <p className="text-xs text-gray-500">All vehicles combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost Per Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{avgCostPerVehicle.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Across {vehicles.length} vehicles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(costByType).length}</div>
            <p className="text-xs text-gray-500">Different cost types</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Type</CardTitle>
            <CardDescription>Percentage of total costs</CardDescription>
          </CardHeader>
          <CardContent>
            {costTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost by Vehicle Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Vehicle</CardTitle>
            <CardDescription>Total costs per vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicleCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vehicleCostData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No vehicle cost data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cost Trend</CardTitle>
          <CardDescription>Cost evolution over time</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total Cost" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No monthly trend data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

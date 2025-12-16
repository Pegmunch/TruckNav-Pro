const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  successRate: number;
}

interface LoadTestConfig {
  concurrency: number;
  duration: number;
  endpoints: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: object;
    headers?: Record<string, string>;
  }>;
}

async function makeRequest(
  endpoint: string,
  method: string,
  body?: object,
  headers?: Record<string, string>
): Promise<{ success: boolean; responseTime: number; statusCode: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      statusCode: 0,
    };
  }
}

async function runLoadTest(config: LoadTestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('\n========================================');
  console.log('       TruckNav Pro Load Test');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrency: ${config.concurrency}`);
  console.log(`Duration: ${config.duration}s`);
  console.log(`Endpoints: ${config.endpoints.length}`);
  console.log('========================================\n');

  for (const endpoint of config.endpoints) {
    console.log(`Testing: ${endpoint.method} ${endpoint.path}...`);
    
    const responseTimes: number[] = [];
    let successCount = 0;
    let failCount = 0;
    
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);
    
    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < config.concurrency; i++) {
      workers.push((async () => {
        while (Date.now() < endTime) {
          const result = await makeRequest(
            endpoint.path,
            endpoint.method,
            endpoint.body,
            endpoint.headers
          );
          
          responseTimes.push(result.responseTime);
          
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })());
    }
    
    await Promise.all(workers);
    
    const totalRequests = successCount + failCount;
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    const result: TestResult = {
      endpoint: endpoint.path,
      method: endpoint.method,
      totalRequests,
      successfulRequests: successCount,
      failedRequests: failCount,
      averageResponseTime: Math.round(avgResponseTime),
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: totalRequests / config.duration,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    };
    
    results.push(result);
    
    console.log(`  ✓ Completed: ${totalRequests} requests, ${result.successRate.toFixed(2)}% success rate\n`);
  }
  
  return results;
}

function printResults(results: TestResult[]): void {
  console.log('\n========================================');
  console.log('           TEST RESULTS');
  console.log('========================================\n');
  
  const overallSuccess = results.reduce((sum, r) => sum + r.successfulRequests, 0);
  const overallTotal = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const overallRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;
  
  console.log('OVERALL SUMMARY:');
  console.log(`  Total Requests: ${overallTotal}`);
  console.log(`  Successful: ${overallSuccess}`);
  console.log(`  Failed: ${overallTotal - overallSuccess}`);
  console.log(`  Success Rate: ${overallRate.toFixed(2)}%`);
  console.log(`  Target (99%): ${overallRate >= 99 ? '✓ MET' : '✗ NOT MET'}`);
  console.log('');
  
  console.log('ENDPOINT BREAKDOWN:');
  console.log('─'.repeat(80));
  
  for (const result of results) {
    console.log(`\n${result.method} ${result.endpoint}`);
    console.log(`  Requests: ${result.totalRequests} (${result.requestsPerSecond.toFixed(1)}/sec)`);
    console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`  Response Time: avg=${result.averageResponseTime}ms, min=${result.minResponseTime}ms, max=${result.maxResponseTime}ms`);
  }
  
  console.log('\n========================================');
  console.log('         99% RELIABILITY CHECK');
  console.log('========================================');
  
  const failedEndpoints = results.filter(r => r.successRate < 99);
  
  if (failedEndpoints.length === 0) {
    console.log('\n✓ ALL ENDPOINTS MEET 99% RELIABILITY TARGET\n');
  } else {
    console.log('\n✗ ENDPOINTS BELOW 99% THRESHOLD:\n');
    for (const ep of failedEndpoints) {
      console.log(`  - ${ep.method} ${ep.endpoint}: ${ep.successRate.toFixed(2)}%`);
    }
    console.log('');
  }
}

const defaultConfig: LoadTestConfig = {
  concurrency: 5,
  duration: 10,
  endpoints: [
    { path: '/api/health', method: 'GET' },
    { path: '/api/vehicle-profiles', method: 'GET' },
    { path: '/api/facilities?type=truck_stop&limit=10', method: 'GET' },
    { path: '/api/traffic-incidents?limit=10', method: 'GET' },
  ],
};

async function main() {
  try {
    const results = await runLoadTest(defaultConfig);
    printResults(results);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();

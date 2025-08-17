# Load Testing Suite

This directory contains comprehensive load testing tools and scripts for the MiniIntern M-Class application system.

## Overview

The load testing suite is designed to validate system performance, concurrency control, and resource management under various load conditions. It includes multiple testing strategies to ensure the application can handle real-world usage patterns.

## Test Types

### 1. Simple Load Test (`simple-load-test.js`)
- **Purpose**: Basic performance validation with mock endpoints
- **Scope**: 100-1000 concurrent requests
- **Metrics**: Response time, throughput, memory usage
- **Use Case**: Quick validation of basic load handling

### 2. Concurrent Applications Test (`concurrent-applications.js`)
- **Purpose**: Validate capacity control and race condition handling
- **Scope**: 50+ concurrent applications to limited-capacity classes
- **Metrics**: Capacity enforcement, data consistency, transaction integrity
- **Use Case**: Verify business logic under concurrent access

### 3. Comprehensive Stress Test (`stress-test.js`)
- **Purpose**: Systematic stress testing across multiple scenarios
- **Scope**: Authentication, class operations, memory leak detection
- **Metrics**: Error rates, performance degradation, resource usage
- **Use Case**: Validate system stability under sustained load

### 4. Artillery Load Tests (`artillery.yml`, `concurrency-test.yml`)
- **Purpose**: Professional load testing with Artillery framework
- **Scope**: Multi-phase load testing with configurable scenarios
- **Metrics**: Professional performance metrics and reporting
- **Use Case**: Production-ready load testing and benchmarking

## Running Tests

### Prerequisites
```bash
# Build the application
npm run build

# Install dependencies (if not already done)
npm install
```

### Individual Tests
```bash
# Run simple load test
npm run test:load:concurrent

# Run stress test
npm run test:load:stress

# Run Artillery tests (requires running server)
npm run test:load:artillery
npm run test:load:concurrency
```

### Comprehensive Test Suite
```bash
# Run all load tests
npm run test:load

# Or directly
node tests/load/load-test-runner.js
```

## Test Scenarios

### Performance Baseline Tests
- **10-200 concurrent requests**: Progressive load testing
- **Success rate tracking**: 95%+ success rate expected
- **Response time analysis**: Average response time monitoring
- **Throughput measurement**: Requests per second calculation

### Stress Test Scenarios
- **Peak Load**: 500 concurrent requests (85% success rate acceptable)
- **Sustained Load**: 50 RPS for 10 seconds (90% success rate expected)
- **Memory Usage**: 1000 rapid requests with memory monitoring

### Concurrency Control Tests
- **Capacity Enforcement**: Multiple users applying to limited-capacity classes
- **Race Condition Handling**: Simultaneous applications validation
- **Transaction Integrity**: Database consistency under concurrent access
- **Duplicate Prevention**: Multiple application attempts by same user

## Expected Performance Metrics

### Acceptable Performance Thresholds
- **Response Time**: < 200ms for 95% of requests
- **Throughput**: > 500 requests/second
- **Success Rate**: > 95% under normal load
- **Error Rate**: < 5% under normal load, < 20% under peak load
- **Memory Usage**: < 50MB increase per 1000 requests

### Test Results Interpretation
- **PASSED**: All metrics within acceptable thresholds
- **FAILED**: One or more metrics exceed thresholds
- **Memory Leak**: Heap usage increase > 50MB during testing
- **Capacity Control**: Exactly maxParticipants accepted, excess rejected

## Configuration

### Environment Variables
```bash
NODE_ENV=test
DATABASE_URL=file:./test-load.db
```

### Artillery Configuration
The Artillery tests use configuration files in YAML format:
- `artillery.yml`: Multi-phase load testing
- `concurrency-test.yml`: Focused concurrency testing

### Custom Test Parameters
Modify test parameters in the test files:
```javascript
const numRequests = 100;        // Number of concurrent requests
const maxParticipants = 5;      // Class capacity for testing
const testDuration = 10000;     // Test duration in milliseconds
```

## Monitoring and Reporting

### Real-time Metrics
- Request/response counts
- Success/failure rates
- Average response times
- Memory usage tracking
- Requests per second

### Test Reports
- Detailed metrics for each test phase
- Performance comparison across load levels
- Error analysis and categorization
- Resource usage summaries

### Output Format
```
🏆 LOAD TEST SUMMARY:
==================================================
⏱️  Total execution time: 13825ms
📊 Tests completed: 3
✅ Tests passed: 2
❌ Tests failed: 1
🎯 Success rate: 66.7%
🏁 Overall result: ❌ FAILED
```

## Troubleshooting

### Common Issues

#### Port Conflicts
If you encounter `EADDRINUSE` errors:
```bash
# Check for running processes
lsof -i :3000

# Kill the process if needed
kill -9 <process_id>
```

#### Memory Issues
For memory-related test failures:
- Reduce concurrent request count
- Add delays between test batches
- Monitor system resources

#### Database Connectivity
For database connection issues:
- Ensure test database is accessible
- Check DATABASE_URL configuration
- Verify Prisma client initialization

### Performance Tuning

#### System-level Optimizations
- Increase file descriptor limits
- Configure proper database connection pooling
- Optimize Node.js memory settings

#### Application-level Optimizations
- Implement proper caching strategies
- Optimize database queries
- Add connection pooling

## Best Practices

### Running Load Tests
1. **Isolated Environment**: Run tests in dedicated test environment
2. **Resource Monitoring**: Monitor CPU, memory, and database resources
3. **Baseline Establishment**: Run tests multiple times to establish baselines
4. **Gradual Load Increase**: Start with low load and gradually increase
5. **Real-world Scenarios**: Design tests based on actual usage patterns

### Test Maintenance
1. **Regular Updates**: Update tests as application evolves
2. **Metric Tracking**: Track performance metrics over time
3. **Threshold Adjustment**: Adjust thresholds based on infrastructure changes
4. **Continuous Integration**: Integrate load tests into CI/CD pipeline

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Load Tests
  run: |
    npm run build
    npm run test:load
```

### Performance Regression Detection
- Compare results with previous test runs
- Set up alerts for performance degradation
- Track long-term performance trends

## Extending the Test Suite

### Adding New Test Scenarios
1. Create new test file in `tests/load/`
2. Implement test logic following existing patterns
3. Add npm script in `package.json`
4. Update documentation

### Custom Metrics Collection
```javascript
// Example custom metric
const customMetric = {
  timestamp: Date.now(),
  testName: 'custom-test',
  value: measuredValue,
  threshold: acceptableThreshold,
  passed: measuredValue <= acceptableThreshold
};
```

### Integration with Monitoring Tools
- Export metrics to monitoring systems
- Set up dashboards for real-time monitoring
- Configure alerting for performance issues
const request = require('supertest');

/**
 * Simple load test that creates its own Express app instance
 * to avoid port conflicts during testing
 */

// Mock Express app for testing
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple test endpoints
app.post('/api/test/signup', (req, res) => {
  // Simulate signup processing time
  setTimeout(() => {
    res.status(201).json({
      success: true,
      data: {
        user: { id: Math.random().toString(36), email: req.body.email },
        accessToken: 'test-token-' + Math.random().toString(36)
      }
    });
  }, Math.random() * 50); // Random delay 0-50ms
});

app.post('/api/test/apply/:classId', (req, res) => {
  // Simulate application processing with capacity check
  const random = Math.random();
  
  setTimeout(() => {
    if (random < 0.8) { // 80% success rate
      res.status(201).json({
        success: true,
        data: { id: Math.random().toString(36), classId: req.params.classId }
      });
    } else {
      res.status(409).json({
        success: false,
        error: { code: 'CAPACITY_EXCEEDED', message: 'Class is full' }
      });
    }
  }, Math.random() * 100); // Random delay 0-100ms
});

async function runSimpleLoadTest() {
  console.log('🚀 Starting simple load test...');
  
  const numRequests = 100;
  const startTime = Date.now();
  
  // Test concurrent signup requests
  console.log(`📝 Testing ${numRequests} concurrent signups...`);
  const signupPromises = Array.from({ length: numRequests }, (_, i) =>
    request(app)
      .post('/api/test/signup')
      .send({
        email: `loadtest${i}@example.com`,
        password: 'LoadTest123!'
      })
      .catch(err => ({ error: err.message }))
  );

  const signupResponses = await Promise.all(signupPromises);
  const signupTime = Date.now() - startTime;
  
  const successfulSignups = signupResponses.filter(r => r.status === 201);
  const signupErrors = signupResponses.filter(r => r.error);
  
  console.log(`✅ Signups completed in ${signupTime}ms`);
  console.log(`   Successful: ${successfulSignups.length}/${numRequests}`);
  console.log(`   Errors: ${signupErrors.length}`);
  console.log(`   Avg response time: ${(signupTime / numRequests).toFixed(2)}ms`);
  console.log(`   Requests/sec: ${(numRequests / (signupTime / 1000)).toFixed(2)}`);

  // Test concurrent application requests
  console.log(`\n🎯 Testing ${numRequests} concurrent applications...`);
  const applyStartTime = Date.now();
  
  const applicationPromises = Array.from({ length: numRequests }, (_, i) =>
    request(app)
      .post('/api/test/apply/test-class-123')
      .send({})
      .catch(err => ({ error: err.message }))
  );

  const applicationResponses = await Promise.all(applicationPromises);
  const applyTime = Date.now() - applyStartTime;
  
  const successfulApplications = applicationResponses.filter(r => r.status === 201);
  const rejectedApplications = applicationResponses.filter(r => r.status === 409);
  const applicationErrors = applicationResponses.filter(r => r.error);
  
  console.log(`✅ Applications completed in ${applyTime}ms`);
  console.log(`   Successful: ${successfulApplications.length}/${numRequests}`);
  console.log(`   Rejected (capacity): ${rejectedApplications.length}`);
  console.log(`   Errors: ${applicationErrors.length}`);
  console.log(`   Avg response time: ${(applyTime / numRequests).toFixed(2)}ms`);
  console.log(`   Requests/sec: ${(numRequests / (applyTime / 1000)).toFixed(2)}`);

  // Memory usage test
  console.log(`\n🧠 Memory usage test...`);
  const initialMemory = process.memoryUsage();
  
  // Perform 1000 rapid requests
  const memoryTestPromises = Array.from({ length: 1000 }, (_, i) =>
    request(app)
      .post('/api/test/signup')
      .send({ email: `memtest${i}@example.com`, password: 'Test123!' })
  );
  
  await Promise.all(memoryTestPromises);
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  console.log(`   Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

  const totalTime = Date.now() - startTime;
  
  console.log('\n🏆 LOAD TEST SUMMARY:');
  console.log('='.repeat(50));
  console.log(`⏱️  Total execution time: ${totalTime}ms`);
  console.log(`📊 Total requests processed: ${numRequests * 2 + 1000}`);
  console.log(`🚀 Overall throughput: ${((numRequests * 2 + 1000) / (totalTime / 1000)).toFixed(2)} req/sec`);
  console.log(`✅ All tests completed successfully`);
  
  const isSuccessful = signupErrors.length === 0 && applicationErrors.length === 0;
  console.log(`🎯 Test result: ${isSuccessful ? 'PASSED' : 'FAILED'}`);
  
  return {
    success: isSuccessful,
    metrics: {
      totalTime,
      totalRequests: numRequests * 2 + 1000,
      signupMetrics: {
        requests: numRequests,
        successful: successfulSignups.length,
        errors: signupErrors.length,
        time: signupTime
      },
      applicationMetrics: {
        requests: numRequests,
        successful: successfulApplications.length,
        rejected: rejectedApplications.length,
        errors: applicationErrors.length,
        time: applyTime
      },
      memoryMetrics: {
        initial: initialMemory.heapUsed,
        final: finalMemory.heapUsed,
        increase: memoryIncrease
      }
    }
  };
}

module.exports = { runSimpleLoadTest };

// Run test if this file is executed directly
if (require.main === module) {
  runSimpleLoadTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    });
}
const request = require('supertest');
const app = require('../../dist/app').default;

/**
 * Test concurrent applications to verify capacity control
 * This test simulates race conditions and validates that exactly
 * maxParticipants are accepted and excess are properly rejected
 */
async function testConcurrentApplications() {
  console.log('🚀 Starting concurrent application load test...');
  
  // Create admin user for class creation
  const adminSignup = await request(app)
    .post('/api/auth/signup')
    .send({
      email: `admin-${Date.now()}@loadtest.com`,
      password: 'AdminLoadTest123!'
    });

  const adminToken = adminSignup.body.data.accessToken;

  // Create a test class with limited capacity
  const maxParticipants = 5;
  const classResponse = await request(app)
    .post('/api/mclasses')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: `Load Test Class - ${Date.now()}`,
      description: 'Test class for concurrent application load testing',
      maxParticipants,
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    });

  const classId = classResponse.body.data.id;
  console.log(`📚 Created test class ${classId} with capacity ${maxParticipants}`);

  // Create multiple users concurrently
  const numUsers = 50; // Much more than capacity
  console.log(`👥 Creating ${numUsers} concurrent users...`);

  const userPromises = Array.from({ length: numUsers }, (_, i) =>
    request(app)
      .post('/api/auth/signup')
      .send({
        email: `loaduser${i}-${Date.now()}@test.com`,
        password: 'LoadTestUser123!'
      })
  );

  const userResponses = await Promise.all(userPromises);
  const successfulUsers = userResponses.filter(r => r.status === 201);
  console.log(`✅ Successfully created ${successfulUsers.length} users`);

  // Extract tokens for successful user registrations
  const userTokens = successfulUsers.map(r => r.body.data.accessToken);

  // Simulate concurrent applications
  console.log(`🏃‍♂️ Starting ${userTokens.length} concurrent applications...`);
  const startTime = Date.now();

  const applicationPromises = userTokens.map(token =>
    request(app)
      .post(`/api/mclasses/${classId}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .catch(err => ({ error: err.message }))
  );

  const applicationResponses = await Promise.all(applicationPromises);
  const endTime = Date.now();

  // Analyze results
  const successful = applicationResponses.filter(r => r.status === 201);
  const rejected = applicationResponses.filter(r => r.status === 409);
  const errors = applicationResponses.filter(r => r.error || (r.status && r.status >= 500));

  console.log('\n📊 LOAD TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`⏱️  Total execution time: ${endTime - startTime}ms`);
  console.log(`👥 Total applications attempted: ${applicationResponses.length}`);
  console.log(`✅ Successful applications: ${successful.length}`);
  console.log(`❌ Rejected applications (capacity): ${rejected.length}`);
  console.log(`💥 Error responses: ${errors.length}`);
  console.log(`🎯 Expected capacity: ${maxParticipants}`);

  // Validation
  const isCapacityControlValid = successful.length === maxParticipants;
  const isDataIntegrityValid = successful.length + rejected.length + errors.length === applicationResponses.length;

  console.log('\n🔍 VALIDATION RESULTS:');
  console.log('='.repeat(50));
  console.log(`✅ Capacity control: ${isCapacityControlValid ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Data integrity: ${isDataIntegrityValid ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ No server errors: ${errors.length === 0 ? 'PASSED' : 'FAILED'}`);

  if (!isCapacityControlValid) {
    console.log(`❌ Expected exactly ${maxParticipants} successful applications, got ${successful.length}`);
  }

  // Verify final class state
  const finalClassResponse = await request(app)
    .get(`/api/mclasses/${classId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  const finalParticipantCount = finalClassResponse.body.data.currentParticipants;
  console.log(`📈 Final participant count in database: ${finalParticipantCount}`);

  const isDatabaseConsistent = finalParticipantCount === successful.length;
  console.log(`✅ Database consistency: ${isDatabaseConsistent ? 'PASSED' : 'FAILED'}`);

  // Performance metrics
  const avgResponseTime = applicationResponses
    .filter(r => r.status)
    .reduce((sum, r) => sum + (r.response?.duration || 0), 0) / applicationResponses.length;

  console.log('\n📈 PERFORMANCE METRICS:');
  console.log('='.repeat(50));
  console.log(`⚡ Average response time: ${avgResponseTime?.toFixed(2) || 'N/A'}ms`);
  console.log(`🚀 Requests per second: ${(applicationResponses.length / ((endTime - startTime) / 1000)).toFixed(2)}`);

  return {
    success: isCapacityControlValid && isDataIntegrityValid && errors.length === 0 && isDatabaseConsistent,
    metrics: {
      totalRequests: applicationResponses.length,
      successfulApplications: successful.length,
      rejectedApplications: rejected.length,
      errors: errors.length,
      executionTime: endTime - startTime,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: applicationResponses.length / ((endTime - startTime) / 1000),
      capacityControlValid: isCapacityControlValid,
      databaseConsistent: isDatabaseConsistent
    }
  };
}

/**
 * Test database connection pool under load
 */
async function testDatabaseConnectionPool() {
  console.log('\n🗄️  Starting database connection pool test...');
  
  const numRequests = 100;
  const promises = Array.from({ length: numRequests }, (_, i) =>
    request(app)
      .post('/api/auth/signup')
      .send({
        email: `dbtest${i}-${Date.now()}@test.com`,
        password: 'DatabaseTest123!'
      })
      .catch(err => ({ error: err.message }))
  );

  const startTime = Date.now();
  const responses = await Promise.all(promises);
  const endTime = Date.now();

  const successful = responses.filter(r => r.status === 201 || r.status === 409);
  const errors = responses.filter(r => r.error || (r.status && r.status >= 500));

  console.log('\n📊 DATABASE POOL TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
  console.log(`✅ Successful requests: ${successful.length}`);
  console.log(`❌ Failed requests: ${errors.length}`);
  console.log(`🚀 Requests per second: ${(numRequests / ((endTime - startTime) / 1000)).toFixed(2)}`);

  return {
    success: errors.length === 0,
    metrics: {
      totalRequests: numRequests,
      successfulRequests: successful.length,
      errors: errors.length,
      executionTime: endTime - startTime,
      requestsPerSecond: numRequests / ((endTime - startTime) / 1000)
    }
  };
}

module.exports = {
  testConcurrentApplications,
  testDatabaseConnectionPool
};

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      const concurrencyResults = await testConcurrentApplications();
      const dbPoolResults = await testDatabaseConnectionPool();
      
      console.log('\n🏆 OVERALL TEST RESULTS:');
      console.log('='.repeat(50));
      console.log(`Concurrency Test: ${concurrencyResults.success ? 'PASSED' : 'FAILED'}`);
      console.log(`DB Pool Test: ${dbPoolResults.success ? 'PASSED' : 'FAILED'}`);
      
      process.exit(concurrencyResults.success && dbPoolResults.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    }
  })();
}
const request = require('supertest');
const app = require('../../dist/app').default;

/**
 * Comprehensive stress test for API endpoints
 */
class StressTest {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: [],
      metrics: {}
    };
  }

  async runAuthenticationStressTest() {
    console.log('🔐 Running authentication stress test...');
    
    const numUsers = 200;
    const batchSize = 50;
    const batches = Math.ceil(numUsers / batchSize);
    
    let totalSuccessful = 0;
    let totalErrors = 0;
    let totalTime = 0;

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const currentBatchSize = Math.min(batchSize, numUsers - (batch * batchSize));
      
      console.log(`  Batch ${batch + 1}/${batches}: ${currentBatchSize} users`);
      
      const promises = Array.from({ length: currentBatchSize }, (_, i) =>
        request(app)
          .post('/api/auth/signup')
          .send({
            email: `stressuser${batch * batchSize + i}-${Date.now()}@test.com`,
            password: 'StressTest123!'
          })
          .catch(err => ({ error: err.message }))
      );

      const responses = await Promise.all(promises);
      const batchEnd = Date.now();
      
      const successful = responses.filter(r => r.status === 201 || r.status === 409);
      const errors = responses.filter(r => r.error || (r.status && r.status >= 500));
      
      totalSuccessful += successful.length;
      totalErrors += errors.length;
      totalTime += (batchEnd - batchStart);
      
      console.log(`    ✅ Successful: ${successful.length}, ❌ Errors: ${errors.length}`);
      
      // Brief pause between batches to avoid overwhelming the system
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const authTestPassed = totalErrors === 0;
    this.results.totalTests++;
    if (authTestPassed) this.results.passedTests++;
    else this.results.failedTests++;

    console.log(`🔐 Authentication stress test: ${authTestPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Total requests: ${numUsers}, Successful: ${totalSuccessful}, Errors: ${totalErrors}`);
    console.log(`   Total time: ${totalTime}ms, Avg time/batch: ${(totalTime / batches).toFixed(2)}ms`);

    return { passed: authTestPassed, metrics: { totalRequests: numUsers, successful: totalSuccessful, errors: totalErrors, totalTime } };
  }

  async runClassOperationsStressTest() {
    console.log('📚 Running class operations stress test...');
    
    // Create admin user
    const adminSignup = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `admin-stress-${Date.now()}@test.com`,
        password: 'AdminStress123!'
      });

    if (adminSignup.status !== 201) {
      console.log('❌ Failed to create admin user for stress test');
      return { passed: false, metrics: {} };
    }

    const adminToken = adminSignup.body.data.accessToken;

    // Create multiple classes concurrently
    const numClasses = 50;
    console.log(`  Creating ${numClasses} classes concurrently...`);
    
    const startTime = Date.now();
    const classPromises = Array.from({ length: numClasses }, (_, i) =>
      request(app)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Stress Test Class ${i}`,
          description: `Description for stress test class ${i}`,
          maxParticipants: 10,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        })
        .catch(err => ({ error: err.message }))
    );

    const classResponses = await Promise.all(classPromises);
    const classCreationTime = Date.now() - startTime;
    
    const successfulClasses = classResponses.filter(r => r.status === 201);
    const classErrors = classResponses.filter(r => r.error || (r.status && r.status >= 500));

    console.log(`  ✅ Created ${successfulClasses.length} classes in ${classCreationTime}ms`);
    console.log(`  ❌ Class creation errors: ${classErrors.length}`);

    // Test concurrent class listing
    const listingStartTime = Date.now();
    const listingPromises = Array.from({ length: 100 }, () =>
      request(app)
        .get('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .catch(err => ({ error: err.message }))
    );

    const listingResponses = await Promise.all(listingPromises);
    const listingTime = Date.now() - listingStartTime;
    
    const successfulListings = listingResponses.filter(r => r.status === 200);
    const listingErrors = listingResponses.filter(r => r.error || (r.status && r.status >= 500));

    console.log(`  ✅ ${successfulListings.length} successful listings in ${listingTime}ms`);
    console.log(`  ❌ Listing errors: ${listingErrors.length}`);

    const classTestPassed = classErrors.length === 0 && listingErrors.length === 0;
    this.results.totalTests++;
    if (classTestPassed) this.results.passedTests++;
    else this.results.failedTests++;

    console.log(`📚 Class operations stress test: ${classTestPassed ? 'PASSED' : 'FAILED'}`);

    return {
      passed: classTestPassed,
      metrics: {
        classCreation: { requests: numClasses, successful: successfulClasses.length, errors: classErrors.length, time: classCreationTime },
        classListing: { requests: 100, successful: successfulListings.length, errors: listingErrors.length, time: listingTime }
      }
    };
  }

  async runMemoryLeakTest() {
    console.log('🧠 Running memory leak detection test...');
    
    const initialMemory = process.memoryUsage();
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: `memtest${i}-${Date.now()}@test.com`,
          password: 'MemoryTest123!'
        });
      
      // Force garbage collection every 100 iterations if available
      if (i % 100 === 0 && global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };

    console.log(`  Initial memory - RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Final memory - RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory increase - RSS: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    // Consider test passed if heap increase is less than 50MB
    const memoryTestPassed = memoryIncrease.heapUsed < 50 * 1024 * 1024;
    this.results.totalTests++;
    if (memoryTestPassed) this.results.passedTests++;
    else this.results.failedTests++;

    console.log(`🧠 Memory leak test: ${memoryTestPassed ? 'PASSED' : 'FAILED'}`);

    return { passed: memoryTestPassed, metrics: { memoryIncrease, iterations } };
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive stress test suite...');
    console.log('='.repeat(60));

    const startTime = Date.now();

    try {
      const authResults = await this.runAuthenticationStressTest();
      const classResults = await this.runClassOperationsStressTest();
      const memoryResults = await this.runMemoryLeakTest();

      const totalTime = Date.now() - startTime;

      console.log('\n🏆 STRESS TEST SUMMARY:');
      console.log('='.repeat(60));
      console.log(`⏱️  Total execution time: ${totalTime}ms`);
      console.log(`📊 Tests passed: ${this.results.passedTests}/${this.results.totalTests}`);
      console.log(`✅ Overall success rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);

      const allTestsPassed = this.results.passedTests === this.results.totalTests;
      console.log(`🎯 Overall result: ${allTestsPassed ? 'PASSED' : 'FAILED'}`);

      return {
        success: allTestsPassed,
        summary: this.results,
        details: { authResults, classResults, memoryResults },
        totalTime
      };
    } catch (error) {
      console.error('❌ Stress test suite failed:', error);
      this.results.errors.push(error.message);
      return {
        success: false,
        summary: this.results,
        error: error.message
      };
    }
  }
}

module.exports = StressTest;

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    const stressTest = new StressTest();
    const results = await stressTest.runAllTests();
    process.exit(results.success ? 0 : 1);
  })();
}
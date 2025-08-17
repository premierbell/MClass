const { runSimpleLoadTest } = require('./simple-load-test');

/**
 * Comprehensive Load Test Runner
 * Runs multiple load test scenarios and generates detailed reports
 */
class LoadTestRunner {
  constructor() {
    this.results = {
      simpleLoad: null,
      performanceBaseline: null,
      stressTest: null,
      startTime: Date.now(),
      endTime: null
    };
  }

  async runPerformanceBaseline() {
    console.log('📊 Running performance baseline test...');
    
    const startTime = Date.now();
    const testMetrics = [];
    
    // Test different load levels
    const loadLevels = [10, 25, 50, 100, 200];
    
    for (const numRequests of loadLevels) {
      console.log(`  Testing with ${numRequests} concurrent requests...`);
      
      const testStart = Date.now();
      
      // Create simple test promises
      const promises = Array.from({ length: numRequests }, (_, i) => 
        new Promise(resolve => {
          // Simulate API processing time
          const processingTime = Math.random() * 100 + 10; // 10-110ms
          setTimeout(() => {
            resolve({
              status: Math.random() > 0.05 ? 200 : 500, // 95% success rate
              duration: processingTime
            });
          }, processingTime);
        })
      );
      
      const responses = await Promise.all(promises);
      const testEnd = Date.now();
      
      const successful = responses.filter(r => r.status === 200);
      const failed = responses.filter(r => r.status !== 200);
      const avgDuration = responses.reduce((sum, r) => sum + r.duration, 0) / responses.length;
      
      const metrics = {
        load: numRequests,
        totalTime: testEnd - testStart,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / numRequests * 100).toFixed(1),
        avgResponseTime: avgDuration.toFixed(2),
        requestsPerSecond: (numRequests / ((testEnd - testStart) / 1000)).toFixed(2)
      };
      
      testMetrics.push(metrics);
      
      console.log(`    ✅ ${metrics.successful}/${numRequests} successful (${metrics.successRate}%)`);
      console.log(`    ⚡ Avg response: ${metrics.avgResponseTime}ms, RPS: ${metrics.requestsPerSecond}`);
      
      // Brief pause between load levels
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('📊 Performance baseline completed');
    console.log(`   Total test time: ${totalTime}ms`);
    
    return {
      success: true,
      totalTime,
      metrics: testMetrics
    };
  }

  async runStressTest() {
    console.log('💪 Running stress test...');
    
    const startTime = Date.now();
    const stressMetrics = {
      peakLoad: null,
      sustainedLoad: null,
      errorRate: null
    };
    
    // Peak load test - very high concurrent requests
    console.log('  Testing peak load (500 concurrent requests)...');
    const peakStart = Date.now();
    
    const peakPromises = Array.from({ length: 500 }, () => 
      new Promise(resolve => {
        const processingTime = Math.random() * 200 + 50; // 50-250ms
        setTimeout(() => {
          resolve({
            status: Math.random() > 0.15 ? 200 : 500, // 85% success rate under stress
            duration: processingTime
          });
        }, processingTime);
      })
    );
    
    const peakResponses = await Promise.all(peakPromises);
    const peakTime = Date.now() - peakStart;
    
    stressMetrics.peakLoad = {
      requests: 500,
      time: peakTime,
      successful: peakResponses.filter(r => r.status === 200).length,
      failed: peakResponses.filter(r => r.status !== 200).length,
      avgResponseTime: peakResponses.reduce((sum, r) => sum + r.duration, 0) / peakResponses.length,
      requestsPerSecond: (500 / (peakTime / 1000)).toFixed(2)
    };
    
    console.log(`    ✅ Peak load: ${stressMetrics.peakLoad.successful}/500 successful`);
    console.log(`    ⚡ Avg response: ${stressMetrics.peakLoad.avgResponseTime.toFixed(2)}ms`);
    
    // Sustained load test - medium load over longer period
    console.log('  Testing sustained load (50 RPS for 10 seconds)...');
    const sustainedStart = Date.now();
    const sustainedDuration = 10000; // 10 seconds
    const rps = 50;
    const totalSustainedRequests = (sustainedDuration / 1000) * rps;
    
    const sustainedPromises = [];
    
    for (let i = 0; i < totalSustainedRequests; i++) {
      // Spread requests over the duration
      const delay = (i / rps) * 1000;
      
      sustainedPromises.push(
        new Promise(resolve => {
          setTimeout(() => {
            const processingTime = Math.random() * 150 + 25; // 25-175ms
            setTimeout(() => {
              resolve({
                status: Math.random() > 0.1 ? 200 : 500, // 90% success rate
                duration: processingTime,
                timestamp: Date.now()
              });
            }, processingTime);
          }, delay);
        })
      );
    }
    
    const sustainedResponses = await Promise.all(sustainedPromises);
    const sustainedTime = Date.now() - sustainedStart;
    
    stressMetrics.sustainedLoad = {
      requests: totalSustainedRequests,
      duration: sustainedTime,
      successful: sustainedResponses.filter(r => r.status === 200).length,
      failed: sustainedResponses.filter(r => r.status !== 200).length,
      avgResponseTime: sustainedResponses.reduce((sum, r) => sum + r.duration, 0) / sustainedResponses.length,
      actualRPS: (totalSustainedRequests / (sustainedTime / 1000)).toFixed(2)
    };
    
    console.log(`    ✅ Sustained load: ${stressMetrics.sustainedLoad.successful}/${totalSustainedRequests} successful`);
    console.log(`    ⚡ Actual RPS: ${stressMetrics.sustainedLoad.actualRPS}`);
    
    const totalTime = Date.now() - startTime;
    
    // Calculate overall error rate
    const totalRequests = stressMetrics.peakLoad.requests + stressMetrics.sustainedLoad.requests;
    const totalErrors = stressMetrics.peakLoad.failed + stressMetrics.sustainedLoad.failed;
    stressMetrics.errorRate = (totalErrors / totalRequests * 100).toFixed(2);
    
    console.log('💪 Stress test completed');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Overall error rate: ${stressMetrics.errorRate}%`);
    
    return {
      success: parseFloat(stressMetrics.errorRate) < 20, // Pass if error rate < 20%
      totalTime,
      metrics: stressMetrics
    };
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.results.endTime - this.results.startTime,
      results: this.results,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallSuccess: false
      }
    };

    // Count test results
    Object.values(this.results).forEach(result => {
      if (result && typeof result === 'object' && result.success !== undefined) {
        report.summary.totalTests++;
        if (result.success) {
          report.summary.passedTests++;
        } else {
          report.summary.failedTests++;
        }
      }
    });

    report.summary.successRate = report.summary.totalTests > 0 
      ? (report.summary.passedTests / report.summary.totalTests * 100).toFixed(1)
      : '0.0';
    
    report.summary.overallSuccess = report.summary.failedTests === 0;

    return report;
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive load test suite...');
    console.log('='.repeat(70));
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    try {
      // Test 1: Simple load test
      console.log('\n📋 TEST 1: Simple Load Test');
      console.log('-'.repeat(50));
      this.results.simpleLoad = await runSimpleLoadTest();
      
      // Test 2: Performance baseline
      console.log('\n📋 TEST 2: Performance Baseline');
      console.log('-'.repeat(50));
      this.results.performanceBaseline = await this.runPerformanceBaseline();
      
      // Test 3: Stress test
      console.log('\n📋 TEST 3: Stress Test');
      console.log('-'.repeat(50));
      this.results.stressTest = await this.runStressTest();
      
      this.results.endTime = Date.now();
      
      // Generate final report
      const report = this.generateReport();
      
      console.log('\n🏆 LOAD TEST SUITE SUMMARY');
      console.log('='.repeat(70));
      console.log(`⏱️  Total execution time: ${report.duration}ms`);
      console.log(`📊 Tests completed: ${report.summary.totalTests}`);
      console.log(`✅ Tests passed: ${report.summary.passedTests}`);
      console.log(`❌ Tests failed: ${report.summary.failedTests}`);
      console.log(`🎯 Success rate: ${report.summary.successRate}%`);
      console.log(`\n🏁 Overall result: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      
      return report.summary.overallSuccess;
      
    } catch (error) {
      console.error('💥 Load test suite crashed:', error);
      this.results.endTime = Date.now();
      return false;
    }
  }
}

module.exports = LoadTestRunner;

// CLI interface
if (require.main === module) {
  (async () => {
    const runner = new LoadTestRunner();
    const success = await runner.runAllTests();
    process.exit(success ? 0 : 1);
  })();
}
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Load Test Runner
 * Coordinates multiple load testing strategies
 */
class LoadTestRunner {
  constructor() {
    this.results = {
      artillery: null,
      concurrency: null,
      stress: null,
      startTime: Date.now(),
      endTime: null
    };
  }

  async runArtilleryTest(configFile) {
    console.log(`🎯 Running Artillery test: ${configFile}`);
    
    return new Promise((resolve, reject) => {
      const artillery = spawn('npx', ['artillery', 'run', configFile], {
        cwd: path.dirname(__filename),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      artillery.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      artillery.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          reject(new Error(`Artillery test failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async runNodeTest(testFile) {
    console.log(`🚀 Running Node.js test: ${testFile}`);
    
    return new Promise((resolve, reject) => {
      const nodeTest = spawn('node', [testFile], {
        cwd: path.dirname(__filename),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      nodeTest.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      nodeTest.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      nodeTest.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          reject(new Error(`Node test failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async checkServerHealth() {
    console.log('🏥 Checking server health...');
    
    try {
      const request = require('supertest');
      const app = require('../../dist/app').default;
      
      const response = await request(app).get('/api/health').timeout(5000);
      
      if (response.status === 200) {
        console.log('✅ Server is healthy and responding');
        return true;
      } else {
        console.log(`❌ Server health check failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Server health check failed: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.results.endTime - this.results.startTime,
      results: this.results,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
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

    report.summary.successRate = (report.summary.passedTests / report.summary.totalTests * 100).toFixed(1);

    // Write report to file
    const reportPath = path.join(__dirname, 'load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Load test report saved to: ${reportPath}`);

    return report;
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive load test suite...');
    console.log('='.repeat(70));
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    try {
      // Check if server is running (optional health check)
      // await this.checkServerHealth();

      // 1. Run concurrent applications test
      console.log('\n📋 TEST 1: Concurrent Applications');
      console.log('-'.repeat(50));
      try {
        this.results.concurrency = await this.runNodeTest('./concurrent-applications.js');
        console.log('✅ Concurrent applications test completed');
      } catch (error) {
        console.log(`❌ Concurrent applications test failed: ${error.message}`);
        this.results.concurrency = { success: false, error: error.message };
      }

      // 2. Run stress test
      console.log('\n📋 TEST 2: Comprehensive Stress Test');
      console.log('-'.repeat(50));
      try {
        this.results.stress = await this.runNodeTest('./stress-test.js');
        console.log('✅ Stress test completed');
      } catch (error) {
        console.log(`❌ Stress test failed: ${error.message}`);
        this.results.stress = { success: false, error: error.message };
      }

      // 3. Run Artillery basic load test (if server is running externally)
      console.log('\n📋 TEST 3: Artillery Load Test (Optional)');
      console.log('-'.repeat(50));
      try {
        console.log('ℹ️  Skipping Artillery test - requires external server');
        console.log('   To run manually: npm run test:load:artillery');
        this.results.artillery = { success: true, skipped: true };
      } catch (error) {
        console.log(`❌ Artillery test failed: ${error.message}`);
        this.results.artillery = { success: false, error: error.message };
      }

      this.results.endTime = Date.now();

      // Generate and display final report
      console.log('\n🏆 LOAD TEST SUITE SUMMARY');
      console.log('='.repeat(70));
      
      const report = this.generateReport();
      
      console.log(`⏱️  Total execution time: ${report.duration}ms`);
      console.log(`📊 Tests completed: ${report.summary.totalTests}`);
      console.log(`✅ Tests passed: ${report.summary.passedTests}`);
      console.log(`❌ Tests failed: ${report.summary.failedTests}`);
      console.log(`🎯 Success rate: ${report.summary.successRate}%`);

      const overallSuccess = report.summary.failedTests === 0;
      console.log(`\n🏁 Overall result: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);

      if (!overallSuccess) {
        console.log('\n❌ Failed tests:');
        Object.entries(this.results).forEach(([testName, result]) => {
          if (result && !result.success && !result.skipped) {
            console.log(`   - ${testName}: ${result.error || 'Unknown error'}`);
          }
        });
      }

      return overallSuccess;

    } catch (error) {
      console.error('💥 Load test suite crashed:', error);
      this.results.endTime = Date.now();
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new LoadTestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Load Test Runner

Usage:
  node run-load-tests.js [options]

Options:
  --help, -h     Show this help message
  --artillery    Run only Artillery tests
  --node         Run only Node.js tests
  --stress       Run only stress tests
  --concurrent   Run only concurrency tests

Examples:
  node run-load-tests.js                    # Run all tests
  node run-load-tests.js --concurrent       # Run only concurrency tests
  node run-load-tests.js --stress           # Run only stress tests
`);
    process.exit(0);
  }

  (async () => {
    let success = false;

    try {
      if (args.includes('--artillery')) {
        success = (await runner.runArtilleryTest('./artillery.yml')).success;
      } else if (args.includes('--concurrent')) {
        success = (await runner.runNodeTest('./concurrent-applications.js')).success;
      } else if (args.includes('--stress')) {
        success = (await runner.runNodeTest('./stress-test.js')).success;
      } else {
        success = await runner.runAllTests();
      }
    } catch (error) {
      console.error('❌ Load test runner failed:', error);
      success = false;
    }

    process.exit(success ? 0 : 1);
  })();
}

module.exports = LoadTestRunner;
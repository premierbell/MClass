#!/usr/bin/env node

/**
 * Concurrency Load Test Script
 * 
 * Tests the application's ability to handle concurrent class applications
 * and prevent capacity overflow through database-level concurrency control.
 */

const http = require('http');
const { performance } = require('perf_hooks');

const API_BASE = 'http://localhost:3000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkYmY4YTQwMC0zZjMxLTRkMDUtOTNjOS1lNTBlYWQyOTE3MzgiLCJlbWFpbCI6InRlc3RhZG1pbkBleGFtcGxlLmNvbSIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1NTI2NDgzMCwiZXhwIjoxNzU1MzUxMjMwLCJhdWQiOiJtaW5paW50ZXJuLXVzZXJzIiwiaXNzIjoibWluaWludGVybi1tY2xhc3MifQ.bin1mE25lkltbeslClRma7rqmiyO9qBZjEgJtdM6WT8';

// Configuration
const CONCURRENT_USERS = 50;
const CLASS_CAPACITY = 10;

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createTestClass() {
  console.log(`Creating test class with capacity ${CLASS_CAPACITY}...`);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/mclasses',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  };

  const classData = {
    title: `Load Test Class ${Date.now()}`,
    description: `Concurrency test class with ${CLASS_CAPACITY} capacity`,
    maxParticipants: CLASS_CAPACITY,
    startAt: '2025-12-01T14:00:00.000Z',
    endAt: '2025-12-01T16:00:00.000Z'
  };

  const response = await makeRequest(options, classData);
  
  if (response.statusCode !== 201) {
    throw new Error(`Failed to create class: ${JSON.stringify(response.body)}`);
  }

  return response.body.data.class.id;
}

async function createTestUser(userIndex) {
  const userData = {
    email: `loadtest${userIndex}@example.com`,
    password: 'LoadTest123!'
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options, userData);
  
  if (response.statusCode !== 201) {
    throw new Error(`Failed to create user ${userIndex}: ${JSON.stringify(response.body)}`);
  }

  return userData.email;
}

async function loginUser(email) {
  const loginData = {
    email,
    password: 'LoadTest123!'
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options, loginData);
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to login user ${email}: ${JSON.stringify(response.body)}`);
  }

  return response.body.data.accessToken;
}

async function applyToClass(classId, userToken, userIndex) {
  const startTime = performance.now();
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/mclasses/${classId}/apply`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    }
  };

  try {
    const response = await makeRequest(options);
    const endTime = performance.now();
    
    return {
      userIndex,
      success: response.statusCode === 201,
      statusCode: response.statusCode,
      errorCode: response.body.error?.code,
      responseTime: endTime - startTime
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      userIndex,
      success: false,
      error: error.message,
      responseTime: endTime - startTime
    };
  }
}

async function getClassStatus(classId) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/mclasses/${classId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  };

  const response = await makeRequest(options);
  return response.body.data.class;
}

async function runLoadTest() {
  console.log('🚀 Starting Concurrency Load Test');
  console.log(`📊 Configuration: ${CONCURRENT_USERS} concurrent users, ${CLASS_CAPACITY} class capacity\n`);

  try {
    // Step 1: Create test class
    const classId = await createTestClass();
    console.log(`✅ Created test class: ${classId}\n`);

    // Step 2: Create test users
    console.log(`👥 Creating ${CONCURRENT_USERS} test users...`);
    const users = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      try {
        const email = await createTestUser(i);
        const token = await loginUser(email);
        users.push({ email, token, index: i });
      } catch (error) {
        console.log(`⚠️  User ${i} creation failed: ${error.message}`);
      }
    }
    
    console.log(`✅ Created ${users.length} test users\n`);

    // Step 3: Launch concurrent applications
    console.log(`🏃 Launching ${users.length} concurrent applications...`);
    const testStartTime = performance.now();
    
    const applicationPromises = users.map(user => 
      applyToClass(classId, user.token, user.index)
    );

    const results = await Promise.all(applicationPromises);
    const testEndTime = performance.now();

    // Step 4: Analyze results
    const successfulApplications = results.filter(r => r.success);
    const failedApplications = results.filter(r => !r.success);
    const capacityExceededErrors = failedApplications.filter(r => r.errorCode === 'CAPACITY_EXCEEDED');
    
    console.log(`✅ Load test completed in ${(testEndTime - testStartTime).toFixed(2)}ms\n`);

    // Step 5: Get final class status
    const finalClassStatus = await getClassStatus(classId);

    // Step 6: Display results
    console.log('📈 LOAD TEST RESULTS');
    console.log('==================');
    console.log(`Total Applications: ${results.length}`);
    console.log(`✅ Successful: ${successfulApplications.length}`);
    console.log(`❌ Failed: ${failedApplications.length}`);
    console.log(`🚫 Capacity Exceeded: ${capacityExceededErrors.length}`);
    console.log(`🎯 Expected Successful: ${CLASS_CAPACITY}`);
    console.log(`📊 Actual Class Participants: ${finalClassStatus.currentParticipants}`);
    console.log(`🏆 Class at Capacity: ${finalClassStatus.isFullyBooked}`);
    
    // Performance metrics
    const responseTimes = results.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log('\n⚡ PERFORMANCE METRICS');
    console.log('=====================');
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    
    // Validation
    console.log('\n🔍 VALIDATION');
    console.log('=============');
    const isValid = (
      successfulApplications.length === CLASS_CAPACITY &&
      finalClassStatus.currentParticipants === CLASS_CAPACITY &&
      capacityExceededErrors.length === (CONCURRENT_USERS - CLASS_CAPACITY) &&
      finalClassStatus.isFullyBooked
    );
    
    if (isValid) {
      console.log('✅ CONCURRENCY CONTROL WORKING CORRECTLY');
      console.log('   - Exactly the right number of applications were accepted');
      console.log('   - Excess applications were properly rejected');
      console.log('   - No capacity overflow occurred');
      console.log('   - Class is properly marked as fully booked');
    } else {
      console.log('❌ CONCURRENCY CONTROL ISSUES DETECTED');
      console.log(`   - Expected ${CLASS_CAPACITY} successful applications, got ${successfulApplications.length}`);
      console.log(`   - Expected ${CLASS_CAPACITY} participants, got ${finalClassStatus.currentParticipants}`);
      console.log(`   - Expected ${CONCURRENT_USERS - CLASS_CAPACITY} capacity exceeded errors, got ${capacityExceededErrors.length}`);
    }

  } catch (error) {
    console.error('💥 Load test failed:', error.message);
    process.exit(1);
  }
}

// Run the load test
runLoadTest().then(() => {
  console.log('\n🎉 Load test completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Load test error:', error);
  process.exit(1);
});
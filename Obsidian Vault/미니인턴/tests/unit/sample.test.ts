/**
 * Sample Test
 * 
 * This is a basic test to verify Jest setup is working correctly.
 */

describe('Jest Setup Verification', () => {
  test('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
  });

  test('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should support async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should support TypeScript', () => {
    interface TestInterface {
      id: number;
      name: string;
    }

    const testObject: TestInterface = {
      id: 1,
      name: 'Test'
    };

    expect(testObject.id).toBe(1);
    expect(testObject.name).toBe('Test');
  });
});
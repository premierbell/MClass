/**
 * Mock database service for unit tests
 */

export default class DatabaseService {
  private static instance: DatabaseService;

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): any {
    return {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
    };
  }

  public async connect(): Promise<void> {
    // Mock implementation - do nothing
    return Promise.resolve();
  }

  public async disconnect(): Promise<void> {
    // Mock implementation - do nothing
    return Promise.resolve();
  }

  public async testConnection(): Promise<boolean> {
    // Mock implementation - always return true
    return Promise.resolve(true);
  }
}
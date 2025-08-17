import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import DatabaseService from './services/database';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import adminRouter from './routes/admin';
import mclassRouter from './routes/mclass';
import { globalErrorHandler } from './middleware/errorHandler';
import { sendNotFound, sendSuccess } from './utils/response';
import requestTracker, { requestMetrics } from './middleware/requestTracker';
import { defaultLogger } from './utils/enhancedLogger';
import { swaggerUi, specs } from './config/swagger';

// 환경 변수 로드
dotenv.config();

class App {
  public app: Application;
  public port: number;
  private database: DatabaseService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.database = DatabaseService.getInstance();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // 요청 추적 미들웨어 - 가장 먼저 실행되어야 함
    this.app.use(requestTracker);
    this.app.use(requestMetrics);
    
    // 보안 미들웨어
    this.app.use(helmet());
    
    // CORS 미들웨어
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));
    
    // 요청 본문 파싱 미들웨어
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    // Swagger API 문서
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "미니인턴 M-Class API 문서",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true
      }
    }));

    // 헬스 체크 엔드포인트
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const dbStatus = await this.database.testConnection();
        const healthData = {
          status: dbStatus ? 'healthy' : 'unhealthy',
          version: '1.0.0',
          uptime: process.uptime(),
          services: {
            database: dbStatus ? 'connected' : 'disconnected'
          }
        };

        req.logger?.info('Health check requested', { status: healthData.status });
        
        sendSuccess(res, healthData, 'MiniIntern M-Class Backend API is running');
      } catch (error) {
        req.logger?.error('Health check failed', error);
        res.status(503).json({
          success: false,
          message: 'Service unavailable',
          timestamp: new Date().toISOString(),
          database: 'error'
        });
      }
    });

    // API 라우트
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/users', userRouter);
    this.app.use('/api/admin', adminRouter);
    this.app.use('/api/mclasses', mclassRouter);

    // API 정보 엔드포인트
    this.app.get('/api', (req: Request, res: Response) => {
      const apiInfo = {
        message: 'MiniIntern M-Class API v1.0.0',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          admin: '/api/admin',
          mclasses: '/api/mclasses'
        },
        description: {
          auth: 'Authentication endpoints (signup, login, me, refresh)',
          users: 'User management endpoints (signup, login, profile, applications)',
          admin: 'Admin-only endpoints (user management, system stats)',
          mclasses: 'M-Class management endpoints (create, list, view, delete)'
        }
      };

      req.logger?.info('API info requested');
      sendSuccess(res, apiInfo);
    });

    // 404 핸들러
    this.app.all('*', (req: Request, res: Response) => {
      sendNotFound(res, `Route ${req.method} ${req.path} not found`);
    });
  }

  private initializeErrorHandling(): void {
    // 전역 에러 핸들러 - 마지막 미들웨어여야 함
    this.app.use(globalErrorHandler);
  }

  public async listen(): Promise<void> {
    try {
      // 먼저 데이터베이스에 연결
      await this.database.connect();
      
      this.app.listen(this.port, () => {
        defaultLogger.info('🚀 MiniIntern M-Class Backend API started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          endpoints: {
            health: `http://localhost:${this.port}/health`,
            api: `http://localhost:${this.port}/api`,
            docs: `http://localhost:${this.port}/api-docs`
          }
        });
        
        console.log(`🚀 MiniIntern M-Class Backend API running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`📖 API info: http://localhost:${this.port}/api`);
        console.log(`📚 Swagger API 문서: http://localhost:${this.port}/api-docs`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      defaultLogger.error('❌ Failed to start server', error);
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// 서버 시작
const app = new App();
app.listen();

export default App;
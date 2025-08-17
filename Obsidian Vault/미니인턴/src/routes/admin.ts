import { Router } from 'express';
import AdminController from '../controllers/admin';
import { adminOnly } from '../middleware/auth';
import { generalLimiter, authLimiter } from '../middleware/rateLimiter';

const adminRouter = Router();
const adminController = new AdminController();

// 모든 관리자 라우트는 인증과 관리자 권한이 필요함
// 남용 방지를 위한 요청 제한 적용

// 관리자 사용자 관리
adminRouter.post('/users', generalLimiter, ...adminOnly, adminController.createAdmin);
adminRouter.get('/users', generalLimiter, ...adminOnly, adminController.listUsers);
adminRouter.put('/users/:userId/promote', authLimiter, ...adminOnly, adminController.promoteToAdmin);
adminRouter.put('/users/:userId/demote', authLimiter, ...adminOnly, adminController.demoteAdmin);

// 시스템 통계 및 모니터링
adminRouter.get('/stats', generalLimiter, ...adminOnly, adminController.getSystemStats);

export default adminRouter;
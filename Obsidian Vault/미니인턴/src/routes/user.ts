import { Router } from 'express';
import UserController from '../controllers/user';
import ApplicationController from '../controllers/application';
import { authenticate } from '../middleware/auth';
import { authLimiter, signupLimiter, generalLimiter } from '../middleware/rateLimiter';

const userRouter = Router();
const userController = new UserController();
const applicationController = new ApplicationController();

// 요청 제한이 적용된 공개 라우트
userRouter.post('/signup', signupLimiter, userController.signup);
userRouter.post('/login', authLimiter, userController.login);

// 일반 요청 제한이 적용된 보호된 라우트 (인증 필요)
userRouter.get('/profile', generalLimiter, authenticate, userController.getProfile);
userRouter.put('/profile', generalLimiter, authenticate, userController.updateProfile);
userRouter.get('/applications', generalLimiter, authenticate, applicationController.getUserApplications);

export default userRouter;
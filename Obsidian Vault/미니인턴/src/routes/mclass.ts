import { Router } from 'express';
import MClassController from '../controllers/mclass';
import ApplicationController from '../controllers/application';
import { authenticate, adminOnly } from '../middleware/auth';
import { generalLimiter, strictLimiter } from '../middleware/rateLimiter';

const mclassRouter = Router();
const mclassController = new MClassController();
const applicationController = new ApplicationController();

// 모든 라우트에 인증 적용
mclassRouter.use(authenticate);

/**
 * @swagger
 * /api/mclasses:
 *   get:
 *     tags: [M-Classes]
 *     summary: M-Class 목록 조회
 *     description: 페이지네이션과 필터링이 적용된 M-Class 목록을 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 클래스 제목 또는 설명 검색어
 *     responses:
 *       200:
 *         description: M-Class 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         classes:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MClass'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.get('/', generalLimiter, mclassController.getClasses);

/**
 * @swagger
 * /api/mclasses/{classId}:
 *   get:
 *     tags: [M-Classes]
 *     summary: M-Class 상세 정보 조회
 *     description: 특정 M-Class의 상세 정보를 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 클래스 ID
 *     responses:
 *       200:
 *         description: M-Class 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MClass'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.get('/:classId', generalLimiter, mclassController.getClassById);

/**
 * @swagger
 * /api/mclasses:
 *   post:
 *     tags: [M-Classes]
 *     summary: M-Class 생성 (관리자 전용)
 *     description: 새로운 M-Class를 생성합니다. 관리자만 접근 가능합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MClassCreateRequest'
 *           example:
 *             title: "고급 Node.js 개발"
 *             description: "TypeScript와 데이터베이스를 활용한 Node.js 백엔드 개발 심화 과정"
 *             maxParticipants: 20
 *             startAt: "2024-02-01T09:00:00.000Z"
 *             endAt: "2024-02-01T12:00:00.000Z"
 *     responses:
 *       201:
 *         description: M-Class 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MClass'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: 관리자 권한 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.post('/', strictLimiter, ...adminOnly, mclassController.createClass);

/**
 * @swagger
 * /api/mclasses/{classId}:
 *   delete:
 *     tags: [M-Classes]
 *     summary: M-Class 삭제 (관리자 전용)
 *     description: 특정 M-Class를 삭제합니다. 관리자만 접근 가능합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 삭제할 클래스 ID
 *     responses:
 *       200:
 *         description: M-Class 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: 관리자 권한 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.delete('/:classId', strictLimiter, ...adminOnly, mclassController.deleteClass);

/**
 * @swagger
 * /api/mclasses/{classId}/apply:
 *   post:
 *     tags: [Applications]
 *     summary: M-Class 신청
 *     description: 특정 M-Class에 신청합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 신청할 클래스 ID
 *     responses:
 *       201:
 *         description: 신청 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Application'
 *       400:
 *         description: 잘못된 요청 (이미 신청함, 정원 초과 등)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.post('/:classId/apply', generalLimiter, applicationController.applyToClass);

/**
 * @swagger
 * /api/mclasses/{classId}/apply:
 *   delete:
 *     tags: [Applications]
 *     summary: M-Class 신청 취소
 *     description: 특정 M-Class 신청을 취소합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 신청 취소할 클래스 ID
 *     responses:
 *       200:
 *         description: 신청 취소 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: 신청 내역을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.delete('/:classId/apply', generalLimiter, applicationController.cancelApplication);

/**
 * @swagger
 * /api/mclasses/{classId}/applications:
 *   get:
 *     tags: [Applications]
 *     summary: M-Class 신청자 목록 조회 (관리자/개설자 전용)
 *     description: 특정 M-Class의 신청자 목록을 조회합니다. 관리자 또는 클래스 개설자만 접근 가능합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 클래스 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 신청자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         applications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Application'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: 권한 없음 (관리자 또는 개설자만 접근 가능)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
mclassRouter.get('/:classId/applications', generalLimiter, applicationController.getClassApplications);

export default mclassRouter;
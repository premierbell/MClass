# 🎓 미니인턴 M-Class 신청 시스템

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%2B-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21%2B-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Tests-Jest-red.svg)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

M-Class(마이크로 러닝 클래스) 신청을 관리하는 포괄적인 백엔드 API 시스템입니다. 현대적인 Node.js 아키텍처를 기반으로 JWT 인증, 역할 기반 접근 제어, 실시간 신청 관리, 강력한 동시성 제어 기능을 제공합니다.

## 🚀 주요 기능

### 핵심 기능
- **사용자 관리**: 회원가입, 인증, 프로필 관리
- **M-Class 관리**: 클래스 생성, 목록 조회, 상세 보기 (관리자 전용)
- **신청 시스템**: 정원 관리와 함께 클래스 신청/취소 기능
- **역할 기반 접근**: 사용자와 관리자 역할로 엔드포인트 보호
- **동시성 제어**: 정원 초과 방지를 위한 데이터베이스 수준 트랜잭션 처리
- **이메일 알림**: 신청 성공 시 자동 이메일 알림 발송

### 기술적 특징
- **JWT 인증**: 갱신 기능을 갖춘 안전한 토큰 기반 인증
- **요청 제한**: 엔드포인트 유형별 차별화된 요청 속도 제한
- **입력 검증**: Express-Validator를 사용한 포괄적인 요청 검증
- **에러 처리**: 상세한 에러 정보를 담은 표준화된 API 응답
- **요청 추적**: 요청 추적 및 디버깅을 위한 상관관계 ID
- **포괄적 로깅**: 요청 추적 기능을 갖춘 Winston 기반 로깅
- **데이터베이스 트랜잭션**: 데이터 일관성을 위한 원자적 연산
- **이메일 서비스**: Nodemailer 기반 HTML 이메일 템플릿 지원
- **API 문서화**: 메타데이터를 포함한 표준화된 응답 형식

## 📋 사전 요구사항

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 또는 **yarn** >= 1.22.0
- **PostgreSQL** >= 15.0

## 🛠️ 설치 방법

### 1. 저장소 복제
```bash
git clone <repository-url>
cd miniintern-mclass-backend
```

### 2. 의존성 설치
```bash
npm install
# 또는
yarn install
```

### 3. 환경 설정
```bash
# 환경 설정 템플릿 복사
cp .env.example .env

# 환경 변수 편집
nano .env
```

### 4. PostgreSQL 설정
```bash
# PostgreSQL 설치 (macOS Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 데이터베이스 생성
createdb miniintern_mclass

# 또는 Docker를 사용하는 경우
docker run -d \
  --name postgres-miniintern \
  -e POSTGRES_DB=miniintern_mclass \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

### 5. 데이터베이스 설정
```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션 실행
npm run db:migrate

# 선택사항: Prisma Studio로 데이터베이스 보기
npm run db:studio
```

### 6. 관리자 사용자 생성 (선택사항)
```bash
npm run admin:create
```

## 🚦 애플리케이션 실행

### 개발 모드
```bash
npm run dev
# 서버가 http://localhost:3000 에서 시작됩니다
```

### 프로덕션 빌드
```bash
# 애플리케이션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

### 테스트
```bash
# 모든 테스트 실행
npm test

# 커버리지와 함께 테스트 실행
npm run test:coverage

# 감시 모드로 테스트 실행
npm run test:watch
```

## 📊 데이터베이스 스키마

### 엔티티 관계 다이어그램 (ERD)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│      User       │         │     MClass      │         │   Application   │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (UUID) PK    │◄────────┤ hostId (UUID)   │         │ id (UUID) PK    │
│ email (unique)  │         │ id (UUID) PK    │────────►│ classId (UUID)  │
│ password        │         │ title           │         │ userId (UUID)   │──┐
│ isAdmin         │         │ description     │         │ createdAt       │  │
│ createdAt       │         │ maxParticipants │         └─────────────────┘  │
│ updatedAt       │         │ startAt         │                              │
└─────────────────┘         │ endAt           │         ┌────────────────────┘
                           │ createdAt       │         │
                           │ updatedAt       │         │
                           └─────────────────┘         │
                                    │                    │
                                    └────────────────────┘
```

### 모델

#### User 모델
- **기본 키**: UUID
- **인증**: bcrypt 해싱을 사용한 이메일/비밀번호
- **역할**: 일반 사용자(기본값) 또는 관리자
- **관계**: 클래스 개설 가능, 클래스 신청 가능

#### MClass 모델
- **기본 키**: UUID
- **정원 관리**: 동시성 제어를 갖춘 maxParticipants
- **일정**: startAt/endAt 타임스탬프
- **관계**: 관리자 사용자가 개설, 신청서 수신

#### Application 모델
- **기본 키**: UUID
- **고유 제약**: 사용자당 클래스당 하나의 신청
- **관계**: 사용자와 클래스 연결
- **타임스탬프**: 자동 생성 추적

## 🔌 API 엔드포인트

### 기본 URL
```
http://localhost:3000/api
```

### 인증 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 인증 필요 | 관리자 전용 |
|--------|----------|------|-----------|------------|
| POST | `/auth/signup` | 사용자 회원가입 | ❌ | ❌ |
| POST | `/auth/login` | 사용자 로그인 | ❌ | ❌ |
| GET | `/auth/me` | 현재 사용자 정보 조회 | ✅ | ❌ |
| POST | `/auth/refresh` | JWT 토큰 갱신 | ✅ | ❌ |

### 사용자 관리 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 인증 필요 | 관리자 전용 |
|--------|----------|------|-----------|------------|
| POST | `/users/signup` | 대안 회원가입 엔드포인트 | ❌ | ❌ |
| POST | `/users/login` | 대안 로그인 엔드포인트 | ❌ | ❌ |
| GET | `/users/profile` | 사용자 프로필 조회 | ✅ | ❌ |
| PUT | `/users/profile` | 사용자 프로필 업데이트 | ✅ | ❌ |
| GET | `/users/applications` | 사용자 신청 내역 조회 | ✅ | ❌ |

### M-Class 관리 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 인증 필요 | 관리자 전용 |
|--------|----------|------|-----------|------------|
| GET | `/mclasses` | 모든 클래스 목록 조회 (페이지네이션) | ✅ | ❌ |
| GET | `/mclasses/:classId` | 클래스 상세 정보 조회 | ✅ | ❌ |
| POST | `/mclasses` | 새 클래스 생성 | ✅ | ✅ |
| DELETE | `/mclasses/:classId` | 클래스 삭제 | ✅ | ✅ |

### 신청 관리 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 인증 필요 | 관리자 전용 |
|--------|----------|------|-----------|------------|
| POST | `/mclasses/:classId/apply` | 클래스 신청 | ✅ | ❌ |
| DELETE | `/mclasses/:classId/apply` | 신청 취소 | ✅ | ❌ |
| GET | `/mclasses/:classId/applications` | 클래스 신청자 목록 조회 | ✅ | ✅/개설자 |

## 📝 API 요청/응답 예제

### 사용자 회원가입
```bash
# 요청
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# 응답
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "isAdmin": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "requestId": "req_1705312200123_abcd1234",
  "timestamp": "2024-01-15T10:30:00.123Z"
}
```

### 사용자 로그인
```bash
# 요청
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# 응답
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "isAdmin": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful",
  "requestId": "req_1705312260456_efgh5678",
  "timestamp": "2024-01-15T10:31:00.456Z"
}
```

### M-Class 생성 (관리자 전용)
```bash
# 요청
curl -X POST http://localhost:3000/api/mclasses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "고급 Node.js 개발",
    "description": "TypeScript와 데이터베이스를 활용한 Node.js 백엔드 개발 심화 과정",
    "maxParticipants": 20,
    "startAt": "2024-02-01T09:00:00.000Z",
    "endAt": "2024-02-01T12:00:00.000Z"
  }'

# 응답
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "고급 Node.js 개발",
    "description": "TypeScript와 데이터베이스를 활용한 Node.js 백엔드 개발 심화 과정",
    "maxParticipants": 20,
    "startAt": "2024-02-01T09:00:00.000Z",
    "endAt": "2024-02-01T12:00:00.000Z",
    "hostId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "M-Class created successfully",
  "requestId": "req_1705312500789_ijkl9012",
  "timestamp": "2024-01-15T10:35:00.789Z"
}
```

### M-Class 신청
```bash
# 요청
curl -X POST http://localhost:3000/api/mclasses/660e8400-e29b-41d4-a716-446655440001/apply \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 응답
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "classId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2024-01-15T10:40:00.000Z"
  },
  "message": "Application submitted successfully",
  "requestId": "req_1705312800012_mnop3456",
  "timestamp": "2024-01-15T10:40:00.012Z"
}
```

### 페이지네이션이 적용된 M-Class 목록 조회
```bash
# Request
curl -X GET "http://localhost:3000/api/mclasses?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Advanced Node.js Development",
        "description": "Deep dive into Node.js backend development with TypeScript and databases",
        "maxParticipants": 20,
        "currentParticipants": 5,
        "remainingSpots": 15,
        "startAt": "2024-02-01T09:00:00.000Z",
        "endAt": "2024-02-01T12:00:00.000Z",
        "hostEmail": "admin@miniintern.com",
        "createdAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "requestId": "req_1705313100345_qrst7890",
  "timestamp": "2024-01-15T10:45:00.345Z"
}
```

### Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required",
        "value": ""
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long",
        "value": "123"
      }
    ]
  },
  "requestId": "req_1705313200678_uvwx1234",
  "timestamp": "2024-01-15T10:46:40.678Z"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development` | ❌ |
| `PORT` | Server port | `3000` | ❌ |
| `HOST` | Server host | `localhost` | ❌ |
| `DATABASE_URL` | Database connection string | `postgresql://macbook@localhost:5433/miniintern_mclass?schema=public` | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `JWT_ISSUER` | JWT issuer | `miniintern-mclass` | ❌ |
| `JWT_AUDIENCE` | JWT audience | `miniintern-users` | ❌ |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` | ❌ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` | ❌ |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` | ❌ |
| `SMTP_PORT` | SMTP server port | `587` | ❌ |
| `SMTP_USER` | SMTP username (sender email) | `help@miniintern.com` | ❌ |
| `SMTP_PASS` | SMTP password/app password | - | ❌ |
| `ADMIN_EMAIL` | Default admin email | `admin@miniintern.com` | ❌ |
| `ADMIN_PASSWORD` | Default admin password | - | ❌ |

### Rate Limiting

The API implements different rate limiting strategies:

- **Signup**: 5 requests per 15 minutes per IP
- **Login**: 10 requests per 15 minutes per IP  
- **General**: 100 requests per 15 minutes per IP
- **Strict**: 20 requests per 15 minutes per IP (admin operations)

### Database Configuration

The application uses PostgreSQL for both development and production. The default development configuration connects to a local PostgreSQL instance:

```env
# Development (Homebrew PostgreSQL 15 on custom port)
DATABASE_URL="postgresql://macbook@localhost:5433/miniintern_mclass?schema=public"

# Production
DATABASE_URL="postgresql://username:password@production-host:5432/miniintern_mclass?schema=public"

# Alternative databases (if needed)
# MySQL
# DATABASE_URL="mysql://username:password@localhost:3306/miniintern_mclass"
```

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── password.test.ts
│   ├── jwt.test.ts
│   ├── validation.test.ts
│   ├── response.test.ts
│   └── user.service.test.ts
├── integration/       # Integration tests (future)
├── helpers/           # Test utilities
│   ├── auth.ts
│   └── database.ts
└── setup.ts          # Test configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- password.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

### Test Coverage

Current test coverage: **130+ unit tests** covering:

- **Password Utilities**: Hashing, validation, generation
- **JWT Utilities**: Token creation, verification, extraction
- **Validation Utilities**: Email, password, request validation
- **Response Utilities**: Success/error formatting, pagination
- **Business Logic**: User service operations with mocking

## 📚 Project Structure

```
miniintern-mclass-backend/
├── src/
│   ├── app.ts                 # Application entry point
│   ├── controllers/           # Request handlers
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── user.ts           # User management
│   │   ├── mclass.ts         # M-Class operations
│   │   ├── application.ts    # Application management
│   │   └── admin.ts          # Admin utilities
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # Authentication/authorization
│   │   ├── rateLimiter.ts    # Rate limiting
│   │   ├── validation.ts     # Request validation
│   │   ├── errorHandler.ts   # Global error handling
│   │   └── requestTracker.ts # Request correlation
│   ├── routes/               # Express routes
│   │   ├── auth.ts           # Auth routes
│   │   ├── user.ts           # User routes
│   │   ├── mclass.ts         # M-Class routes
│   │   └── admin.ts          # Admin routes
│   ├── services/             # Business logic
│   │   ├── user.ts           # User operations
│   │   ├── mclass.ts         # Class operations
│   │   ├── application.ts    # Application operations
│   │   ├── email.ts          # Email notification service
│   │   └── database.ts       # Database connection
│   ├── utils/                # Utilities
│   │   ├── password.ts       # Password operations
│   │   ├── jwt.ts            # JWT operations
│   │   ├── validation.ts     # Input validation
│   │   ├── response.ts       # Response formatting
│   │   └── logger.ts         # Logging utilities
│   ├── types/                # TypeScript definitions
│   │   ├── index.ts          # Common types
│   │   └── responses.ts      # API response types
│   └── constants/            # Application constants
│       └── messages.ts       # Error/success messages
├── prisma/
│   ├── schema.prisma         # Database schema (Single Source of Truth)
│   └── migrations/           # Database migrations
├── tests/                    # Test suite
├── scripts/                  # Utility scripts
├── dist/                     # Compiled JavaScript
└── coverage/                 # Test coverage reports
```

## 🏗️ 타입 관리 아키텍처

이 프로젝트는 **현대적인 타입 관리 접근 방식**을 사용하며, Prisma를 데이터베이스 모델의 단일 진실 소스로 활용합니다:

### 📋 타입 시스템 개요

#### 1. **데이터베이스 타입 (자동 생성)**
- **소스**: `prisma/schema.prisma`
- **생성된 타입**: `@prisma/client`
- **사용법**: `@prisma/client`에서 직접 import

```typescript
import { User, MClass, Application, Prisma } from '@prisma/client';
```

**생성된 타입 포함:**
- `User` - 모든 필드를 포함한 User 엔티티
- `MClass` - 관계가 포함된 M-Class 엔티티
- `Application` - 제약 조건이 포함된 Application 엔티티
- `Prisma` - Prisma 클라이언트 타입 및 유틸리티

#### 2. **커스텀 타입 (수동 정의)**
- **소스**: `src/types/`
- **목적**: API 요청/응답, 확장된 인터페이스, 비즈니스 로직
- **사용법**: 로컬 타입에서 import

```typescript
import { ApiResponse, UserLoginRequest, JwtPayload } from '../types';
```

### 🔄 타입 생성 워크플로우

```bash
# 1. 데이터베이스 스키마 수정
vi prisma/schema.prisma

# 2. 새로운 타입 생성
npm run db:generate

# 3. 타입 자동 사용 가능
import { NewModel } from '@prisma/client';
```

### ✅ `models/` 디렉토리가 없는 이유는?

- **Prisma 스키마**: 모든 데이터베이스 모델의 단일 진실 소스
- **자동 생성**: 스키마 변경 시 타입 자동 동기화
- **타입 안전성**: 데이터베이스 작업의 컴파일 타임 검증
- **DRY 원칙**: 중복 타입 정의 없음
- **개발자 경험**: 모든 데이터베이스 작업에 대한 IntelliSense 지원

### 📝 새로운 타입 추가

**데이터베이스 엔티티의 경우:**
```prisma
// prisma/schema.prisma에 추가
model NewEntity {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

**API/비즈니스 로직의 경우:**
```typescript
// src/types/index.ts에 추가
export interface NewEntityRequest {
  name: string;
}

export interface NewEntityResponse extends NewEntity {
  customField: string;
}
```

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 데이터베이스 연결 문제
```bash
# 데이터베이스 리셋
npm run db:reset

# Prisma 클라이언트 재생성
npm run db:generate
```

#### 2. JWT 토큰 문제
- `.env`에 `JWT_SECRET`이 설정되어 있는지 확인
- 토큰 만료 시간 확인
- 올바른 토큰 형식 확인: `Bearer <token>`

#### 3. 요청 제한 문제
- `.env`에서 rate limit 설정 확인
- 서버 재시작으로 rate limit 캐시 초기화
- 헤더에서 IP 주소 감지 확인

#### 4. PostgreSQL 연결 문제
```bash
# PostgreSQL 서비스 상태 확인
brew services list | grep postgresql

# PostgreSQL 서비스 재시작
brew services restart postgresql@15

# 데이터베이스 연결 테스트
psql -h localhost -p 5433 -d miniintern_mclass -c "SELECT version();"
```

#### 5. 테스트 실패
```bash
# 테스트 데이터베이스 초기화 (PostgreSQL 환경에서)
npm run db:reset

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### 디버그 모드

디버그 로깅 활성화:

```bash
export DEBUG=miniintern:*
npm run dev
```

### 데이터베이스 검사

Prisma Studio를 사용하여 데이터베이스 검사:

```bash
npm run db:studio
# http://localhost:5555에서 열림
```

## 🔍 보안 기능

### 인증 보안
- **비밀번호 해싱**: 12 솔트 라운드를 갖춘 bcrypt
- **JWT 토큰**: 보안 시크릿으로 서명, 24시간 만료
- **입력 검증**: 포괄적인 요청 검증
- **요청 제한**: 남용 방지를 위한 다중 계층

### API 보안
- **CORS 설정**: 설정 가능한 허용 도메인
- **Helmet 미들웨어**: 보안 헤더
- **요청 추적**: 감사 추적을 위한 상관관계 ID
- **에러 처리**: 정제된 에러 응답 (프로덕션에서 스택 트레이스 제외)

### 데이터 보안
- **UUID 기본 키**: 비순차적 식별자
- **고유 제약**: 중복 신청 방지
- **연쇄 삭제**: 참조 무결성 유지
- **트랜잭션 격리**: 레이스 컨디션 방지

## 📊 성능 기능

### 동시성 제어
- **데이터베이스 트랜잭션**: 정원 관리를 위한 원자적 연산
- **비관적 잠금**: 정원 초과 방지
- **레이스 컨디션 처리**: 안전한 동시 신청 처리

### 최적화
- **페이지네이션**: 커서 기반 페이지네이션으로 효율적인 데이터 검색
- **선택적 필드**: 필요한 데이터만 포함한 응답
- **인덱스 최적화**: 자주 조회되는 필드의 데이터베이스 인덱스
- **연결 풀링**: 효율적인 데이터베이스 연결 관리

## 🤝 기여하기

### 개발 워크플로우

1. **저장소 포크**
2. **기능 브랜치 생성**: `git checkout -b feature/amazing-feature`
3. **테스트 작성**: 새로운 기능에 테스트 커버리지 확보
4. **테스트 실행**: `npm test`
5. **코드 스타일 확인**: `npm run lint` (설정된 경우)
6. **변경사항 커밋**: `git commit -m 'Add amazing feature'`
7. **브랜치에 푸시**: `git push origin feature/amazing-feature`
8. **풀 리퀘스트 열기**

### 코드 표준
- **TypeScript**: strict 모드 활성화
- **ESLint**: 코드 린팅 (설정된 경우)
- **Prettier**: 코드 포매팅 (설정된 경우)
- **테스트 커버리지**: 80%+ 커버리지 유지

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙋‍♀️ 지원

지원 및 문의사항:

- **문서**: 이 README와 인라인 코드 주석
- **이슈**: 버그 및 기능 요청을 위한 GitHub 이슈 생성
- **이메일**: help@miniintern.com
- **테스트**: 예제가 포함된 포괄적인 테스트 스위트

## 🔄 변경 로그

### v1.0.0 (2024-01-15)
- 초기 릴리스
- JWT 인증 시스템
- M-Class CRUD 작업
- 동시성 제어가 포함된 신청 관리
- 역할 기반 접근 제어
- 포괄적인 테스트 스위트 (130+ 테스트)
- 요청 제한 및 보안 기능
- 요청 추적 및 로깅
- 이메일 알림 시스템 (Nodemailer 기반)
- API 문서화

---

**미니인턴을 위해 ❤️로 제작됨**

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '미니인턴 M-Class API',
      version: '1.0.0',
      description: 'M-Class(마이크로 러닝 클래스) 신청을 관리하는 포괄적인 백엔드 API 시스템',
      contact: {
        name: 'MiniIntern Team',
        email: 'contact@miniintern.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '개발 서버'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰을 사용한 인증. 형식: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '사용자 고유 ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '사용자 이메일'
            },
            isAdmin: {
              type: 'boolean',
              description: '관리자 여부'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '계정 생성일'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '계정 수정일'
            }
          }
        },
        MClass: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '클래스 고유 ID'
            },
            title: {
              type: 'string',
              description: '클래스 제목'
            },
            description: {
              type: 'string',
              description: '클래스 설명'
            },
            maxParticipants: {
              type: 'integer',
              minimum: 1,
              description: '최대 참가자 수'
            },
            startAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 시작 시간'
            },
            endAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 종료 시간'
            },
            hostId: {
              type: 'string',
              format: 'uuid',
              description: '개설자 ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 생성일'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 수정일'
            }
          }
        },
        Application: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '신청 고유 ID'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: '신청자 ID'
            },
            classId: {
              type: 'string',
              format: 'uuid',
              description: '클래스 ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '신청일'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '요청 성공 여부'
            },
            data: {
              type: 'object',
              description: '응답 데이터'
            },
            message: {
              type: 'string',
              description: '응답 메시지'
            },
            requestId: {
              type: 'string',
              description: '요청 추적 ID'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '응답 시간'
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: '요청 실패'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '에러 코드'
                },
                message: {
                  type: 'string',
                  description: '에러 메시지'
                }
              }
            },
            requestId: {
              type: 'string',
              description: '요청 추적 ID'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '에러 발생 시간'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: '사용자 이메일',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: '비밀번호 (최소 8자)',
              example: 'SecurePassword123!'
            }
          }
        },
        SignupRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: '사용자 이메일',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: '비밀번호 (최소 8자, 영문/숫자/특수문자 포함)',
              example: 'SecurePassword123!'
            }
          }
        },
        MClassCreateRequest: {
          type: 'object',
          required: ['title', 'description', 'maxParticipants', 'startAt', 'endAt'],
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: '클래스 제목',
              example: '고급 Node.js 개발'
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: '클래스 설명',
              example: 'TypeScript와 데이터베이스를 활용한 Node.js 백엔드 개발 심화 과정'
            },
            maxParticipants: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: '최대 참가자 수',
              example: 20
            },
            startAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 시작 시간',
              example: '2024-02-01T09:00:00.000Z'
            },
            endAt: {
              type: 'string',
              format: 'date-time',
              description: '클래스 종료 시간',
              example: '2024-02-01T12:00:00.000Z'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: '인증 관련 API'
      },
      {
        name: 'Users',
        description: '사용자 관리 API'
      },
      {
        name: 'M-Classes',
        description: 'M-Class 관리 API'
      },
      {
        name: 'Applications',
        description: '신청 관리 API'
      },
      {
        name: 'Admin',
        description: '관리자 전용 API'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
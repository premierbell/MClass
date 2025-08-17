import DatabaseService from './database';
import { Application, Prisma } from '@prisma/client';

export interface CreateApplicationData {
  userId: string;
  classId: string;
}

export interface ApplicationWithClass extends Application {
  mclass: {
    id: string;
    title: string;
    description: string;
    maxParticipants: number;
    startAt: Date;
    endAt: Date;
    host: {
      id: string;
      email: string;
    };
  };
}

export interface ApplicationWithUser extends Application {
  user: {
    id: string;
    email: string;
  };
}

class ApplicationService {
  private database = DatabaseService.getInstance();

  async createApplication(data: CreateApplicationData): Promise<Application> {
    try {
      // 원자적 정원 확인 및 신청 생성을 위한 트랜잭션 사용
      const application = await this.database.getClient().$transaction(async (prisma) => {
        // 읽기 잠금으로 현재 정원 확인 (비관적 잠금 시뮬레이션)
        const classWithCount = await prisma.mClass.findUnique({
          where: { id: data.classId },
          select: {
            id: true,
            maxParticipants: true,
            _count: {
              select: {
                applications: true
              }
            }
          }
        });

        if (!classWithCount) {
          throw new Error('Class not found');
        }

        const currentApplications = classWithCount._count.applications;
        
        // 클래스 정원 초과 확인
        if (currentApplications >= classWithCount.maxParticipants) {
          throw new Error('Class is fully booked');
        }

        // 트랜잭션 내에서 중복 신청 확인
        const existingApplication = await prisma.application.findUnique({
          where: {
            unique_user_class_application: {
              userId: data.userId,
              classId: data.classId
            }
          }
        });

        if (existingApplication) {
          throw new Error('User has already applied to this class');
        }

        // 정원이 허용되면 신청 생성
        const newApplication = await prisma.application.create({
          data: {
            userId: data.userId,
            classId: data.classId
          }
        });

        return newApplication;
      });

      return application;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('User has already applied to this class');
        }
        if (error.code === 'P2003') {
          throw new Error('Invalid user ID or class ID');
        }
      }
      
      // 사용자 정의 에러 처리
      if (error instanceof Error) {
        if (error.message.includes('Class not found') || 
            error.message.includes('Class is fully booked') ||
            error.message.includes('already applied')) {
          throw error;
        }
      }
      
      throw error;
    }
  }

  async getApplicationById(id: string): Promise<ApplicationWithClass | null> {
    try {
      const application = await this.database.getClient().application.findUnique({
        where: { id },
        include: {
          mclass: {
            include: {
              host: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return application;
    } catch (error) {
      throw error;
    }
  }

  async getUserApplications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ applications: ApplicationWithClass[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        this.database.getClient().application.findMany({
          where: { userId },
          include: {
            mclass: {
              include: {
                host: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        this.database.getClient().application.count({
          where: { userId }
        })
      ]);

      return {
        applications,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  async getClassApplications(
    classId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ applications: ApplicationWithUser[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        this.database.getClient().application.findMany({
          where: { classId },
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // First come, first served
          },
          skip,
          take: limit
        }),
        this.database.getClient().application.count({
          where: { classId }
        })
      ]);

      return {
        applications,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  async hasUserApplied(userId: string, classId: string): Promise<boolean> {
    try {
      const application = await this.database.getClient().application.findUnique({
        where: {
          unique_user_class_application: {
            userId,
            classId
          }
        }
      });

      return !!application;
    } catch (error) {
      return false;
    }
  }

  async cancelApplication(userId: string, classId: string): Promise<void> {
    try {
      await this.database.getClient().application.delete({
        where: {
          unique_user_class_application: {
            userId,
            classId
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Application not found');
        }
      }
      throw error;
    }
  }

  async getApplicationStats(classId: string): Promise<{
    currentApplications: number;
    maxParticipants: number;
    availableSpots: number;
    isFullyBooked: boolean;
  } | null> {
    try {
      const result = await this.database.getClient().mClass.findUnique({
        where: { id: classId },
        select: {
          maxParticipants: true,
          _count: {
            select: {
              applications: true
            }
          }
        }
      });

      if (!result) {
        return null;
      }

      const currentApplications = result._count.applications;
      const availableSpots = result.maxParticipants - currentApplications;

      return {
        currentApplications,
        maxParticipants: result.maxParticipants,
        availableSpots: Math.max(0, availableSpots),
        isFullyBooked: availableSpots <= 0
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteApplicationsByClassId(classId: string): Promise<number> {
    try {
      const result = await this.database.getClient().application.deleteMany({
        where: { classId }
      });

      return result.count;
    } catch (error) {
      throw error;
    }
  }
}

export default ApplicationService;
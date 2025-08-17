import DatabaseService from './database';
import { MClass, Prisma } from '@prisma/client';

export interface CreateMClassData {
  title: string;
  description: string;
  maxParticipants: number;
  startAt: Date;
  endAt: Date;
  hostId: string;
}

export interface UpdateMClassData {
  title?: string;
  description?: string;
  maxParticipants?: number;
  startAt?: Date;
  endAt?: Date;
}

export interface MClassWithStats extends MClass {
  currentParticipants: number;
  host: {
    id: string;
    email: string;
  };
}

class MClassService {
  private database = DatabaseService.getInstance();

  async createClass(data: CreateMClassData): Promise<MClass> {
    try {
      const mclass = await this.database.getClient().mClass.create({
        data: {
          title: data.title,
          description: data.description,
          maxParticipants: data.maxParticipants,
          startAt: data.startAt,
          endAt: data.endAt,
          hostId: data.hostId
        }
      });

      return mclass;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('A class with this title already exists');
        }
      }
      throw error;
    }
  }

  async getClassById(id: string): Promise<MClassWithStats | null> {
    try {
      const mclass = await this.database.getClient().mClass.findUnique({
        where: { id },
        include: {
          host: {
            select: {
              id: true,
              email: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      });

      if (!mclass) {
        return null;
      }

      return {
        ...mclass,
        currentParticipants: mclass._count.applications
      };
    } catch (error) {
      throw error;
    }
  }

  async getClasses(
    page: number = 1,
    limit: number = 10,
    includeExpired: boolean = false
  ): Promise<{ classes: MClassWithStats[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      const now = new Date();

      const whereCondition = includeExpired
        ? {}
        : {
            endAt: {
              gte: now
            }
          };

      const [classes, total] = await Promise.all([
        this.database.getClient().mClass.findMany({
          where: whereCondition,
          include: {
            host: {
              select: {
                id: true,
                email: true
              }
            },
            _count: {
              select: {
                applications: true
              }
            }
          },
          orderBy: {
            startAt: 'asc'
          },
          skip,
          take: limit
        }),
        this.database.getClient().mClass.count({
          where: whereCondition
        })
      ]);

      const classesWithStats = classes.map(mclass => ({
        ...mclass,
        currentParticipants: mclass._count.applications
      }));

      return {
        classes: classesWithStats,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  async updateClass(id: string, data: UpdateMClassData): Promise<MClass> {
    try {
      const updatedClass = await this.database.getClient().mClass.update({
        where: { id },
        data
      });

      return updatedClass;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Class not found');
        }
      }
      throw error;
    }
  }

  async deleteClass(id: string): Promise<void> {
    try {
      await this.database.getClient().mClass.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Class not found');
        }
      }
      throw error;
    }
  }

  async getClassStats(id: string): Promise<{
    currentParticipants: number;
    maxParticipants: number;
    availableSpots: number;
    isFullyBooked: boolean;
  } | null> {
    try {
      const mclass = await this.database.getClient().mClass.findUnique({
        where: { id },
        select: {
          maxParticipants: true,
          _count: {
            select: {
              applications: true
            }
          }
        }
      });

      if (!mclass) {
        return null;
      }

      const currentParticipants = mclass._count.applications;
      const availableSpots = mclass.maxParticipants - currentParticipants;

      return {
        currentParticipants,
        maxParticipants: mclass.maxParticipants,
        availableSpots: Math.max(0, availableSpots),
        isFullyBooked: availableSpots <= 0
      };
    } catch (error) {
      throw error;
    }
  }

  async isUserHost(classId: string, userId: string): Promise<boolean> {
    try {
      const mclass = await this.database.getClient().mClass.findUnique({
        where: { id: classId },
        select: { hostId: true }
      });

      return mclass?.hostId === userId;
    } catch (error) {
      return false;
    }
  }
}

export default MClassService;
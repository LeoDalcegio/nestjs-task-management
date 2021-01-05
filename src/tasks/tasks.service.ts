import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from '../common/enum/TaskStatus';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/tasks.entity';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class TasksService {
  private logger = new Logger('TasksService');

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async findOne(id: number, user: User) {
    const task = await this.taskRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    return task;
  }

  async create(createTaskDto: CreateTaskDto, user: User) {
    const task = this.taskRepository.create({
      status: TaskStatus.OPEN,
      user: user,
      ...createTaskDto,
    });

    try {
      const taskToReturn = await this.taskRepository.save(task);

      delete taskToReturn.user;

      return taskToReturn;
    } catch (error) {
      this.logger.error(
        `Failed to create tasks for user "${
          user.username
        }". Filters: ${JSON.stringify(createTaskDto)}`,
        error.stack,
      );

      throw new InternalServerErrorException();
    }
  }

  async remove(id: number, user: User): Promise<void> {
    const result = await this.taskRepository.delete({
      id: id,
      userId: user.id,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Task #${id} not found`);
    }
  }

  async update(id: number, status: TaskStatus, user: User) {
    const existingTask = await this.taskRepository.preload({
      id: id,
      status: status,
    });

    if (!existingTask) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    return this.taskRepository.save(existingTask);
  }

  async findAll(getTasksFilterDto: GetTasksFilterDto, user: User) {
    const { status, search } = getTasksFilterDto;

    const query = this.taskRepository.createQueryBuilder('task');

    query.andWhere('task.userId = :userId', { userId: user.id });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (error) {
      this.logger.error(
        `Failed to get tasks for user "${
          user.username
        }". Filters: ${JSON.stringify(getTasksFilterDto)}`,
        error.stack,
      );

      throw new InternalServerErrorException();
    }
  }
}

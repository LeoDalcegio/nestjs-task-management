import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskStatus } from '../common/enum/TaskStatus';
import { Repository } from 'typeorm';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { Task } from './entities/tasks.entity';
import { TasksService } from './tasks.service';
import { NotFoundException } from '@nestjs/common';

const mockUser = { id: 2, username: 'Test User' };

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  preload: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    getMany: jest.fn().mockResolvedValue('someValue'),
    andWhere: jest.fn().mockReturnThis(),
  })),
});

describe('TasksService', () => {
  let tasksService;
  let tasksRepository: MockRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useFactory: createMockRepository },
      ],
    }).compile();

    tasksService = await module.get<TasksService>(TasksService);
    tasksRepository = await module.get<MockRepository>(
      getRepositoryToken(Task),
    );
  });

  describe('findAll', () => {
    it('Get all tasks from the repository', async () => {
      const filters: GetTasksFilterDto = {
        status: TaskStatus.IN_PROGRESS,
        search: 'Some search query',
      };

      const result = await tasksService.findAll(filters, mockUser);

      expect(result).toEqual('someValue');
    });
  });

  describe('findOne', () => {
    it('cals taskRepository.findOne() and succesfully retrieve and return the task', async () => {
      const mockTask = {
        title: 'Test task',
        description: 'Test desc',
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);

      const result = await tasksService.findOne(1, mockUser);

      expect(result).toEqual(mockTask);
      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: mockUser.id,
        },
      });
    });

    it('throws an error as task is not found', () => {
      tasksRepository.findOne.mockResolvedValue(null);

      expect(tasksService.findOne(1, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('calls taskRepository.create() and returns the result', async () => {
      const createTaskDto = {
        title: 'TestTask',
        description: 'Test Description',
        status: TaskStatus.OPEN,
      };

      tasksRepository.create.mockResolvedValue({ createTaskDto, mockUser });
      tasksRepository.save.mockResolvedValue({ createTaskDto, mockUser });

      const result = await tasksService.create(createTaskDto, mockUser);

      expect(result).toEqual({ createTaskDto, mockUser });
    });
  });

  describe('remove', () => {
    it('calls taskRepository.delete() to delete a task', async () => {
      tasksRepository.delete.mockResolvedValue({ affected: 1 });

      expect(tasksRepository.delete).not.toHaveBeenCalled();

      await tasksService.remove(1, mockUser);

      expect(tasksRepository.delete).toHaveBeenCalledWith({
        id: 1,
        userId: mockUser.id,
      });
    });

    it('throws an error as task could no be found', async () => {
      tasksRepository.delete.mockResolvedValue({ affected: 0 });

      expect(tasksService.remove(1, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('calls taskRepository.delete() to delete a task', async () => {
      tasksRepository.preload = jest.fn().mockResolvedValue({
        status: TaskStatus.OPEN,
      });

      tasksRepository.save = jest.fn().mockResolvedValue({
        status: TaskStatus.DONE,
      });

      expect(tasksRepository.save).not.toHaveBeenCalled();

      const result = await tasksService.update(1, TaskStatus.DONE, mockUser);

      expect(tasksRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(TaskStatus.DONE);
    });
  });
});

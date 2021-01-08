import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/tasks.entity';
import { TasksService } from './tasks.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
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
});

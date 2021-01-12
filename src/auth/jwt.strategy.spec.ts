import { Test } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
});

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let userRepository: MockRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useFactory: createMockRepository },
      ],
    }).compile();

    userRepository = await module.get<MockRepository>(getRepositoryToken(User));
    jwtStrategy = await module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('validates and returns the user based on JWT payload', async () => {
      const user = new User();
      user.username = 'TestUser';

      userRepository.findOne.mockResolvedValue(user);

      const result = await jwtStrategy.validate({ username: 'TestUser' });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        username: 'TestUser',
      });
      expect(result).toEqual(user);
    });

    it('throws an unauthorized exception as user cannot be found', () => {
      userRepository.findOne.mockResolvedValue(null);

      expect(jwtStrategy.validate({ username: 'TestUser ' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

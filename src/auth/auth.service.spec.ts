import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './entities/user.entity';
import { JwtStrategy } from './jwt.strategy';
import * as config from 'config';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UNIQUE_VIOLATION } from 'pg-error-constants';
import * as bcrypt from 'bcryptjs';

const jwtConfig = config.get('jwt');

const mockCredentialsDto: AuthCredentialsDto = {
  username: 'TestUsername',
  password: 'TestPassword',
};

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

describe('AuthService', () => {
  let authService;
  let userRepository: MockRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET || jwtConfig.secret,
          signOptions: {
            expiresIn: jwtConfig.expiresIn,
          },
        }),
      ],
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: createMockRepository },
        JwtStrategy,
      ],
    }).compile();

    authService = await module.get<AuthService>(AuthService);
    userRepository = await module.get<MockRepository>(getRepositoryToken(User));
  });

  describe('signUp', () => {
    let save;

    beforeEach(() => {
      save = jest.fn();
      userRepository.create = jest.fn().mockReturnValue({ save });
    });

    it('successfully signs up the user', async () => {
      save.mockResolvedValue(undefined);

      expect(authService.signUp(mockCredentialsDto)).resolves.not.toThrow();
    });

    it('throws a conflic exception as username already exists', () => {
      save.mockResolvedValue({ code: UNIQUE_VIOLATION });

      expect(authService.signUp(mockCredentialsDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws a internal server error exception as username already exists', () => {
      save.mockResolvedValue({ code: '123456' });

      expect(authService.signUp(mockCredentialsDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('signIn', () => {
    let user;

    beforeEach(() => {
      user = new User();
      user.username = 'TestUsername';
      user.validatePassword = jest.fn();
    });

    // TODO - it returns the jwt token
    it('returns the username as the validation is successful', async () => {
      userRepository.findOne.mockResolvedValue(user);
      user.validatePassword.mockResolvedValue(true);

      const result = await authService.signIn(user);

      expect(result).toEqual('someValue');
    });

    it('returns the null as user cannot be found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      expect(authService.signIn(user)).rejects.toThrow(UnauthorizedException);
      expect(user.validatePassword).not.toHaveBeenCalled();
    });

    it('returns the null as password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(user);
      user.validatePassword.mockResolvedValue(false);

      expect(authService.signIn(mockCredentialsDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(user.validatePassword).toHaveBeenCalled();
    });
  });

  describe('hashPassword', () => {
    it('calls bcrypt.hash to generate a hash', async () => {
      bcrypt.hash = jest.fn().mockResolvedValue('testHash');

      expect(bcrypt.hash).not.toHaveBeenCalled();

      const result = await authService.hashPassword('testPassword', 'testSalt');

      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 'testSalt');
    });
  });
});

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './entities/user.entity';
import { UNIQUE_VIOLATION } from 'pg-error-constants';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    const { username, password } = authCredentialsDto;

    const salt = await bcryptjs.genSalt();

    try {
      const user = this.userRepository.create({
        username,
        salt,
        password: await this.hashPassword(password, salt),
      });

      return this.userRepository.save(user);
    } catch (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ accessToken: string }> {
    const { username, password } = authCredentialsDto;

    const user = await this.userRepository.findOne({ username });

    if (!user || (await user.validatePassword(password)) === false) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { username };
    const accessToken = await this.jwtService.sign(payload);

    this.logger.debug(
      `Generated JWT Token with payload ${JSON.stringify(payload)}`,
    );

    return { accessToken };
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return bcryptjs.hash(password, salt);
  }
}

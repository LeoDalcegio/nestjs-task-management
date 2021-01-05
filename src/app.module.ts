import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { CommonModule } from './common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), TasksModule, CommonModule, AuthModule],
})
export class AppModule {}

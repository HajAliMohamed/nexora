import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { ClientUser } from '../clients/entities/client-user.entity';
import { UsersService } from './users.service';
import { MeController } from './me.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, ClientUser])],
  providers: [UsersService],
  controllers: [MeController],
  exports: [UsersService],
})
export class UsersModule {}

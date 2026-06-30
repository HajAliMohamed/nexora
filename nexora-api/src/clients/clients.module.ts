import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientUser } from './entities/client-user.entity';
import { Project } from '../projects/entities/project.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { MagicLinkModule } from '../magic-link/magic-link.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClientUser, Project]), forwardRef(() => MagicLinkModule)],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}

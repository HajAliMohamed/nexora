import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand])],
  providers: [BrandingService],
  controllers: [BrandingController],
  exports: [BrandingService],
})
export class BrandingModule {}

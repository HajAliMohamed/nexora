import { Module } from '@nestjs/common';
import { SerpService } from './serp.service';

@Module({
  providers: [SerpService],
  exports: [SerpService],
})
export class SerpModule {}

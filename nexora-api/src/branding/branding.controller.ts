import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { BrandingService } from './branding.service';
import { CreateBrandDto } from './dto/brand.dto';

@Controller('agencies/:agencyId/brands')
@UseGuards(AuthGuard)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Post()
  async create(@Param('agencyId') agencyId: string, @Body() dto: CreateBrandDto) {
    return this.brandingService.create(agencyId, dto);
  }

  @Get()
  async list(@Param('agencyId') agencyId: string) {
    return this.brandingService.listByAgency(agencyId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateBrandDto>) {
    return this.brandingService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.brandingService.delete(id);
    return { ok: true };
  }
}

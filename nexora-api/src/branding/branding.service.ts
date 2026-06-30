import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  async create(agencyId: string, dto: CreateBrandDto): Promise<Brand> {
    return this.brandRepo.save({ agencyId, ...dto });
  }

  async listByAgency(agencyId: string): Promise<Brand[]> {
    return this.brandRepo.find({ where: { agencyId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Marque non trouvée');
    return brand;
  }

  async update(id: string, dto: Partial<CreateBrandDto>): Promise<Brand> {
    const brand = await this.findById(id);
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }

  async delete(id: string): Promise<void> {
    const brand = await this.findById(id);
    await this.brandRepo.remove(brand);
  }
}

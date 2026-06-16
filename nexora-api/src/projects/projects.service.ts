import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Competitor } from './entities/competitor.entity';
import { LimitsService } from '../billing/limits.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Competitor)
    private readonly competitorRepo: Repository<Competitor>,
    @Inject(forwardRef(() => LimitsService))
    private readonly limitsService: LimitsService,
  ) {}

  async findAll(userId: string): Promise<Project[]> {
    return this.projectRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    await this.limitsService.ensureCanCreateProject(userId);
    const project = this.projectRepo.create({ ...dto, userId });
    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async delete(id: string): Promise<void> {
    const project = await this.findById(id);
    await this.projectRepo.remove(project);
  }

  async countByUser(userId: string): Promise<number> {
    return this.projectRepo.count({ where: { userId } });
  }

  async getAllWithOwners(): Promise<{ id: string; userId: string; domain: string }[]> {
    return this.projectRepo.find({ select: ['id', 'userId', 'domain'] });
  }

  async getCompetitors(projectId: string): Promise<Competitor[]> {
    return this.competitorRepo.find({ where: { projectId } });
  }
}

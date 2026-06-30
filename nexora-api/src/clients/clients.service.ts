import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientUser } from './entities/client-user.entity';
import { Project } from '../projects/entities/project.entity';
import { InviteClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientUser)
    private readonly clientRepo: Repository<ClientUser>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async invite(agencyId: string, dto: InviteClientDto): Promise<ClientUser> {
    const existing = await this.clientRepo.findOne({
      where: { agencyId, email: dto.email },
    });
    if (existing) {
      if (dto.name) existing.name = dto.name;
      return this.clientRepo.save(existing);
    }
    return this.clientRepo.save({
      agencyId,
      email: dto.email,
      name: dto.name || null,
    } as any);
  }

  async listByAgency(agencyId: string): Promise<ClientUser[]> {
    return this.clientRepo.find({
      where: { agencyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ClientUser> {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException('Client non trouvé');
    return client;
  }

  async findByEmail(email: string): Promise<ClientUser | null> {
    return this.clientRepo.findOne({ where: { email } });
  }

  async deactivate(id: string): Promise<void> {
    const client = await this.findById(id);
    client.active = false;
    await this.clientRepo.save(client);
  }

  async linkUser(clientId: string, userId: string): Promise<void> {
    await this.clientRepo.update(clientId, { userId } as any);
  }

  async assignProject(clientId: string, projectId: string): Promise<void> {
    const client = await this.findById(clientId);
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet non trouvé');
    project.clientId = client.id;
    await this.projectRepo.save(project);
  }
}

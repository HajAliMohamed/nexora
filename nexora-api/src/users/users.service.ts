import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(email: string, password: string, name?: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, passwordHash, name });
    return this.userRepo.save(user);
  }

  async updateOnboarding(id: string, complete: boolean): Promise<void> {
    await this.userRepo.update(id, { onboardingComplete: complete });
  }
}

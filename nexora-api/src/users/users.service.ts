import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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

  async updateProfile(id: string, data: { name?: string; email?: string }): Promise<User> {
    const user = await this.findById(id);

    if (data.email && data.email !== user.email) {
      const existing = await this.findByEmail(data.email);
      if (existing) throw new ConflictException('Cet email est déjà utilisé');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;

    return this.userRepo.save(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mot de passe actuel incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }
}

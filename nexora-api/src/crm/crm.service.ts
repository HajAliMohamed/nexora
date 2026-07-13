import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmTask } from './entities/crm-task.entity';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(CrmTask)
    private readonly taskRepo: Repository<CrmTask>,
  ) {}

  async createTask(projectId: string, userId: string, data: { title: string; description?: string; priority?: string; source?: string }): Promise<CrmTask> {
    const task = this.taskRepo.create({
      projectId, userId, title: data.title,
      description: data.description || '', status: 'todo',
      priority: data.priority || 'medium',
      source: data.source || 'manual',
    });
    return this.taskRepo.save(task);
  }

  async listTasks(projectId: string, status?: string): Promise<CrmTask[]> {
    const where: any = { projectId };
    if (status) where.status = status;
    return this.taskRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateTaskStatus(id: string, userId: string, status: string): Promise<CrmTask> {
    const task = await this.taskRepo.findOne({ where: { id, userId } });
    if (!task) throw new Error('Tâche introuvable');
    task.status = status;
    return this.taskRepo.save(task);
  }

  async createTasksFromAudit(projectId: string, userId: string, issues: { type: string; message: string; severity: string }[]): Promise<CrmTask[]> {
    const tasks = issues.map(issue =>
      this.taskRepo.create({
        projectId, userId,
        title: `[Audit] ${issue.message.length > 80 ? issue.message.substring(0, 80) + '...' : issue.message}`,
        description: `Type: ${issue.type}\nSévérité: ${issue.severity}\n\n${issue.message}`,
        status: 'todo',
        priority: issue.severity === 'critical' ? 'high' : issue.severity === 'high' ? 'high' : 'medium',
        source: 'audit',
      })
    );
    return this.taskRepo.save(tasks);
  }

  async createTasksFromStrategy(projectId: string, userId: string, actions: { phase: string; action: string }[]): Promise<CrmTask[]> {
    const tasks = actions.map(a =>
      this.taskRepo.create({
        projectId, userId,
        title: `[Stratégie] ${a.action.length > 80 ? a.action.substring(0, 80) + '...' : a.action}`,
        description: `Phase: ${a.phase}\nAction: ${a.action}`,
        status: 'todo',
        priority: 'medium',
        source: 'ai',
      })
    );
    return this.taskRepo.save(tasks);
  }
}

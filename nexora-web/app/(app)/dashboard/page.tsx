'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Project, SiteAudit } from '@/lib/types/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: audits } = useQuery({
    queryKey: ['audits', project.id],
    queryFn: () => apiFetch<SiteAudit[]>(`/projects/${project.id}/audits`),
    refetchInterval: (q: any) => {
      const data = q.state.data as SiteAudit[] | undefined;
      return data?.some(a => a.status === 'pending' || a.status === 'running') ? 10000 : false;
    },
  });

  const { data: overview } = useQuery({
    queryKey: ['project-overview', project.id],
    queryFn: () => apiFetch<any>(`/projects/${project.id}/overview`),
  });

  const launchMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${project.id}/audits`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits', project.id] });
    },
  });

  const latestDone = audits?.filter(a => a.status === 'done')[0];
  const score = latestDone?.score;
  const avgPos = overview?.rankings?.avgPosition;

  return (
    <Card className="card-hover">
      <CardHeader>
        <Link href={`/projects/${project.id}`} className="block">
          <CardTitle>{project.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{project.domain}</p>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Score SEO :</span>
              {score !== undefined && score !== null ? (
                <Badge variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'destructive'}>
                  {score}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Pas encore d&apos;audit</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Position moy. :</span>
              <span className="text-sm font-medium">
                {avgPos !== null && avgPos !== undefined ? `#${avgPos}` : '–'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dernier audit : {latestDone ? new Date(latestDone.createdAt).toLocaleDateString('fr') : 'Jamais'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.preventDefault();
              launchMutation.mutate();
            }}
            disabled={launchMutation.isPending}
          >
            {launchMutation.isPending ? '⟳' : 'Nouvel audit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <Link href="/projects/new">
          <Button>Nouveau projet</Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement des projets...</p>}

      {projects && projects.length === 0 && (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>Ajoutez votre premier projet</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Commencez par ajouter un domaine à analyser
            </p>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/projects/new">
              <Button>Créer un projet</Button>
            </Link>
          </CardFooter>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

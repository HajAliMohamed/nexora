'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientProjectsPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => apiFetch<{ id: string; name: string; domain: string; countryCode: string; languageCode: string; createdAt: string }[]>('/me/projects'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
        <p className="text-sm text-destructive">Erreur lors du chargement des projets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes projets</h1>
        <p className="text-sm text-muted-foreground">Consultez vos projets SEO</p>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-sm text-muted-foreground">Aucun projet pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Link key={project.id} href={`/client/projects/${project.id}`} className="block">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="truncate">{project.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{project.countryCode?.toUpperCase()}</Badge>
                    <Badge variant="outline">{project.languageCode?.toUpperCase()}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

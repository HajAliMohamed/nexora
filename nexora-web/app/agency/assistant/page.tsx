'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, AssistantResponse } from '@/lib/types/shared';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Search,
  GitCompareArrows,
  FileText,
  BarChart3,
  Send,
  Sparkles,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: 'Analyser une page', icon: Search, prompt: 'Analyse la page d\'accueil de mon projet et donne-moi des recommandations SEO.' },
  { label: 'Comparer un concurrent', icon: GitCompareArrows, prompt: 'Compare mon site avec mes concurrents et donne-moi les axes d\'amélioration.' },
  { label: 'Générer un brief', icon: FileText, prompt: 'Génère un brief éditorial SEO pour un article sur mon secteur.' },
  { label: 'Expliquer un graphique', icon: BarChart3, prompt: 'Explique-moi les métriques clés de mon tableau de bord SEO.' },
];

export default function AssistantPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
    enabled: !!agency,
  });

  const askMutation = useMutation({
    mutationFn: (data: { projectId: string; question: string }) =>
      apiFetch<AssistantResponse>(`/projects/${data.projectId}/assistant`, {
        method: 'POST',
        body: JSON.stringify({ question: data.question }),
      }),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || question;
    if (!msg.trim() || !selectedProject || askMutation.isPending) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    askMutation.mutate({ projectId: selectedProject, question: msg });
    setQuestion('');
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assistant SEO</h1>
          <p className="text-sm text-muted-foreground">Posez vos questions sur le SEO</p>
        </div>
        <Select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="w-64"
        >
          <option value="">Sélectionnez un projet</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {!selectedProject ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Sélectionnez un projet pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {QUICK_ACTIONS.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleSend(action.prompt)}
                disabled={askMutation.isPending}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="rounded-full bg-brand/10 p-4">
                    <Sparkles className="h-8 w-8 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assistant SEO</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Utilisez les actions rapides ci-dessus ou posez une question directement.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-brand text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  </div>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ex: Comment améliorer le score SEO de mon site ?"
              disabled={askMutation.isPending}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!question.trim() || askMutation.isPending}
              className="gap-1.5"
            >
              {askMutation.isPending ? (
                <span className="animate-spin">●</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

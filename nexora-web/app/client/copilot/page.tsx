'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Project, AssistantResponse } from '@/lib/types/shared';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Sparkles, BarChart3, FileText, Search, TrendingUp } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: 'Explique mon rapport', icon: FileText, prompt: 'Explique-moi mon dernier rapport SEO : les scores, les points forts et les axes d\'amélioration.' },
  { label: 'Que dois-je améliorer ?', icon: BarChart3, prompt: 'Quels sont les principaux problèmes SEO de mon site à corriger en priorité ?' },
  { label: 'Où se positionne mon site ?', icon: Search, prompt: 'Comment mon site se positionne-t-il sur mes mots-clés ?' },
  { label: 'Comment progresser ?', icon: TrendingUp, prompt: 'Quelles actions concrètes puis-je prendre pour améliorer mon référencement ?' },
];

export default function ClientCopilotPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string }>('/me'),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => apiFetch<{ projects: Project[] }>('/reports/client-dashboard'),
  });

  const projectId = dashboard?.projects?.[0]?.id;

  const askMutation = useMutation({
    mutationFn: (data: { projectId: string; question: string }) =>
      apiFetch<AssistantResponse>(`/projects/${data.projectId}/copilot`, {
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
    if (!msg.trim() || !projectId || askMutation.isPending) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    askMutation.mutate({ projectId, question: msg });
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
    <div className="space-y-6 h-full flex flex-col max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Copilote SEO</h1>
        <p className="text-sm text-muted-foreground">
          Bonjour {user?.name || user?.email?.split('@')[0] || ''}, posez-moi toutes vos questions SEO
        </p>
      </div>

      {!projectId ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Aucun projet trouvé. Votre agence doit d&apos;abord créer un projet pour vous.
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
                    <p className="text-sm font-medium">Copilote SEO personnalisé</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                      Je connais vos données SEO. Posez-moi une question sur votre site, vos rapports ou vos performances.
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
              placeholder="Ex: Quel est mon score SEO actuel ?"
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

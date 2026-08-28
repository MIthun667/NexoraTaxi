'use client';

import { FormEvent, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAskExecutiveQuestion,
  useExecutiveQaSuggestions,
} from '@/hooks/queries/use-shopify-intelligence';

import { ExecutiveAnswerCard } from './executive-answer-card';
import { ExecutiveFollowupChips } from './executive-followup-chips';

export function ExecutiveQaPanel({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [question, setQuestion] = useState('');
  const askExecutiveQuestionMutation = useAskExecutiveQuestion();
  const suggestionsQuery = useExecutiveQaSuggestions();
  const answer = askExecutiveQuestionMutation.data ?? null;

  function submit(nextQuestion?: string) {
    const resolvedQuestion = (nextQuestion ?? question).trim();
    if (!organizationId || !resolvedQuestion) {
      return;
    }

    askExecutiveQuestionMutation.mutate({
      organizationId,
      question: resolvedQuestion,
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Executive Q&A"
        description="Ask bounded questions about current store health, trust, signals, recommendations, actions, integrations, learning, and recent agent findings."
        variant="subtle"
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-3 xl:flex-row">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a leadership question, for example: Why are revenue signals elevated?"
            />
            <Button
              type="submit"
              disabled={!organizationId || !question.trim() || askExecutiveQuestionMutation.isPending}
            >
              {askExecutiveQuestionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Ask
            </Button>
          </div>

          <ExecutiveFollowupChips
            items={suggestionsQuery.data ?? []}
            onSelect={(value) => {
              setQuestion(value);
              submit(value);
            }}
          />

          {askExecutiveQuestionMutation.isError ? (
            <p className="text-sm text-rose-300">Nexora could not answer that question right now. Please try again.</p>
          ) : null}
        </form>
      </SectionCard>

      <ExecutiveAnswerCard answer={answer} />
    </div>
  );
}

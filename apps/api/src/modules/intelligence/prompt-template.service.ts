import { Injectable, NotFoundException } from '@nestjs/common';

interface PromptTemplateDefinition {
  moduleKey: string;
  promptTemplateKey: string;
  systemPrompt: string;
  useCase: string;
  renderUserPrompt: (payload: unknown) => string;
}

const baseSystemPrompt = [
  'You are Nexora Intelligence, an enterprise company operations analyst.',
  'You only return strict JSON that matches the requested schema.',
  'Do not include markdown fences, commentary, or prose outside the JSON object.',
  'Base your reasoning only on the provided operational context.',
  'Keep the tone concise, operational, and suitable for supervisors and controllers.',
].join(' ');

@Injectable()
export class PromptTemplateService {
  private readonly templates = new Map<string, PromptTemplateDefinition>([
    [
      'shopify-executive-summary.v1',
      {
        moduleKey: 'commerce',
        promptTemplateKey: 'shopify-executive-summary.v1',
        useCase: 'shopify-executive-summary',
        systemPrompt: [
          baseSystemPrompt,
          'You are preparing a concise executive commerce brief for leadership.',
          'Use only the provided deterministic summary, signals, insights, recommendations, and top-product context.',
          'Do not invent or infer any metrics beyond the provided facts.',
          'If telemetry is missing, state that clearly and do not speculate.',
          'Return JSON with keys: summary, highlights, risks, leadershipFocus.',
          'Keep all items concise, grounded, and suitable for an executive dashboard.',
        ].join(' '),
        renderUserPrompt: (payload) =>
          [
            'Generate a grounded executive Shopify business brief.',
            'Important rules:',
            '- Stay fully grounded in the provided data.',
            '- Do not invent metrics, percentages, or customer behavior not present in context.',
            '- Keep the main summary to a short executive paragraph.',
            '- Use highlights for what is going well or what changed.',
            '- Use risks for concrete watch items only.',
            '- Use leadershipFocus for the next actions leadership should pay attention to.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'operational-summary.v1',
      {
        moduleKey: 'dashboard',
        promptTemplateKey: 'operational-summary.v1',
        useCase: 'operational-summary',
        systemPrompt: baseSystemPrompt,
        renderUserPrompt: (payload) =>
          [
            'Generate an operational summary for the current organization.',
            'Return JSON with keys: headline, summary, topRisks, recommendedActions, confidence.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'approval-explanation.v1',
      {
        moduleKey: 'approvals',
        promptTemplateKey: 'approval-explanation.v1',
        useCase: 'approval-explanation',
        systemPrompt: baseSystemPrompt,
        renderUserPrompt: (payload) =>
          [
            'Explain an approval decision context for the current organization.',
            'Return JSON with keys: title, summary, rationale, risks, suggestedDecision, confidence.',
            'Suggested decision must be one of APPROVE, REJECT, REVIEW.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'dispatch-incident-summary.v1',
      {
        moduleKey: 'dispatch',
        promptTemplateKey: 'dispatch-incident-summary.v1',
        useCase: 'dispatch-incident-summary',
        systemPrompt: baseSystemPrompt,
        renderUserPrompt: (payload) =>
          [
            'Summarize an operational incident for operational responders.',
            'Return JSON with keys: title, summary, severityAssessment, immediateActions, escalationRecommendation, confidence.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'driver-compliance-explanation.v1',
      {
        moduleKey: 'drivers',
        promptTemplateKey: 'driver-compliance-explanation.v1',
        useCase: 'driver-compliance-explanation',
        systemPrompt: baseSystemPrompt,
        renderUserPrompt: (payload) =>
          [
            'Explain operator compliance posture for the current organization.',
            'Return JSON with keys: title, summary, complianceFindings, blockers, recommendedActions, confidence.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'fleet-readiness-explanation.v1',
      {
        moduleKey: 'fleet',
        promptTemplateKey: 'fleet-readiness-explanation.v1',
        useCase: 'fleet-readiness-explanation',
        systemPrompt: baseSystemPrompt,
        renderUserPrompt: (payload) =>
          [
            'Explain asset readiness posture for the current organization.',
            'Return JSON with keys: title, summary, readinessFindings, blockers, recommendedActions, confidence.',
            'Context:',
            JSON.stringify(payload),
          ].join('\n'),
      },
    ],
    [
      'agent-workforce-readiness.v1',
      {
        moduleKey: 'agents',
        promptTemplateKey: 'agent-workforce-readiness.v1',
        useCase: 'agent-workforce-readiness',
        systemPrompt: [
          baseSystemPrompt,
          'You are a bounded workforce planning agent.',
          'Use workforce, approvals, workflows, readiness, and staffing signals only.',
          'Return JSON with keys: summary, findings, risks, recommendations, proposedActions, confidence.',
          'Each proposed action must include: type, description, target, requiresApproval, rationale.',
          'Keep actions safe, reviewable, and suitable for workflow or approval routing.',
        ].join(' '),
        renderUserPrompt: (payload) =>
          ['Generate a bounded workforce readiness and hiring intervention brief.', 'Context:', JSON.stringify(payload)].join('\n'),
      },
    ],
    [
      'agent-operations-control.v1',
      {
        moduleKey: 'agents',
        promptTemplateKey: 'agent-operations-control.v1',
        useCase: 'agent-operations-control',
        systemPrompt: [
          baseSystemPrompt,
          'You are a bounded operations control agent.',
          'Focus on incidents, readiness, assignments, alerts, and execution pressure.',
          'Return JSON with keys: summary, findings, risks, recommendations, proposedActions, confidence.',
          'Each proposed action must include: type, description, target, requiresApproval, rationale.',
          'Only recommend safe workflow, incident, approval, or notification follow-up.',
        ].join(' '),
        renderUserPrompt: (payload) =>
          ['Generate a bounded operations control brief with reviewable next actions.', 'Context:', JSON.stringify(payload)].join('\n'),
      },
    ],
    [
      'agent-revenue-operations.v1',
      {
        moduleKey: 'agents',
        promptTemplateKey: 'agent-revenue-operations.v1',
        useCase: 'agent-revenue-operations',
        systemPrompt: [
          baseSystemPrompt,
          'You are a bounded revenue operations agent.',
          'Focus on approvals, workflow latency, connector freshness, and control bottlenecks.',
          'Return JSON with keys: summary, findings, risks, recommendations, proposedActions, confidence.',
          'Each proposed action must include: type, description, target, requiresApproval, rationale.',
          'Only recommend safe escalation, workflow review, or notification actions.',
        ].join(' '),
        renderUserPrompt: (payload) =>
          ['Generate a bounded revenue operations decision-flow brief with reviewable actions.', 'Context:', JSON.stringify(payload)].join('\n'),
      },
    ],
  ]);

  getTemplate(key: string) {
    const template = this.templates.get(key);

    if (!template) {
      throw new NotFoundException(`Prompt template "${key}" was not found.`);
    }

    return template;
  }
}

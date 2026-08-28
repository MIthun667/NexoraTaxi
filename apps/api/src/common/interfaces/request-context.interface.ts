import { Request, Response } from 'express';

export interface RequestContext {
  requestId: string;
  request: Request;
  response: Response;
  startedAt: number;
}

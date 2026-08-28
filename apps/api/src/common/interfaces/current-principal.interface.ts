export interface CurrentPrincipal {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface User extends CurrentPrincipal {}

    interface Request {
      principal?: CurrentPrincipal;
      user?: CurrentPrincipal;
      requestId?: string;
    }
  }
}

export {};

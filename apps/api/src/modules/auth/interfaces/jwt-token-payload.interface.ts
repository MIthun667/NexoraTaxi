export type JwtTokenType = 'access' | 'refresh';

export interface JwtTokenPayload {
  userId: string;
  organizationId: string;
  email: string;
}

export interface SignedJwtTokenPayload extends JwtTokenPayload {
  tokenType: JwtTokenType;
}

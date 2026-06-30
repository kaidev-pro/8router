// 8Router — OAuth Provider Abstraction

export interface OAuthUser {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'google' | 'github';
}

export interface OAuthProviderImpl {
  id: 'google' | 'github';
  name: string;
  /**
   * Build the authorization URL to redirect the user to
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;
  /**
   * Exchange authorization code for user info
   */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthUser>;
}

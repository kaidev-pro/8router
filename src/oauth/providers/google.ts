// 8Router — Google OAuth Provider

import type { OAuthProviderImpl, OAuthUser } from '../provider.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export class GoogleOAuthProvider implements OAuthProviderImpl {
  readonly id = 'google' as const;
  readonly name = 'Google';
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthUser> {
    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    if (!tokenData.access_token) {
      throw new Error('Google: no access_token in response');
    }

    // Fetch user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error(`Google userinfo failed: ${userRes.status}`);
    }

    const userData = await userRes.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    return {
      userId: String(userData.id),
      email: userData.email || '',
      name: userData.name || '',
      avatar: userData.picture || '',
      provider: 'google',
    };
  }
}

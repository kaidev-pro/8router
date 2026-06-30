// 8Router — GitHub OAuth Provider

import type { OAuthProviderImpl, OAuthUser } from '../provider.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export class GitHubOAuthProvider implements OAuthProviderImpl {
  readonly id = 'github' as const;
  readonly name = 'GitHub';
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
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthUser> {
    // Exchange code for access token
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(`GitHub: no access_token — ${tokenData.error || 'unknown error'}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': '8Router',
      },
    });

    if (!userRes.ok) {
      throw new Error(`GitHub user fetch failed: ${userRes.status}`);
    }

    const userData = await userRes.json() as {
      id: number;
      login: string;
      name: string;
      avatar_url: string;
      email: string | null;
    };

    // Try to get email (may be private)
    let email = userData.email || '';
    if (!email) {
      try {
        const emailsRes = await fetch(GITHUB_EMAILS_URL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': '8Router',
          },
        });
        if (emailsRes.ok) {
          const emails = await emailsRes.json() as { email: string; verified: boolean; primary: boolean }[];
          const primary = emails.find(e => e.primary && e.verified);
          email = primary?.email || emails[0]?.email || '';
        }
      } catch {
        // Email fetch failed — continue without email
      }
    }

    return {
      userId: String(userData.id),
      email,
      name: userData.name || userData.login,
      avatar: userData.avatar_url || '',
      provider: 'github',
    };
  }
}

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    let user = await prisma.user.findUnique({ where: { email: profile.emails?.[0]?.value } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          password: '', // OAuth users don't have password
          avatar: profile.photos?.[0]?.value,
        },
      });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: '/api/auth/github/callback',
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.displayName || profile.username,
          email,
          password: '',
          avatar: profile.photos?.[0]?.value,
        },
      });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user: any, done: any) => done(null, user.id));
passport.deserializeUser(async (id: any, done: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/**
 * JIRA OAuth2 Manual Flow Implementation
 * Encapsulated to match the passport pattern as closely as possible
 */
export const handleJiraCallback = async (code: string, userId: string) => {
  const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
  const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
  const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI || 'http://localhost:5000/api/jira/callback';

  // Exchange code for token
  const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_CLIENT_SECRET,
      code,
      redirect_uri: JIRA_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenResponse.json() as any;

  if (!tokenResponse.ok) {
    throw new Error(`Failed to exchange JIRA code: ${JSON.stringify(tokenData)}`);
  }

  // Get Cloud ID
  const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
    },
  });

  const resources = await resourcesResponse.json() as any[];
  
  if (!resourcesResponse.ok || resources.length === 0) {
    throw new Error('Failed to get JIRA accessible resources');
  }

  const cloudId = resources[0].id;

  // Save to database
  return prisma.jiraIntegration.upsert({
    where: { userId },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      cloudId,
    },
    create: {
      userId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      cloudId,
    },
  });
};

export default passport;

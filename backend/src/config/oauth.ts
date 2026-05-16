import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from './database';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'mock_google_id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_google_secret',
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
  clientID: process.env.GITHUB_CLIENT_ID || 'mock_github_id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock_github_secret',
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

export default passport;

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/user.model';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await (User as any).findOne({ oauthId: profile.id, oauthProvider: 'google' });
    if (!user) {
      user = await (User as any).create({
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        oauthId: profile.id,
        oauthProvider: 'google',
        avatar: profile.photos?.[0]?.value,
        isVerified: true,
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
    let user = await (User as any).findOne({ oauthId: profile.id, oauthProvider: 'github' });
    if (!user) {
      user = await (User as any).create({
        name: profile.displayName || profile.username,
        email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
        oauthId: profile.id,
        oauthProvider: 'github',
        avatar: profile.photos?.[0]?.value,
        isVerified: true,
      });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await (User as any).findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;

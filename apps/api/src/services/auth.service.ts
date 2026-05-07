import { supabase } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import type { SignUpInput, SignInInput } from '@persona-chat/shared-types';

export class AuthService {
  /**
   * Sign up new user
   * Creates Supabase auth user + profile + gem wallet
   */
  async signUp(input: SignUpInput) {
    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user');
    }

    try {
      // Create profile
      const profile = await prisma.profile.create({
        data: {
          id: authData.user.id,
          email: input.email,
          displayName: input.displayName,
        },
      });

      // Create gem wallet with 200 free gems
      await prisma.gemWallet.create({
        data: {
          userId: profile.id,
          freeDailyGemAmount: 200,
        },
      });

      return {
        session: authData.session!,
        profile,
      };
    } catch (error) {
      // Rollback: delete Supabase user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(input: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session) {
      throw new Error(error?.message || 'Invalid credentials');
    }

    // Fetch profile
    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: {
        chosenLlmModel: true,
        gemWallet: true,
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      session: data.session,
      profile,
    };
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        chosenLlmModel: true,
        gemWallet: {
          select: {
            paidGemAmount: true,
            freeDailyGemAmount: true,
            freePromoGemAmount: true,
            freeDailyGemLastRefillDate: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile;
  }
}

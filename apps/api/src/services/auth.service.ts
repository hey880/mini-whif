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
      console.log('🔵 [SignUp] Starting transaction for user:', input.email);

      // Create profile, gem wallet, and initial gem log in a transaction
      const profile = await prisma.$transaction(async (tx) => {
        console.log('🔵 [SignUp] Step 1: Creating profile');
        // 1. Create profile
        const newProfile = await tx.profile.create({
          data: {
            id: authData.user!.id,
            email: input.email,
            displayName: input.displayName,
          },
        });
        console.log('✅ [SignUp] Profile created:', newProfile.id);

        console.log('🔵 [SignUp] Step 2: Creating gem wallet');
        // 2. Create gem wallet with 200 free daily gems
        const wallet = await tx.gemWallet.create({
          data: {
            userId: newProfile.id,
            freeDailyGemAmount: 200,
          },
        });
        console.log('✅ [SignUp] Wallet created:', wallet.id, 'with', wallet.freeDailyGemAmount, 'gems');

        console.log('🔵 [SignUp] Step 3: Creating initial gem log');
        // 3. Create initial gem log for signup bonus
        const gemLog = await tx.gemLog.create({
          data: {
            userId: newProfile.id,
            amount: 200,
            gemType: 'free_daily',
            logType: 'daily_refill',
            balanceAfter: 200, // 회원가입 시 첫 충전이므로 총 잔액 = 200
            memo: '회원가입 축하 보너스',
          },
        });
        console.log('✅ [SignUp] Gem log created:', gemLog.id, 'amount:', gemLog.amount);

        return newProfile;
      });

      console.log('✅ [SignUp] Transaction completed successfully');

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

  /**
   * Ensure profile exists for OAuth users
   * Creates profile + gem wallet if not exists (idempotent)
   */
  async ensureProfile(userId: string) {
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        gemWallet: true,
      },
    });

    if (existingProfile) {
      console.log('✅ [EnsureProfile] Profile already exists for user:', userId);
      return existingProfile;
    }

    console.log('🔵 [EnsureProfile] Creating profile for OAuth user:', userId);

    // Fetch user data from Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      throw new Error('Failed to fetch user from auth');
    }

    const email = authUser.user.email!;
    const displayName =
      authUser.user.user_metadata?.display_name ||
      authUser.user.user_metadata?.full_name ||
      email.split('@')[0];

    // Create profile, gem wallet, and initial gem log in a transaction
    const profile = await prisma.$transaction(async (tx) => {
      console.log('🔵 [EnsureProfile] Step 1: Creating profile');
      const newProfile = await tx.profile.create({
        data: {
          id: userId,
          email,
          displayName,
          avatarUrl: authUser.user.user_metadata?.avatar_url || null,
        },
      });
      console.log('✅ [EnsureProfile] Profile created:', newProfile.id);

      console.log('🔵 [EnsureProfile] Step 2: Creating gem wallet');
      const wallet = await tx.gemWallet.create({
        data: {
          userId: newProfile.id,
          freeDailyGemAmount: 200,
        },
      });
      console.log('✅ [EnsureProfile] Wallet created:', wallet.id);

      console.log('🔵 [EnsureProfile] Step 3: Creating initial gem log');
      await tx.gemLog.create({
        data: {
          userId: newProfile.id,
          amount: 200,
          gemType: 'free_daily',
          logType: 'daily_refill',
          balanceAfter: 200,
          memo: '회원가입 축하 보너스',
        },
      });
      console.log('✅ [EnsureProfile] Gem log created');

      return newProfile;
    });

    console.log('✅ [EnsureProfile] Transaction completed successfully');
    return profile;
  }

  /**
   * Delete user account
   * Deletes profile data and Supabase auth user
   */
  async deleteAccount(userId: string) {
    // Delete profile (cascade deletes related data)
    await prisma.profile.delete({
      where: { id: userId },
    });

    // Delete Supabase auth user
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(error.message || 'Failed to delete auth user');
    }

    return { success: true };
  }
}

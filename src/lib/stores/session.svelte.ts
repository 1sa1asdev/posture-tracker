import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import type { Profile } from '$lib/types';

class SessionStore {
  session = $state<Session | null>(null);
  user    = $state<User | null>(null);
  profile = $state<Profile | null>(null);
  loading = $state(true);
  ready   = $state(false);

  async init() {
    const { data } = await supabase.auth.getSession();
    this.session = data.session;
    this.user    = data.session?.user ?? null;
    await this.loadProfile();
    this.loading = false;
    this.ready   = true;

    supabase.auth.onAuthStateChange(async (_event, sess) => {
      this.session = sess;
      this.user    = sess?.user ?? null;
      if (sess?.user) await this.loadProfile();
      else this.profile = null;
    });
  }

  private async loadProfile() {
    if (!this.user) { this.profile = null; return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .eq('id', this.user.id)
      .maybeSingle();
    this.profile = data as Profile | null;
  }

  async signOut() {
    await supabase.auth.signOut();
    this.session = null;
    this.user    = null;
    this.profile = null;
  }
}

export const session = new SessionStore();

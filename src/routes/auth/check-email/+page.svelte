<script lang="ts">
  import { base } from '$app/paths';
</script>

<div class="card-xl p-6 text-center flex flex-col gap-3">
  <div class="text-3xl">📬</div>
  <h1 class="text-base font-semibold">Check your email</h1>
  <p class="text-[13px] text-text2 leading-relaxed">
    We sent a confirmation link to your inbox. Click it to activate your account, then sign in.
  </p>
  <a href="{base}/auth/signin" class="btn-ghost mt-2">Back to sign in</a>
</div>

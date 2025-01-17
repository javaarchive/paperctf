import GitHub from '@auth/core/providers/github'
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { defineConfig } from 'auth-astro'
import { db } from './src/lib/db'
import type { Provider } from '@auth/core/providers';
import { getAuthMethod, getEnv } from './src/lib/auth';
import { accounts, users, sessions, verificationTokens } from './src/db/schema';

let providers: Provider[] = [];

if(getAuthMethod("github")) {
    const method = getAuthMethod("github");
    providers.push(GitHub({
        clientId: method?.extras.clientId,
        clientSecret: getEnv("GITHUB_CLIENT_SECRET"),
    }));
}

export default defineConfig({
	providers: providers,
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
})
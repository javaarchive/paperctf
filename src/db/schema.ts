import { db } from "../lib/db";
import { int, integer, sqliteTable, text, primaryKey, unique } from "drizzle-orm/sqlite-core";

// begin accounts schema
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import type { AdapterAccountType } from "@auth/core/adapters"
import { relations } from "drizzle-orm";
 
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  disabled: integer({ mode: 'boolean' }).default(false),
  hidden: integer({ mode: 'boolean' }).default(false),
  teamId: text("teamId")
})

export type User = typeof users.$inferSelect;
 
export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)
 
export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
})
 
export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
)
 
export const authenticators = sqliteTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: integer("credentialBackedUp", {
      mode: "boolean",
    }).notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  })
)

export const teams = sqliteTable("team", {
  id: text("id").primaryKey(), // .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  hidden: integer({ mode: 'boolean' }).default(false),
  joinCode: text("joinCode").unique().$defaultFn(() => crypto.randomUUID()),
  calculatedPoints: integer("calculatedPoints").notNull().default(0),
});

export type Team = typeof teams.$inferSelect;

export const teamsRelations = relations(users, ({ one }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  })
}));

export const teamUsersRelations = relations(teams, ({many}) => ({
  users: many(users),
}));

export const challengeSubmissions = sqliteTable("challenge_submission", {
  teamId: text("teamId").notNull(),
  type: text("type").notNull(),
  answer: text("answer").notNull(),
  challengeId: text("challengeId").notNull(),
  rawScore: integer("rawScore").notNull(), // preprostprocessing
  correct: integer({ mode: 'boolean' }).notNull(),
  submissionId: text("submissionId").primaryKey().$defaultFn(() => crypto.randomUUID()),
  submittedAt: integer("submittedAt", { mode: "timestamp_ms" }).notNull(),
});

export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;

export const challengeAttemptState  = sqliteTable("challenge_attempt_state", {
  teamId: text("teamId").notNull(),
  challengeId: text("challengeId").notNull(),
  attemptId: text("attemptId").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bestSubmissionId: text("bestSubmissionId").notNull(),
  finalScore: integer("finalScore").notNull(), // this can be a score after some postprocessing, e.g. dynamic scoring
}, (t) => ({
  unq: unique().on(t.teamId, t.challengeId),
}));

export type ChallengeAttemptState = typeof challengeAttemptState.$inferSelect;
export type ChallengeAttemptStateCreate = typeof challengeAttemptState.$inferInsert;

export const challengeAttemptRelations = relations(challengeAttemptState, ({one}) => ({
  bestSubmission: one(challengeSubmissions, {
    fields: [challengeAttemptState.bestSubmissionId],
    references: [challengeSubmissions.challengeId],
  }),
}));
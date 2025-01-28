import { and, eq } from "drizzle-orm";
import { challengeAttemptState, challengeSubmissions, teams, users, type ChallengeAttemptState, type ChallengeAttemptStateCreate, type ChallengeSubmission, type Team, type User } from "../db/schema";
import { db } from "./db";

import { getCollection } from 'astro:content';
import type { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export class CTFUser {
    static async getUser(id: string): Promise<CTFUser> {
        let user = (await db.select().from(users).where(eq(users.id, id)))[0];
        if(!user) throw new Error("User not found");
        return new CTFUser(user);
    }

    user: User;
    
    constructor(user: User) {
        this.user = user;
    }

    async update(){
        await db.update(users).set(this.user).where(eq(users.id, this.user.id));
    }

    get id(){
        return this.user.id;
    }

    get disabled(){
        return this.user.disabled;
    }

    async ensureTeam(){
        if(!this.user.teamId){
            const team = await this.createSelfTeam();
            this.user.teamId = team.id;
            await this.update();
        }
    }

    async createSelfTeam(): Promise<CTFTeam> {
        return await CTFTeam.createTeam(this.user.name || "Untitled User Team", this.user.id);
    }

    async joinTeam(team: CTFTeam){
        this.user.teamId = team.id;
        await this.update();
    }
}

export class CTFTeam {

    team: Team;

    static async createTeam(name: string = "Untitled Team", id: string = crypto.randomUUID()): Promise<CTFTeam> {
        let team = (await db.insert(teams).values({
            id: id,
            name: name,
        }).returning())[0];

        return new CTFTeam(team);
    }

    static async getTeam(id: string): Promise<CTFTeam> {
        let team = (await db.select().from(teams).where(eq(teams.id, id)))[0];
        if(!team) throw new Error("Team not found");
        return new CTFTeam(team);
    }

    static async findTeamByJoinCode(joinCode: string): Promise<CTFTeam | null> {
        let team = (await db.select().from(teams).where(eq(teams.joinCode, joinCode)))[0];
        if(!team) return null;
        return new CTFTeam(team);
    }

    constructor(team: Team) {
        this.team = team;
    }

    async update(){
        await db.update(teams).set(this.team).where(eq(teams.id, this.team.id));
    }

    get id(){
        return this.team.id;
    }

    get name(){
        return this.team.name;
    }

    async setName(name: string){
        this.team.name = name;
        await this.update();
    }

    async updateJoinCode(newCode: string){
        // db will autoreject on conflict
        this.team.joinCode = newCode;
        await this.update();
    }

    async fetchMembers(): Promise<CTFUser[]>{
        return (await db.select().from(users).where(eq(users.teamId, this.id))).map(user => new CTFUser(user));
    }
}

interface CTFChallengeFrontmatter {
    title: string;
    description: string;
    id: string;
    flag: string;
    hint?: string;
    points: number;
    category: string;
    dynamic?: number;
}

const challenges = (await getCollection("challenges"));

// no database mapping
export class CTFChallenge {

    challenge: typeof challenges[number];

    constructor(challenge: typeof challenges[number]){
        this.challenge = challenge;
    }

    get frontmatter(): CTFChallengeFrontmatter {
        return this.challenge.data as CTFChallengeFrontmatter;
    }

    get id(){
        return this.frontmatter.id;
    }

    get title(){
        return this.frontmatter.title;
    }

    get description(){
        return this.frontmatter.description;
    }

    get hint(){
        return this.frontmatter.hint;
    }

    get points(){
        return this.frontmatter.points;
    }

    calculatePoints(inputPoints: number, solveCount: number){
        const isDynamic = "dynamic" in this.frontmatter;
        // here is a fake version for placeholder testing
        // TODO: add algos
        if(isDynamic){
            return Math.max(inputPoints - solveCount, this.frontmatter.dynamic);
        }else{
            return inputPoints;
        }
    }

    async update(tx: any){ // TODO: find type of tx
        const submissions = await tx.select().from(challengeSubmissions).where(and(eq(challengeSubmissions.challengeId, this.id), eq(challengeSubmissions.correct, true)));
        const solveCount = submissions.length;
        const ctfTeams: CTFTeam[] = [];
        for(let submission of submissions){
            const finalScore = this.calculatePoints(submission.rawScore, solveCount);
            await tx.update(challengeSubmissions).set({
                finalScore: finalScore,
            });
            // TODO: optimizze query?
            const teamData = (await tx.select().from(teams).where(eq(teams.id, submission.teamId)))[0];
            ctfTeams.push(new CTFTeam(teamData));
        }
        
    }
}

export class CTFChallengeSubmission {
    
    submission: ChallengeSubmission;

    constructor(submission: ChallengeSubmission){
        this.submission = submission;
    }

    static async getSubmissionByChallenge(params: ChallengeSubmission): Promise<CTFChallengeSubmission> {
        let submissionData = (await db.select().from(challengeSubmissions).where(and(eq(challengeSubmissions.teamId, params.teamId),eq(challengeSubmissions.challengeId, params.challengeId))))[0];
        if(!submissionData) throw new Error("Submission could not be found");
        return new CTFChallengeSubmission(submissionData);
    }

    static async getSubmissionById(params: ChallengeSubmission): Promise<CTFChallengeSubmission> {
        let submissionData = (await db.select().from(challengeSubmissions).where(and(eq(challengeSubmissions.teamId, params.teamId),eq(challengeSubmissions.submissionId, params.submissionId))))[0];
        if(!submissionData) throw new Error("Submission could not be found");
        return new CTFChallengeSubmission(submissionData);
    }

    async syncToAttempt(){
        const attempt = await CTFChallengeAttempt.getAttempt({
            teamId: this.submission.teamId,
            challengeId: this.submission.challengeId,
            bestSubmissionId: this.submission.submissionId,
            finalScore: 0,
        });
        await db.transaction(async (tx) => {
            const previousSubmissionData = await tx.select().from(challengeSubmissions).where(eq(challengeSubmissions.submissionId, this.submission.submissionId));
            if(previousSubmissionData.length > 0){
                // if we are better
                if(this.submission.rawScore <= previousSubmissionData[0].rawScore){
                    return; // cancel if this would make raw score worse
                }
            }

            await tx.update(challengeAttemptState).set({
                bestSubmissionId: this.submission.submissionId,
            });
        });
    }
}

export class CTFChallengeAttempt {
    
    attempt: ChallengeAttemptState;

    constructor(attempt: ChallengeAttemptState){
        this.attempt = attempt;
    }

    static async createAttempt(creationParams: ChallengeAttemptStateCreate) {
        let attemptData = (await db.insert(challengeAttemptState).values(creationParams).returning())[0];
        return new CTFChallengeAttempt(attemptData);
    }

    static async getAttempt(params: ChallengeAttemptStateCreate): Promise<CTFChallengeAttempt> {
        try{
            return (await this.createAttempt(params));
        }catch(ex){
            let attemptData = (await db.select().from(challengeAttemptState).where(and(eq(challengeAttemptState.teamId, params.teamId),eq(challengeAttemptState.challengeId, params.challengeId))))[0];
            if(!attemptData) throw new Error("this shouldn't happen, attempt could not be found or created");
            return new CTFChallengeAttempt(attemptData);
        }
    }
}
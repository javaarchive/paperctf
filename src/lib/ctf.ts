import { eq } from "drizzle-orm";
import { teams, users, type Team, type User } from "../db/schema";
import { db } from "./db";


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
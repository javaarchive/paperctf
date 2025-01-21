import type { Session } from "@auth/core/types";
import { getSession } from "auth-astro/server";
import { CTFUser } from "./ctf";

export async function getCTFSession(request: Request): Promise<Session | null> {
    const session = await getSession(request);
    if(!session) return session;

    console.log(session);

    return session;
}

export async function getCTFUser(request: Request): Promise<CTFUser | null> {
    const session = await getCTFSession(request);
    if(!session || !session.user || !session.user.id) return null;
    const user = await CTFUser.getUser(session.user?.id);
    if(user) await user.ensureTeam();
    return user;
}
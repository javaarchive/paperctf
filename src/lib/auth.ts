import { loadEnv } from "vite";
// @ts-ignore
const isSSR: boolean = import.meta && import.meta["env"] && import.meta.env["SSR"];

if(!isSSR){
    (await import("dotenv")).config();
}

export function getEnv(key: string) {
    // @ts-ignore
    if(import.meta && import.meta["env"] && key in import.meta.env){
        // @ts-ignore
        return import.meta.env[key];
    }
    if(typeof process != "undefined" && process.env && key in process.env){
        return process.env[key];
    }
}

interface AuthMethod {
    name: string;
    id: string;
    extras?: any;
}

let methods: AuthMethod[] = [];

export function getAuthMethod(id: string): AuthMethod | undefined {
    return methods.find((method) => method.id === id);
}

if(getEnv("PUBLIC_GITHUB_CLIENT_ID")){
    methods.push({
        name: "GitHub",
        id: "github",
        extras: {
            clientId: getEnv("PUBLIC_GITHUB_CLIENT_ID"), 
        }
    });
}
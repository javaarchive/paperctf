import { getEnv } from "./config";

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

export default methods;
export {methods};
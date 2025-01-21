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

interface SiteConfig { 
    brand: string;
    blockInternalPages: boolean;
}

function getConfig(){
    return {
        brand: getEnv("PUBLIC_BRAND") || "A PaperCTF experience",
        blockInternalPages: getEnv("PUBLIC_BLOCK_INTERNAL_PAGES") === "true"
    }
}

export const globalConfig = getConfig();
export default globalConfig;
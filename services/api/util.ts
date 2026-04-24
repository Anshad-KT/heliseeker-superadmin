import { AxiosError, AxiosResponse } from "axios";
import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

export class BuildUrl {
    supabase(endpoint: string) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_URL) {
            throw new Error("Missing Supabase Service URL");
        }
        const url = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_URL;
        return url + endpoint;
    }
}

export class Supabase {
    private readonly supabaseUrl: string;
    private readonly supabaseKey: string;
    protected readonly supabase;
    constructor() {

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("Supabase environment variables are missing. Please set SUPABASE_URL and SUPABASE_KEY.");
        }
        this.supabaseUrl = SUPABASE_URL;
        this.supabaseKey = SUPABASE_KEY;
        this.supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!,
            {
                cookieOptions: {
                    name: SUPABASE_AUTH_COOKIE_NAME,
                },
            }
        );
        return this;
    }
}

export type IResponse = {
    message: string;
    data?: any;
};

export function adaptSuccessResponse(response: AxiosResponse): IResponse {
    return {
        message: response?.data?.message || "Success",
        data: response?.data?.data,
    };
}
export function adaptErrorResponse(
    error: AxiosError<{ message?: string }>
): string {
    return error?.response?.data?.message || "Error";
} 

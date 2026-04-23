import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://imahabmsgxqkjkrzlapt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWhhYm1zZ3hxa2prcnpsYXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjQwNTksImV4cCI6MjA5MjUwMDA1OX0.K0MAI1aqZckFJ6KohWU4l5DM6XK2K4j20y2WcyK3hnw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
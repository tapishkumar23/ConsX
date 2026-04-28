import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  try {
    const res = await fetch(
      "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics"
    );

    const text = await res.text();

    const events = text.split("BEGIN:VEVENT").slice(1);

    const holidays = events.map((e) => {
      const summary = e.match(/SUMMARY:(.*)/)?.[1];
      const dateRaw = e.match(/DTSTART;VALUE=DATE:(\d+)/)?.[1];

      if (!summary || !dateRaw) return null;

      const date = `${dateRaw.slice(0,4)}-${dateRaw.slice(4,6)}-${dateRaw.slice(6,8)}`;

      return {
        id: `IN-${date}`,
        title: `🇮🇳 ${summary}`,
        date,
        country: "IN",
      };
    }).filter(Boolean);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("holidays").upsert(holidays);

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }));
  }
});
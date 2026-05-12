import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { X, Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  banner_color: string;
  created_at: string;
  expires_at: string | null;

  target_type: string;
  target_users: string[] | null;
}

const AnnouncementBanner = ({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

useEffect(() => {
  fetchAnnouncements();

  const channel = supabase
    .channel("announcements-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "announcements",
      },
      () => {
        fetchAnnouncements();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [role, userId]);

const fetchAnnouncements = async () => {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

if (data) {
  const filtered = data.filter((announcement) => {

    // CEO can see ALL announcements
    if (role === "ceo") {
      return true;
    }

    // company-wide announcements
    if (announcement.target_type === "all") {
      return true;
    }

    // selected employees only
    if (
      announcement.target_type === "selected" &&
      announcement.target_users?.includes(userId)
    ) {
      return true;
    }

    return false;
  });

  setAnnouncements(filtered);
}
};

const handleDelete = async (id: string) => {
  const confirmDelete = window.confirm(
    "Delete this announcement?"
  );

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
    return;
  }

  setAnnouncements((prev) =>
    prev.filter((a) => a.id !== id)
  );
};

  return (
    <div className="space-y-4">

         {announcements.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500">
            No announcements available
        </div>
        )}
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="relative overflow-hidden rounded-2xl shadow-lg border border-white/10"
            style={{
              background: `linear-gradient(135deg, ${announcement.banner_color}, #111827)`,
            }}
          >
            {/* Glow */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_40%)]"></div>

            <div className="relative p-5 sm:p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                    <Megaphone size={22} />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-semibold">
                        {announcement.title}
                      </h2>

                      <span className="px-2 py-1 text-xs rounded-full bg-white/10 border border-white/20 uppercase tracking-wide">
                        {announcement.priority}
                      </span>
                    </div>

                    <p className="mt-2 text-sm sm:text-base text-gray-100/90 leading-relaxed">
                      {announcement.description}
                    </p>

                    <div className="mt-4 text-xs text-gray-300">
                      Posted on{" "}
                      {new Date(announcement.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {role === "ceo" && (
                    <button
                        onClick={() => handleDelete(announcement.id)}
                        className="hover:bg-white/10 p-2 rounded-lg transition"
                    >
                        <X size={18} />
                    </button>
                    )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default AnnouncementBanner;
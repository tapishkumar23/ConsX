import { useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleReset = async () => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated successfully!");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6]">
      <div className="bg-white p-8 rounded-2xl w-[380px] shadow-sm">
        <h2 className="text-xl font-semibold mb-6">
          Reset Password
        </h2>

        <input
          type="password"
          placeholder="New Password"
          className="border p-2 w-full mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-[#0B3D2E] text-white py-2 rounded"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
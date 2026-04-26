import { useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleAuth = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password || (isSignup && !name)) {
      setErrorMsg("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        // ✅ SIGNUP
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { error: dbError } = await supabase.from("users").upsert({
            id: data.user.id,
            email: data.user.email || email,
            name,
          });

          if (dbError) {
            console.error("DB ERROR:", dbError);
            setErrorMsg("Account created but profile not saved");
            return;
          }
        }

        setSuccessMsg("Account created successfully! Please sign in.");
        setIsSignup(false);
      } else {
        // ✅ SIGNIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/");
      }
    } catch (err: any) {
      console.error("AUTH ERROR:", err);
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6]">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-[380px] shadow-sm">

        <h2 className="text-xl font-semibold text-[#0B3D2E] mb-6">
          {isSignup ? "Create Account" : "Sign In"}
        </h2>

        {/* ✅ Error Message */}
        {errorMsg && (
          <p className="text-red-500 text-sm mb-3">{errorMsg}</p>
        )}

        {/* ✅ Success Message */}
        {successMsg && (
          <p className="text-green-600 text-sm mb-3">{successMsg}</p>
        )}

        {isSignup && (
          <input
            className="border p-2 w-full mb-3 rounded"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border p-2 w-full mb-4 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-[#0B3D2E] text-white py-2 rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : isSignup
            ? "Sign Up"
            : "Sign In"}
        </button>

        <p className="text-sm mt-4 text-center text-gray-600">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <span
            className="text-[#0B3D2E] cursor-pointer font-medium"
            onClick={() => {
              setIsSignup(!isSignup);
              setErrorMsg("");
              setSuccessMsg("");
            }}
          >
            {isSignup ? "Sign In" : "Create Account"}
          </span>
        </p>

      </div>
    </div>
  );
};

export default Auth;
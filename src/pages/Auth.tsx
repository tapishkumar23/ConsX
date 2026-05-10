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
  const [forgotMode, setForgotMode] = useState(false);

  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://office.altruitymarketinggroup.com//reset-password",
      });

      if (error) throw error;

      setSuccessMsg("Password reset email sent!");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center px-4 pt-4 sm:pt-16 bg-[linear-gradient(115deg,#F4E2B8_0%,#EFD39A_35%,#E8EEE9_58%,#DDE9E4_78%,#D1E2DA_100%)]">
  

      {/* ✅ Logo OUTSIDE the card */}
      <img
        src="\altruity_marketing_group_wordmark_print.png"
        alt="Altruity Marketing Group"
        className="h-28 sm:h-24 md:h-28 w-auto object-contain mb-3 sm:mb-8 relative z-10"
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/85 backdrop-blur-xl shadow-[0_10px_40px_rgba(11,61,46,0.10)] p-6 sm:p-8">

        <h2 className="text-xl font-semibold text-[#0B3D2E] mb-6">
          {isSignup ? "Create Account" : "Sign In"}
        </h2>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-3">{errorMsg}</p>
        )}

        {successMsg && (
          <p className="text-green-600 text-sm mb-3">{successMsg}</p>
        )}

        {isSignup && (
          <input
            className="w-full mb-3 rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[#0B3D2E] focus:ring-2 focus:ring-[#0B3D2E]/10"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="w-full mb-3 rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[#0B3D2E] focus:ring-2 focus:ring-[#0B3D2E]/10"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {!forgotMode && (
          <input
            type="password"
            className="w-full mb-4 rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[#0B3D2E] focus:ring-2 focus:ring-[#0B3D2E]/10"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {!isSignup && !forgotMode && (
          <p
            onClick={() => {
              setForgotMode(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-sm text-[#0B3D2E] cursor-pointer mb-4"
          >
            Forgot Password?
          </p>
        )}

        <button
          onClick={forgotMode ? handleForgotPassword : handleAuth}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[#0B3D2E] to-[#145443] py-3 text-white font-medium shadow-lg shadow-[#0B3D2E]/20 transition hover:scale-[1.01] hover:shadow-xl disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : forgotMode
            ? "Send Reset Link"
            : isSignup
            ? "Sign Up"
            : "Sign In"}
        </button>

        <p className="text-sm mt-4 text-center text-gray-600">
          {forgotMode ? (
            <span
              className="text-[#0B3D2E] cursor-pointer font-medium"
              onClick={() => {
                setForgotMode(false);
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              Back to Sign In
            </span>
          ) : (
            <>
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
            </>
          )}
        </p>

      </div>
    </div>
  );
};

export default Auth;
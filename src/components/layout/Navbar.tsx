const Navbar = () => {
  return (
    <div className="relative h-16 flex items-center justify-between px-6 text-white shadow-sm">

      {/* Base green */}
      <div className="absolute inset-0 bg-[#0B3D2E]"></div>

      {/* White fade from both sides */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40"></div>

      {/* Content */}
      <div className="relative w-full flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Dashboard
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/90">User</span>
          <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
        </div>
      </div>

    </div>
  );
};

export default Navbar;
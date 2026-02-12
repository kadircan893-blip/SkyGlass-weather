
type Props = {
  muted: boolean;
  onToggleMute: () => void;
};

export default function Header({ muted, onToggleMute }: Props) {
  return (
    <div className="w-full flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold">SkyGlass Weather</h1>
        <p className="text-sm text-white/60">Turkey Cities • Live Weather</p>
      </div>

      <button
        onClick={onToggleMute}
        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/20"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

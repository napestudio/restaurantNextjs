export default function SushiLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 bg-white rounded-full border-2 border-green-950 p-1 animate-bounce">
        <div className="rounded-full bg-red-400 h-full w-full"></div>
      </div>
      <div className="h-7 w-7 bg-white rounded-full border-2 border-green-950 p-1 animate-bounce delay-75">
        <div className="rounded-full bg-red-400 h-full w-full"></div>
      </div>
      <div className="h-7 w-7 bg-white rounded-full border-2 border-green-950 p-1 animate-bounce">
        <div className="rounded-full bg-red-400 h-full w-full"></div>
      </div>
    </div>
  );
}

export type IncidentType = "accident" | "roadwork" | "closure" | "hazard" | "congestion";
export type NavigationCommandType = "start" | "stop" | "reroute" | "mute" | "unmute";

export function parseVoiceCommand(transcript: string): NavigationCommandType | null {
  const lower = transcript.toLowerCase();
  if (lower.includes("start")) return "start";
  if (lower.includes("stop")) return "stop";
  if (lower.includes("reroute")) return "reroute";
  if (lower.includes("mute")) return "mute";
  if (lower.includes("unmute")) return "unmute";
  return null;
}

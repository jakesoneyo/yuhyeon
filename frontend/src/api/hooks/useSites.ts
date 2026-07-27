import { useQuery } from "@tanstack/react-query";
import { fetchSites } from "../sites";

// WebSocket 없이 "준실시간"을 흉내내는 폴링 간격(SPEC §6 Out — WebSocket 이번 범위 아님).
const POLL_INTERVAL_MS = 10_000;

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

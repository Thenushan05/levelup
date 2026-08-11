import type { Metadata } from "next";
import { getPlayerStatus } from "@/actions/player";
import { PlayerStatusView } from "./player-status-view";

export const metadata: Metadata = { title: "Player — ASCEND" };

export default async function PlayerPage() {
  const status = await getPlayerStatus();
  return <PlayerStatusView status={status} />;
}

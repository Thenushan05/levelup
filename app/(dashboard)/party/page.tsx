import type { Metadata } from "next";
import { getMyParty, getPartyMembers, getPartyActivity, getLeaderboard, getLevelLeaderboard } from "@/actions/party";
import { PartyView } from "./party-view";
import { CreateJoinParty } from "./create-join-party";

export const metadata: Metadata = { title: "Party — ASCEND" };

export default async function PartyPage() {
  const party = await getMyParty();
  if (!party) return <CreateJoinParty />;

  const [members, activity, leaderboard, levelLeaderboard] = await Promise.all([
    getPartyMembers(party.id),
    getPartyActivity(party.id),
    getLeaderboard(party.id),
    getLevelLeaderboard(party.id),
  ]);

  return (
    <PartyView
      party={party}
      members={members}
      activity={activity}
      leaderboard={leaderboard}
      levelLeaderboard={levelLeaderboard}
    />
  );
}

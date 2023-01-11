import { LolApi, Constants } from "twisted";

const api = new LolApi({
  key: process.env.RIOT_API_KEy,
});

export async function summonerByName(name: string) {
  return await api.Summoner.getByName(name, Constants.Regions.EU_WEST);
}

export async function summonerRank(id: string) {
  return await api.League.bySummoner(id, Constants.Regions.EU_WEST);
}

import Logger from "./logger";

interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  icon: number;
}

export default class Riot {
  static baseUrl = "https://euw1.api.riotgames.com/lol/";

  static async doRequest<T>(url: string): Promise<T | false> {
    const request = await fetch(url + `?api_key=${process.env.RIOT_API_KEY}`);

    if (request.status !== 200) {
      Logger.Error(
        `Something went wrong performing the request with URL: ${url}\nStatus code: ${request.status}`
      );
      return false;
    }

    return (await request.json()) as T;
  }

  static async getSummonerByName(name: string): Promise<Summoner | false> {
    const url =
      Riot.baseUrl +
      `summoner/v4/summoners/by-name/${encodeURI(name.toLowerCase())}`;

    const summonerRequest: Summoner | false = await Riot.doRequest<Summoner>(
      url
    );

    if (!summonerRequest) return false;

    return summonerRequest;
  }
}

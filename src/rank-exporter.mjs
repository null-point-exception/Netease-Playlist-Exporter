/**
 * NetEase Cloud Music listening rank exporter.
 *
 * /user/account
 *   -> get current logged-in user's uid
 *
 * /user/record
 *   type=0 -> allData
 *   type=1 -> weekData
 */

function normalizeRankItem(item, index) {
  const song = item?.song || {};

  const artists =
    song.ar ||
    song.artists ||
    [];

  const album =
    song.al ||
    song.album ||
    {};

  return {
    rank: index + 1,

    score:
      item?.score ??
      "",

    play_count:
      item?.playCount ??
      item?.playcount ??
      item?.count ??
      "",

    song_id:
      item?.songId ??
      song?.id ??
      "",

    song_name:
      song?.name ??
      item?.songName ??
      "",

    artist_names: artists
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(" / "),

    artist_ids: artists
      .map((artist) => artist?.id)
      .filter((id) => id !== undefined && id !== null)
      .join(" / "),

    album_name:
      album?.name ??
      "",

    album_id:
      album?.id ??
      "",

    duration_ms:
      song?.dt ??
      song?.duration ??
      "",

    source_url:
      song?.id
        ? `https://music.163.com/song?id=${song.id}`
        : ""
  };
}

export async function exportRank(api, options = {}) {
  const type = options.type === "week" ? 1 : 0;

  /*
   * 先获取当前登录用户 UID
   */
  console.log("[1/3] Fetch logged-in account...");

  const account = await api.get("/user/account");

  if (account?.code !== 200) {
    throw new Error(
      `Unable to get account information: ${JSON.stringify(account)}`
    );
  }

  const uid = account?.account?.id;

  if (!uid) {
    throw new Error(
      `Logged-in account did not return uid: ${JSON.stringify(account)}`
    );
  }

  console.log(`      UID: ${uid}`);

  /*
   * 再请求播放记录
   */
  console.log(
    `[2/3] Fetch listening record: type=${type}`
  );

  const data = await api.get("/user/record", {
    uid,
    type
  });

  if (data?.code !== 200) {
    throw new Error(
      `Unexpected API response: ${JSON.stringify(data)}`
    );
  }

  const sourceData =
    type === 1
      ? data.weekData
      : data.allData;

  if (!Array.isArray(sourceData)) {
    throw new Error(
      `API did not return ${
        type === 1 ? "weekData" : "allData"
      }.`
    );
  }

  /*
   * 转换成适合 CSV / JSON 长期保存的数据
   */
  const rows = sourceData.map(
    (item, index) =>
      normalizeRankItem(item, index)
  );

  console.log(
    `[3/3] Records received: ${rows.length}`
  );

  return {
    uid,

    type:
      type === 1
        ? "week"
        : "all",

    apiType: type,

    count: rows.length,

    rows,

    raw: data
  };
}
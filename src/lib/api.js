const needle = require("needle");
const rp = require("request-promise");
const config = require("../config");

export async function retry(promise) {
  let retries = 0;
  while (retries < 100) {
    try {
      const resp = await promise;
      return resp;
    } catch (e) {
      retries++;
      console.log(e);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  throw new Error("Server timeout");
}

export async function getDownload(youtubeID, files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = `${config.api}/download/${youtubeID}/${file.name}${file.ext}`;
    const buffer = await retry(rp(url, { encoding: null }));
    files[i].buffer = buffer;
  }
  return files;
}

export async function getSplitAlign(youtubeID) {
  const url = `${config.api}/split-align-queue-result-v2/${youtubeID}`;

  for (let i = 0; i < 100; i++) {
    const response = await retry(rp(url, { json: true }));
    if (response) {
      return response;
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error("Server timeout");
}

export async function postSplitAlign(youtubeID, audio, lyrics, language) {
  if (!youtubeID) throw new Error("youtubeID is empty");
  if (!audio) throw new Error("audio is empty");

  const url = `${config.api}/split-align-queue/${youtubeID}`;

  let data = {};

  data.audio = {
    buffer: audio,
    filename: "audio",
    content_type: "application/octet-stream",
  };

  if (lyrics) {
    data.lang = language;
    data.transcript = {
      buffer: Buffer.from(lyrics, "utf8"),
      filename: "transcript",
      content_type: "application/octet-stream",
    };
  }

  const response = await needle("post", url, data, {
    multipart: true,
    user_agent: "Youka",
  });

  if (response.statusCode !== 204) {
    throw new Error(
      "The server is too busy at the moment. please try again later"
    );
  }
}

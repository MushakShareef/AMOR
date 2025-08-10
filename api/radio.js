export const config = {
  runtime: 'nodejs', // force Node.js instead of Edge
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch("https://omshanti.in/amudhamazhai");

    if (!response.ok) {
      throw new Error(`Stream request failed with status ${response.status}`);
    }

    res.setHeader("Content-Type", "audio/mpeg");

    // Pipe the audio stream directly to the client
    response.body.on('error', err => {
      console.error('Stream error:', err);
      res.end();
    });

    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching radio stream");
  }
}

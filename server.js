const express = require('express');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3000;

// API ကို အကြိမ်ကြိမ်မခေါ်ရအောင် 30 စက္ကန့် Cache ထားမယ်
const cache = new NodeCache({ stdTTL: 30 });

// ⚠️ မင်းပေးထားတဲ့ API URL အသစ် (Raw URL)
const API_URL = 'https://raw.githubusercontent.com/appeton778-coder/mmServer/main/mmserver_data.json';

// ---------------------------------------------------
// JSON Data ကို M3U Playlist အဖြစ် ပြောင်းလဲပေးမယ့် Function
// ---------------------------------------------------
function generateM3U(matches) {
  let m3u = '#EXTM3U\n';
  m3u += '#EXTENC:UTF-8\n'; // မြန်မာစာ အမှန်ပြဖို့ UTF-8 သတ်မှတ်ခြင်း

  for (const match of matches) {
    // Live ဖြစ်နေတဲ့ ပွဲတွေကိုပဲ ယူချင်ရင် အောက်က line ကို ဖြုတ်ပါ (Uncomment လုပ်ပါ)
    // if (match.match_status === false) continue;

    const home = match.home_name || 'Home Team';
    const away = match.away_name || 'Away Team';
    const logo = match.home_img || ''; 
    const league = match.league || 'Live Sports';
    const status = match.status || 'LIVE';
    
    let streamUrl = '';
    if (match.links && Array.isArray(match.links) && match.links.length > 0) {
      streamUrl = match.links[0].url;
    }

    if (!streamUrl) continue;

    const displayName = `[${league}] ${home} vs ${away} | ${status}`;
    m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${league}",${displayName}\n`;
    m3u += `${streamUrl}\n`;
  }

  return m3u;
}

// ---------------------------------------------------
// Route: /playlist.m3u
// ---------------------------------------------------
app.get('/playlist.m3u', async (req, res) => {
  try {
    let cachedM3U = cache.get('m3u_playlist');
    
    if (cachedM3U) {
      res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
      return res.send(cachedM3U);
    }

    console.log('Fetching new data from GitHub API...');
    const response = await fetch(API_URL, {
      headers: { 'User-Agent': 'IPTV-Proxy/1.0' }
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    const m3uContent = generateM3U(data);

    cache.set('m3u_playlist', m3uContent);

    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(m3uContent);

  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).send(`#EXTM3U\n#EXTINF:-1,Error: ${err.message}`);
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'IPTV Proxy is running',
    playlist_url: `http://localhost:${PORT}/playlist.m3u`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📺 Your M3U Playlist URL: http://localhost:${PORT}/playlist.m3u`);
});
// Cache ကို 10 စက္ကန့်သာ သိမ်းမယ်
let cachedM3U = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 စက္ကန့်

exports.handler = async (event, context) => {
  const now = Date.now();

  // Cache 10 စက္ကန့် မကျော်သေးရင် Cache ကနေ ပြန်ပေးမယ်
  if (cachedM3U && (now - cacheTime < CACHE_TTL)) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: cachedM3U
    };
  }

  try {
    console.log(`[${new Date().toISOString()}] Fetching fresh data with Cache Bypass...`);
    
    // ⚠️ CACHE BUSTING: API v3 နဲ့ Timestamp ထည့်ထားခြင်း (မင်းပေးတဲ့ Repo အသစ်)
    const timestamp = Date.now();
    const API_URL = `https://api.github.com/repos/appeton778-coder/mmServer/contents/mmserver_data.json?t=${timestamp}`;

    const response = await fetch(API_URL, {
      headers: { 
        'User-Agent': 'IPTV-Proxy/1.0',
        'Accept': 'application/vnd.github.v3.raw', // Raw JSON content ကို တိုက်ရိုက်ယူရန်
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }

    const data = await response.json();
    const m3uContent = generateM3U(data);

    // Cache အသစ်သိမ်းမယ်
    cachedM3U = m3uContent;
    cacheTime = now;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: m3uContent
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'audio/x-mpegurl; charset=utf-8' },
      body: `#EXTM3U\n#EXTINF:-1,Error: ${err.message}`
    };
  }
};

// JSON ကို M3U ပြောင်းပေးမယ့် Function
function generateM3U(matches) {
  let m3u = '#EXTM3U\n#EXTENC:UTF-8\n';

  for (const match of matches) {
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
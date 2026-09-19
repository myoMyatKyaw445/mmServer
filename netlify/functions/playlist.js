let cachedM3U = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 စက္ကန့်

exports.handler = async (event, context) => {
  const now = Date.now();

  // 10 စက္ကန့်အတွင်းဆိုရင် Cache ကနေ ပြန်ပေးမယ်
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
    const timestamp = Date.now();
    // ✅ အမှန်တကယ် ဖြစ်သင့်တဲ့ URL (fmp_data.json)
    const API_URL = `https://jade-dango-e21413.netlify.app/.netlify/functions/get?t=${timestamp}`;

    const response = await fetch(API_URL, {
      headers: { 
        'User-Agent': 'IPTV-Proxy/1.0',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Debug Log: JSON ထဲမှာ ပွဲရေ ဘယ်နှစ်ပွဲပါလဲ စစ်ဆေးခြင်း
    console.log(`📦 Total matches in JSON: ${data.length}`);

    const m3uContent = generateM3U(data);

    // Debug Log: M3U ထဲကို ပွဲရေ ဘယ်နှစ်ပွဲ ရောက်သွားလဲ စစ်ဆေးခြင်း
    const m3uCount = (m3uContent.match(/#EXTINF/g) || []).length;
    console.log(`📺 Total matches added to M3U: ${m3uCount}`);

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
    console.error('❌ Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'audio/x-mpegurl; charset=utf-8' },
      body: `#EXTM3U\n#EXTINF:-1,Error: ${err.message}`
    };
  }
};

function generateM3U(matches) {
  let m3u = '#EXTM3U\n#EXTENC:UTF-8\n';

  for (const match of matches) {
    // match_status ကို လုံးဝ စစ်ဆေးခြင်း မရှိပါ။ အကုန်လုံးကို ယူပါမယ်။

    const home = match.home_name || 'Home Team';
    const away = match.away_name || 'Away Team';
    const logo = match.home_img || '';
    const league = match.league || 'Live Sports';
    const status = match.status || 'LIVE';
    
    let streamUrl = '';
    if (match.links && Array.isArray(match.links) && match.links.length > 0) {
      streamUrl = match.links[0].url;
    }

    // URL မရှိတဲ့ ပွဲကိုသာ ကျော်ပါမယ် (M3U စနစ်အရ URL မရှိရင် Error တက်မှာ ဖြစ်လို့ပါ)
    if (!streamUrl) {
      console.log(`⚠️ Skipped match without URL: ${home} vs ${away}`);
      continue;
    }

    const displayName = `[${league}] ${home} vs ${away} | ${status}`;
    m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${league}",${displayName}\n`;
    m3u += `${streamUrl}\n`;
  }

  return m3u;
}
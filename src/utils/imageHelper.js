/**
 * imageHelper.js — Multi-tier real image fetching for vocabulary cards.
 *
 * Tier 1: Openverse (real CC-licensed photos, no key needed)
 * Tier 2: GIPHY (animated GIFs, key already in .env)
 * Tier 3: HuggingFace FLUX (AI-generated real photo, key already in .env)
 */

/**
 * Clean a prompt/keyword string into 1-3 concrete search terms.
 * Removes scene prefixes, jargon, stop words.
 */
export const cleanKeyword = (rawPrompt) => {
  if (!rawPrompt) return '';
  
  // Safeguard: Extract string if it is an object (e.g. { prompt: "..." })
  const promptStr = typeof rawPrompt === 'object' && rawPrompt !== null
    ? (rawPrompt.prompt || rawPrompt.text || JSON.stringify(rawPrompt))
    : String(rawPrompt);

  const hasThai = /[\u0e00-\u0e7f]/.test(promptStr);
  if (hasThai) {
    return promptStr
      .replace(/[^a-zA-Z0-9\s\u0e00-\u0e7f]/g, ' ')
      .trim();
  }

  return promptStr
    .toLowerCase()
    .replace(/scene\s*\d+[:\-]?\s*/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w =>
      w.length > 2 &&
      !['and', 'the', 'with', 'under', 'for', 'photo', 'illustration',
        'scene', 'context', 'meaning', 'definition', 'showing', 'depicts',
        'concept', 'visual', 'image', 'picture', 'that', 'this', 'from',
        'into', 'within', 'about', 'where', 'while'].includes(w)
    )
    .slice(0, 3)
    .join(' ')
    .trim();
};

/**
 * Fetch a real photo URL from Openverse (Creative Commons, no API key needed).
 * Returns a direct image URL string, or null on failure.
 */
/**
 * Fetch a real photo URL from Openverse (Creative Commons, no API key needed).
 * Returns a direct image URL string, or null on failure.
 */
export const fetchOpenverseImage = async (keyword, excludeUrls = []) => {
  if (!keyword) return null;
  try {
    const query = encodeURIComponent(keyword);
    // Use a random page offset (1-5) to get variety on repeated searches
    const page = Math.floor(Math.random() * 5) + 1;
    const url = `https://api.openverse.org/v1/images/?q=${query}&page_size=20&page=${page}&license_type=commercial&source=flickr,wikimedia,stocksnap`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const available = data.results.filter(p => {
        const imgUrl = p.url || p.thumbnail;
        return imgUrl && !excludeUrls.includes(imgUrl);
      });
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        return pick.url || pick.thumbnail || null;
      }
    }
    return null;
  } catch (err) {
    console.warn('Openverse fetch failed:', err.message);
    return null;
  }
};

/**
 * Fetch an animated GIF URL from GIPHY.
 * Returns a direct GIF URL string, or null on failure.
 */
export const fetchGiphyImage = async (keyword, excludeUrls = []) => {
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY || '';
  if (!apiKey || !keyword) return null;
  try {
    const query = encodeURIComponent(keyword);
    const offset = Math.floor(Math.random() * 15); // variety
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${query}&limit=20&offset=${offset}&rating=g&lang=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GIPHY HTTP ${res.status}`);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const available = data.data.filter(g => {
        const imgUrl = g.images?.downsized_medium?.url || g.images?.fixed_height?.url;
        return imgUrl && !excludeUrls.includes(imgUrl);
      });
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        return pick.images?.downsized_medium?.url || pick.images?.fixed_height?.url || null;
      }
    }
    return null;
  } catch (err) {
    console.warn('GIPHY fetch failed:', err.message);
    return null;
  }
};

/**
 * Fetch a high-quality photo from Pexels API.
 * Uses localStorage key first, falls back to env variable.
 */
export const fetchPexelsImage = async (keyword, excludeUrls = []) => {
  const apiKey = localStorage.getItem('memeng_pexels_key') || import.meta.env.VITE_PEXELS_API_KEY || '';
  if (!apiKey || !keyword) return null;
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://api.pexels.com/v1/search?query=${query}&per_page=25`;
    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });
    if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      const available = data.photos.filter(p => {
        const imgUrl = p.src?.large || p.src?.medium;
        return imgUrl && !excludeUrls.includes(imgUrl);
      });
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        return pick.src?.large || pick.src?.medium || null;
      }
    }
    return null;
  } catch (err) {
    console.warn('Pexels fetch failed:', err.message);
    return null;
  }
};

/**
 * Fetch a high-quality photo from Pixabay API.
 * Uses localStorage key first, falls back to env variable.
 */
export const fetchPixabayImage = async (keyword, excludeUrls = []) => {
  const apiKey = localStorage.getItem('memeng_pixabay_key') || import.meta.env.VITE_PIXABAY_API_KEY || '';
  if (!apiKey || !keyword) return null;
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&image_type=photo&per_page=25`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
    const data = await res.json();
    if (data.hits && data.hits.length > 0) {
      const available = data.hits.filter(h => {
        const imgUrl = h.webformatURL || h.largeImageURL;
        return imgUrl && !excludeUrls.includes(imgUrl);
      });
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        return pick.webformatURL || pick.largeImageURL || null;
      }
    }
    return null;
  } catch (err) {
    console.warn('Pixabay fetch failed:', err.message);
    return null;
  }
};

/**
 * Fetch a relevant image from Wikimedia Commons API (Keyless & Free).
 */
export const fetchWikimediaImage = async (keyword, excludeUrls = []) => {
  if (!keyword) return null;
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wikimedia HTTP ${res.status}`);
    const data = await res.json();
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages);
      const validUrls = pages
        .filter(p => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url)
        .map(p => p.imageinfo[0].url)
        .filter(url => {
          const lower = url.toLowerCase();
          const isImage = lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
          return isImage && !excludeUrls.includes(url);
        });
      
      if (validUrls.length > 0) {
        return validUrls[Math.floor(Math.random() * validUrls.length)];
      }
    }
    return null;
  } catch (err) {
    console.warn('Wikimedia fetch failed:', err.message);
    return null;
  }
};

/**
 * Generate a real-looking AI photo via HuggingFace FLUX inference API.
 * Returns an object URL (blob) or null on failure.
 */
export const fetchHuggingFaceImage = async (keyword) => {
  const apiKey = localStorage.getItem('memeng_huggingface_key') || import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
  if (!apiKey || !keyword) return null;
  try {
    const prompt = `Vector illustration explaining the concept: "${keyword}". Flat design, simple, clean, vector art, educational graphic, white background, high contrast, comprehensible.`;
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );
    if (!res.ok) throw new Error(`HuggingFace HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.size > 1000) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (err) {
    console.warn('HuggingFace image fetch failed:', err.message);
    return null;
  }
};

/**
 * Main async function: try each tier in order, return the first successful URL.
 * @param {string} keyword - search keyword (from imageTag, scene title, or word)
 * @param {string} mode - 'photo' (Openverse→HF) or 'gif' (GIPHY→Openverse→HF)
 * @param {Array<string>} excludeUrls - list of URLs to filter out to prevent repetition
 * @returns {Promise<{url: string|null, source: string}>}
 */
export const fetchVocabImage = async (keyword, mode = 'photo', excludeUrls = []) => {
  const clean = cleanKeyword(keyword);
  if (!clean) return { url: null, source: 'none' };

  if (mode === 'gif') {
    // Try GIPHY first for animated GIFs
    const gif = await fetchGiphyImage(clean, excludeUrls);
    if (gif) return { url: gif, source: 'GIPHY' };
  }

  // 1. Try Pexels first (Primary)
  const pexels = await fetchPexelsImage(clean, excludeUrls);
  if (pexels) return { url: pexels, source: 'Pexels' };

  // 2. Try Pixabay second (Backup 1)
  const pixabay = await fetchPixabayImage(clean, excludeUrls);
  if (pixabay) return { url: pixabay, source: 'Pixabay' };

  // 3. Try Wikimedia Commons third (Backup 2)
  const wikimedia = await fetchWikimediaImage(clean, excludeUrls);
  if (wikimedia) return { url: wikimedia, source: 'Wikimedia' };

  // 4. Fallback to Openverse (Backup 3)
  const openverse = await fetchOpenverseImage(clean, excludeUrls);
  if (openverse) return { url: openverse, source: 'Openverse' };

  // 5. Ultimate keyless fallback to Pollinations AI (So it NEVER returns null!)
  const seed = Math.floor(Math.random() * 100000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?width=500&height=400&model=flux&nologo=true&seed=${seed}`;
  return { url: pollinationsUrl, source: 'Pollinations' };
};

/**
 * Legacy synchronous helper (kept for backward compatibility).
 * Now just returns a placeholder; use fetchVocabImage() async instead.
 */
export const getVocabImageUrl = (promptText, seed = 42, width = 500, height = 400) => {
  // Return Pollinations if key exists (may still work for some accounts)
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY || '';
  if (apiKey) {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}&key=${apiKey}`;
  }
  return null;
};

/**
 * Generate a concept illustration dynamically using Fal.ai (Flux Schnell).
 * Returns the generated image URL string, or null on failure.
 */
export const fetchFalImage = async (keyword) => {
  const apiKey = localStorage.getItem('memeng_fal_key') || import.meta.env.VITE_FAL_API_KEY || '';
  if (!apiKey || !keyword) return null;

  try {
    const clean = cleanKeyword(keyword);
    if (!clean) return null;

    const prompt = `Vector illustration explaining the concept: "${clean}". Flat design, simple, clean, vector art, educational graphic, white background, high contrast, comprehensible.`;

    // 1. Send generation request
    const genRes = await fetch('https://api.fluxapi.ai/api/v1/flux/kontext/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        aspectRatio: '4:3',
        model: 'flux-kontext-pro',
        enableTranslation: false,
        promptUpsampling: false,
        outputFormat: 'jpeg'
      })
    });

    if (!genRes.ok) throw new Error(`FluxAPI generate HTTP ${genRes.status}`);
    const genData = await genRes.json();
    if (genData.code !== 200 || !genData.data?.taskId) {
      throw new Error(genData.msg || 'Failed to start FluxAPI task');
    }

    const taskId = genData.data.taskId;

    // 2. Poll for the generated image URL (check status every 1.5 seconds)
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`https://api.fluxapi.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`
        }
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.code === 200 && statusData.data) {
          if (statusData.data.successFlag === 1) {
            return statusData.data.response?.resultImageUrl || null;
          } else if (statusData.data.successFlag === 2) {
            throw new Error(statusData.data.errorMessage || 'FluxAPI task failed');
          }
        }
      }
      attempts++;
    }
    throw new Error('FluxAPI task timeout');
  } catch (err) {
    console.error('FluxAPI image fetch failed:', err.message);
    return null;
  }
};

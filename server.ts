import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory simulation state for MikroTik Hotspot session
let sessionState = {
  isLoggedIn: false,
  username: 'USER-1234',
  speed: '4M',
  updateOption: '_Uon',
  bytesIn: 14680064,
  bytesOut: 58720256,
  remainBytes: 536870912,
  startTime: Date.now(),
  ip: '192.168.88.25',
  mac: '64:6E:97:A1:B2:C3',
};

// Periodic simulated traffic increments if logged in
setInterval(() => {
  if (sessionState.isLoggedIn) {
    sessionState.bytesIn += Math.floor(Math.random() * 45000) + 5000;
    sessionState.bytesOut += Math.floor(Math.random() * 95000) + 15000;
    if (sessionState.remainBytes > 0) {
      sessionState.remainBytes = Math.max(0, sessionState.remainBytes - 120000);
    }
  }
}, 2000);

// Helper to format uptime into Arabic-friendly / Hotspot-friendly string
function getUptimeString(startTime: number): string {
  const diffSecs = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;
  if (hours > 0) return `${hours}h${minutes}m${seconds}s`;
  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

// Helper to get actual banner images existing in adimg/ (1 to 7 images)
function getAdImages(): string[] {
  try {
    const adDir = path.join(__dirname, 'adimg');
    if (!fs.existsSync(adDir)) return [];
    const files = fs.readdirSync(adDir);
    const validExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']);
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return validExtensions.has(ext) && !file.startsWith('.');
    });

    // Natural sort by numeric value in filename if present (1.jpg, 2.jpg, ...)
    images.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Limit to 7 images max as requested
    return images.slice(0, 7).map(img => `./adimg/${img}`);
  } catch (err) {
    return [];
  }
}

// Helper to render Carousel HTML based on images in adimg/
function renderAdsCarouselHtml(images: string[]): string {
  if (!images || images.length === 0) {
    return `<!-- ADS_CAROUSEL_START -->
                    <div class="ads-carousel-wrapper" style="display: none;"></div>
                    <!-- ADS_CAROUSEL_END -->`;
  }

  if (images.length === 1) {
    return `<!-- ADS_CAROUSEL_START -->
                    <div class="ads-carousel-wrapper">
                         <div class="carousel-container" id="adCarousel">
                             <div class="carousel-track" id="carouselTrack">
                                 <div class="carousel-slide">
                                     <img class="im1" src="${images[0]}" alt="إعلان" fetchpriority="high" loading="eager" decoding="sync">
                                 </div>
                             </div>
                             <button class="carousel-nav-btn prev" id="carouselPrev" aria-label="السابق" style="display: none;">❮</button>
                             <button class="carousel-nav-btn next" id="carouselNext" aria-label="التالي" style="display: none;">❯</button>
                         </div>
                         <div class="carousel-dots" id="carouselDots" style="display: none;">
                         </div>
                     </div>
                    <!-- ADS_CAROUSEL_END -->`;
  }

  // 2 to 7 images
  const slidesHtml = images.map((src, idx) => `
                                 <div class="carousel-slide">
                                     <img class="im${idx + 1}" src="${src}" alt="إعلان ${idx + 1}" ${idx === 0 ? 'fetchpriority="high" loading="eager" decoding="sync"' : 'loading="eager" decoding="async"'}>
                                 </div>`).join('');

  const dotsHtml = images.map((_, idx) => `
                             <span class="carousel-dot${idx === 0 ? ' active' : ''}"></span>`).join('');

  return `<!-- ADS_CAROUSEL_START -->
                    <div class="ads-carousel-wrapper">
                         <div class="carousel-container" id="adCarousel">
                             <div class="carousel-track" id="carouselTrack">${slidesHtml}
                             </div>
                             <button class="carousel-nav-btn prev" id="carouselPrev" aria-label="السابق">❮</button>
                             <button class="carousel-nav-btn next" id="carouselNext" aria-label="التالي">❯</button>
                         </div>
                         <div class="carousel-dots" id="carouselDots">${dotsHtml}
                         </div>
                     </div>
                    <!-- ADS_CAROUSEL_END -->`;
}

// Render index.html with simulated MikroTik router template substitution
function serveMikrotikHtml(res: express.Response) {
  try {
    let rawHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const loggedInVal = sessionState.isLoggedIn ? 'yes' : 'no';
    
    // Dynamic Carousel Injection based on actual adimg folder contents
    const adImages = getAdImages();
    const carouselHtml = renderAdsCarouselHtml(adImages);
    rawHtml = rawHtml.replace(/<!-- ADS_CAROUSEL_START -->[\s\S]*?<!-- ADS_CAROUSEL_END -->/, carouselHtml);

    const outputHtml = rawHtml
      .replace(/\$\(logged-in\)/g, loggedInVal)
      .replace(/\$\(username\)/g, sessionState.isLoggedIn ? sessionState.username : '')
      .replace(/\$\(ip\)/g, sessionState.ip)
      .replace(/\$\(mac\)/g, sessionState.mac)
      .replace(/\$\(mac-esc\)/g, sessionState.mac)
      .replace(/\$\(uptime\)/g, getUptimeString(sessionState.startTime))
      .replace(/\$\(bytes-in\)/g, String(sessionState.bytesIn))
      .replace(/\$\(bytes-out\)/g, String(sessionState.bytesOut))
      .replace(/\$\(remain-bytes-total\)/g, String(sessionState.remainBytes))
      .replace(/\$\(domain\)/g, sessionState.speed);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(outputHtml);
  } catch (err) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
}

// MikroTik Hotspot /login endpoint
app.get('/login', (req, res) => {
  const isCallBack = req.query.var === 'callBack';
  const username = req.query.username as string;
  const domain = (req.query.domain as string) || '4M';

  if (isCallBack) {
    if (username) {
      // User is logging in
      sessionState.isLoggedIn = true;
      sessionState.username = username;
      sessionState.speed = domain.split('_')[0] || '4M';
      sessionState.updateOption = domain.includes('_Uoff') ? '_Uoff' : '_Uon';
      sessionState.startTime = Date.now();

      return res.json({
        logged_in: 'yes',
        username: sessionState.username,
        mac: sessionState.mac,
        link_login_only: '/login',
        sspeed: `${sessionState.speed}_`,
        update: sessionState.updateOption,
        ip: sessionState.ip,
        bytes_in: String(sessionState.bytesIn),
        bytes_out: String(sessionState.bytesOut),
        remain_bytes_total: String(sessionState.remainBytes),
        session_time_left: '4h30m',
        uptime: getUptimeString(sessionState.startTime),
        session_time_left_secs: '16200',
        uptime_secs: '300',
        trial: 'no',
        login_by: 'username',
        action: 'onLoggedIn',
      });
    }

    // Initial check (before login submitted)
    return res.json({
      logged_in: sessionState.isLoggedIn ? 'yes' : 'no',
      link_login_only: '/login',
      link_logout: '/logout',
      link_status: '/status',
      nas_id: 'AlShiar-Net-MikroTik',
      ip: sessionState.ip,
      mac: sessionState.mac,
      trial: 'no',
      username: sessionState.isLoggedIn ? sessionState.username : '',
      action: 'onLoginStart',
    });
  }

  // Regular direct request
  serveMikrotikHtml(res);
});

// MikroTik Hotspot /status endpoint
app.get('/status', (req, res) => {
  const isCallBack = req.query.var === 'callBack';

  if (isCallBack) {
    const rawToken = `m056fd9fdfdsffsdffdfd1697455${sessionState.username}dsfd6571fgfgfgfgdf53sdfdsfgsd14`;

    return res.json({
      logged_in: sessionState.isLoggedIn ? 'yes' : 'no',
      mac: sessionState.mac,
      sspeed: `${sessionState.speed}_`,
      update: sessionState.updateOption,
      ip: sessionState.ip,
      bytes_in: String(sessionState.bytesIn),
      bytes_out: String(sessionState.bytesOut),
      remain_bytes_total: String(sessionState.remainBytes),
      session_time_left: '4h15m',
      uptime: getUptimeString(sessionState.startTime),
      bytesm: rawToken,
      trial: 'no',
      username: sessionState.username,
      action: 'onStatusQuery',
    });
  }

  // Direct page request
  serveMikrotikHtml(res);
});

// MikroTik Hotspot /logout endpoint
app.get('/logout', (req, res) => {
  sessionState.isLoggedIn = false;
  const isCallBack = req.query.var === 'callBack';

  if (isCallBack) {
    return res.json({
      logged_in: 'no',
      action: 'onLoggedOut',
    });
  }

  res.redirect('/');
});

// Notifications & Announcements System public content API
app.get('/api/v1/public/content', (req, res) => {
  res.json({
    notifications: [],
    announcements: [],
  });
});

// Dynamic Banner Ads API (returns array of relative paths up to 7 images)
app.get('/api/ad-images', (req, res) => {
  const images = getAdImages();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ images });
});

// Serve static assets with high-performance caching (fonts, css, js, images, etc.)
const staticCacheOptions = {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res: express.Response, filePath: string) => {
    if (filePath.endsWith('.html')) {
      // HTML files check for updates but allow caching
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (filePath.match(/\.(woff2|woff|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico|css|js)$/i)) {
      // Static assets are cached aggressively for instant reloads
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
};

// Special zero-cache options for dynamic ad banner images and config to ensure immediate updates upon add/delete/edits
const zeroCacheOptions = {
  maxAge: 0,
  setHeaders: (res: express.Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
};

app.use('/fonts', express.static(path.join(__dirname, 'fonts'), staticCacheOptions));
app.use('/adimg', express.static(path.join(__dirname, 'adimg'), zeroCacheOptions), (req, res) => res.status(404).end());
app.use('/img', express.static(path.join(__dirname, 'img'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/css', express.static(path.join(__dirname, 'css'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/js', express.static(path.join(__dirname, 'js'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/config', express.static(path.join(__dirname, 'config'), zeroCacheOptions), (req, res) => res.status(404).end());
app.use('/2024', express.static(path.join(__dirname, '2024'), staticCacheOptions), (req, res) => res.status(404).end());
app.use(express.static(__dirname, staticCacheOptions));

// Fallback route to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hotspot Server] Running on http://0.0.0.0:${PORT}`);
});

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

// Render index.html with simulated MikroTik router template substitution
function serveMikrotikHtml(res: express.Response) {
  try {
    const rawHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const loggedInVal = sessionState.isLoggedIn ? 'yes' : 'no';
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
      nas_id: 'BH-NET-MikroTik',
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

// Special zero-cache options for dynamic ad banner images to ensure immediate updates upon add/delete
const adimgCacheOptions = {
  maxAge: 0,
  setHeaders: (res: express.Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
};

app.use('/fonts', express.static(path.join(__dirname, 'fonts'), staticCacheOptions));
app.use('/adimg', express.static(path.join(__dirname, 'adimg'), adimgCacheOptions), (req, res) => res.status(404).end());
app.use('/img', express.static(path.join(__dirname, 'img'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/css', express.static(path.join(__dirname, 'css'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/js', express.static(path.join(__dirname, 'js'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/config', express.static(path.join(__dirname, 'config'), staticCacheOptions), (req, res) => res.status(404).end());
app.use('/2024', express.static(path.join(__dirname, '2024'), staticCacheOptions), (req, res) => res.status(404).end());
app.use(express.static(__dirname, staticCacheOptions));

// Fallback route to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hotspot Server] Running on http://0.0.0.0:${PORT}`);
});

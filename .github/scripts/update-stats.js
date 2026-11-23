const fs = require('fs');
const path = require('path');
const https = require('https');

function fetch(url, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'CommitPulse-Stats-Bot' };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    const req = https.get(url, { headers, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

async function updateStats() {
  const username = 'Ishwar-123';
  const rootDir = path.resolve(__dirname, '..', '..');
  const token = process.env.GITHUB_TOKEN;

  const statsCardPath = path.join(rootDir, 'assets', 'stats-card.svg');
  const achievementsPath = path.join(rootDir, 'assets', 'achievements.svg');
  const headerPath = path.join(rootDir, 'assets', 'header.svg');

  console.log('Fetching live GitHub stats for', username);

  // Default / fallback values based on latest verified numbers
  let publicRepos = 45;
  let totalContribs = 4009;
  let currentStreak = 296;
  let longestStreak = 296;

  // 1. Fetch live user repo count from GitHub API
  try {
    const user = await fetch(`https://api.github.com/users/${username}`, token);
    if (user && user.public_repos !== undefined) {
      publicRepos = user.public_repos;
      console.log(`Fetched public repos: ${publicRepos}`);
    }
  } catch (e) {
    console.warn('Could not fetch user repos count from API, using default/current:', e.message);
  }

  // 2. Fetch live streak & contributions from streak stats API
  try {
    const streakSvg = await fetch(`https://streak-stats.demolab.com/?user=${username}`);
    if (typeof streakSvg === 'string') {
      const totalMatch = streakSvg.match(/Total Contributions[\s\S]*?<text[^>]*>\s*([0-9,]+)\s*<\/text>/i) ||
                         streakSvg.match(/<text[^>]*>\s*([0-9,]+)\s*<\/text>[\s\S]*?Total Contributions/i);
      if (totalMatch) {
        totalContribs = parseInt(totalMatch[1].replace(/,/g, ''), 10);
      }

      const currMatch = streakSvg.match(/Current Streak[\s\S]*?<text[^>]*>\s*([0-9]+)\s*<\/text>/i) ||
                        streakSvg.match(/<text[^>]*>\s*([0-9]+)\s*<\/text>[\s\S]*?Current Streak/i);
      if (currMatch) {
        currentStreak = parseInt(currMatch[1], 10);
      }

      const longMatch = streakSvg.match(/Longest Streak[\s\S]*?<text[^>]*>\s*([0-9]+)\s*<\/text>/i) ||
                        streakSvg.match(/<text[^>]*>\s*([0-9]+)\s*<\/text>[\s\S]*?Longest Streak/i);
      if (longMatch) {
        longestStreak = parseInt(longMatch[1], 10);
      }
    }
  } catch (e) {
    console.warn('Could not fetch from streak API, using latest metrics:', e.message);
  }

  console.log(`Live Metrics -> Total: ${totalContribs}, Streak: ${currentStreak} days, Longest: ${longestStreak} days, Repos: ${publicRepos}`);

  const formattedContrib = totalContribs.toLocaleString() + '+';

  // --- 1. Update assets/stats-card.svg ---
  if (fs.existsSync(statsCardPath)) {
    let cardContent = fs.readFileSync(statsCardPath, 'utf8');

    // Header repositories count
    cardContent = cardContent.replace(
      /(<text x="794"[^>]*>)[^<]*(<\/text>)/,
      `$1${publicRepos}+ REPOSITORIES · 2026$2`
    );

    // Total Contributions
    cardContent = cardContent.replace(
      /(<text x="0" y="14" class="font-sans label">TOTAL CONTRIBUTIONS<\/text>\s*<text x="0" y="48" class="font-sans value" fill="#38bdf8">)[^<]*(<\/text>)/,
      `$1${formattedContrib}$2`
    );

    // Current Streak
    cardContent = cardContent.replace(
      /(<text x="0" y="14" class="font-sans label">CURRENT STREAK<\/text>\s*<text x="0" y="48" class="font-sans value" fill="#10b981">)[^<]*(<\/text>)/,
      `$1${currentStreak} Days$2`
    );

    // Public Repositories
    cardContent = cardContent.replace(
      /(<text x="0" y="14" class="font-sans label">PUBLIC REPOSITORIES<\/text>\s*<text x="0" y="48" class="font-sans value" fill="#818cf8">)[^<]*(<\/text>)/,
      `$1${publicRepos}+ Repos$2`
    );

    // Longest Streak
    cardContent = cardContent.replace(
      /(<text x="0" y="14" class="font-sans label">LONGEST RECORD<\/text>\s*<text x="0" y="48" class="font-sans value" fill="#f59e0b">)[^<]*(<\/text>)/,
      `$1${longestStreak} Days$2`
    );

    fs.writeFileSync(statsCardPath, cardContent, 'utf8');
    console.log('Successfully updated assets/stats-card.svg');
  }

  // --- 2. Update assets/achievements.svg ---
  if (fs.existsSync(achievementsPath)) {
    let achContent = fs.readFileSync(achievementsPath, 'utf8');

    // Prolific Creator (Repos)
    achContent = achContent.replace(
      /(Prolific Creator<\/text>\s*<text x="52" y="47"[^>]*>)[^<]*(<\/text>)/,
      `$1${publicRepos}+ Repositories$2`
    );

    // Streak Master (Days unbroken)
    achContent = achContent.replace(
      /(Streak Master<\/text>\s*<text x="52" y="47"[^>]*>)[^<]*(<\/text>)/,
      `$1${currentStreak} Days Unbroken$2`
    );

    // Commit Veteran (Contributions)
    achContent = achContent.replace(
      /(Commit Veteran<\/text>\s*<text x="52" y="47"[^>]*>)[^<]*(<\/text>)/,
      `$1${formattedContrib} Contributions$2`
    );

    fs.writeFileSync(achievementsPath, achContent, 'utf8');
    console.log('Successfully updated assets/achievements.svg');
  }

  // --- 3. Update assets/header.svg ---
  if (fs.existsSync(headerPath)) {
    let headContent = fs.readFileSync(headerPath, 'utf8');

    headContent = headContent.replace(
      /(Full-Stack &amp; Mobile App Engineer · )\d+\+ Repositories( · Scalable Architectures)/,
      `$1${publicRepos}+ Repositories$2`
    );

    fs.writeFileSync(headerPath, headContent, 'utf8');
    console.log('Successfully updated assets/header.svg');
  }
}

updateStats().catch(err => {
  console.error(err);
  process.exit(1);
});

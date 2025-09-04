#!/usr/bin/env node
// To overcome rate limits, get a GitHub token from https://github.com/settings/tokens and set it as an environment variable
// export GITHUB_TOKEN="ghp_XXX"

const https = require('https');
const fs = require('fs');

// Configuration
const REPO_OWNER = 'SolaceLabs';
const REPO_NAME = 'solace-agent-mesh';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/stargazers`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Node.js GitHub Stargazers Script',
      'Accept': 'application/vnd.github.v3.star+json',
      ...options.headers
    };

    // Add authentication if GitHub token is available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const requestOptions = {
      headers,
      ...options
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              data: jsonData,
              headers: res.headers,
              statusCode: res.statusCode
            });
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        } else if (res.statusCode === 403) {
          // Handle rate limiting and SAML enforcement
          const rateLimitRemaining = res.headers['x-ratelimit-remaining'];
          const rateLimitReset = res.headers['x-ratelimit-reset'];
          
          if (rateLimitRemaining === '0') {
            const resetTime = new Date(parseInt(rateLimitReset) * 1000);
            const waitTime = Math.ceil((resetTime - new Date()) / 1000) + 60; // Add 60 seconds buffer
            
            log(`⏰ Rate limit exceeded. Waiting ${waitTime} seconds until reset...`, 'yellow');
            log(`🕐 Reset time: ${resetTime.toLocaleString()}`, 'yellow');
            
            setTimeout(() => {
              makeRequest(url, options).then(resolve).catch(reject);
            }, waitTime * 1000);
          } else {
            // Check if it's a SAML enforcement error
            try {
              const errorData = JSON.parse(data);
              if (errorData.message && errorData.message.includes('SAML enforcement')) {
                log(`⚠️  SAML Enforcement Error: ${errorData.message}`, 'yellow');
                log(`💡 This organization requires SAML authorization for your token.`, 'cyan');
                log(`💡 You can either:`, 'cyan');
                log(`   1. Authorize your token for the organization at: https://github.com/settings/tokens`, 'cyan');
                log(`   2. Use unauthenticated requests (limited to 60/hour)`, 'cyan');
                log(`   3. Try again without the GITHUB_TOKEN environment variable`, 'cyan');
                reject(new Error(`SAML enforcement: ${errorData.message}`));
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
            } catch (parseError) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function getStargazers(limit = null) {
  try {
    log(`🔍 Fetching ${limit ? `up to ${limit}` : 'ALL'} stargazers for ${REPO_OWNER}/${REPO_NAME}...`, 'cyan');
    
    let allStargazers = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const url = `${GITHUB_API_URL}?page=${page}&per_page=100`;
      log(`📄 Fetching page ${page}...`, 'yellow');
      
      const response = await makeRequest(url);
      const stargazersData = response.data;
      
      if (stargazersData.length === 0) {
        hasMorePages = false;
        log(`✅ No more pages found.`, 'green');
      } else {
        // Transform the data to flatten the structure
        const stargazers = stargazersData.map(item => ({
          ...item.user,
          starred_at: item.starred_at
        }));
        
        allStargazers.push(...stargazers);
        log(`📊 Page ${page}: Found ${stargazers.length} stargazers (Total: ${allStargazers.length})`, 'green');
        
        // Check if we've reached the limit
        if (limit && allStargazers.length >= limit) {
          log(`🎯 Reached limit of ${limit} stargazers. Stopping pagination.`, 'yellow');
          hasMorePages = false;
          // Trim to exact limit if we exceeded it
          if (allStargazers.length > limit) {
            allStargazers = allStargazers.slice(0, limit);
            log(`📊 Trimmed to exactly ${limit} stargazers.`, 'yellow');
          }
        } else {
          page++;
          
          // Add a small delay to be respectful to the API
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }
    
    log(`✅ Successfully fetched ${allStargazers.length} stargazers!`, 'green');
    
    return allStargazers;
  } catch (error) {
    log(`❌ Error fetching stargazers: ${error.message}`, 'red');
    throw error;
  }
}

function displayStargazersInfo(stargazers) {
  log('\n📊 Stargazers Information:', 'bright');
  log('=' .repeat(50), 'blue');
  
  log(`\n🎯 Total Stargazers: ${stargazers.length}`, 'green');
  
  // Display first 10 stargazers with details
  const displayCount = Math.min(10, stargazers.length);
  log(`\n👥 Top ${displayCount} Stargazers:`, 'yellow');
  
  stargazers.slice(0, displayCount).forEach((stargazer, index) => {
    log(`\n${index + 1}. ${stargazer.login}`, 'bright');
    log(`   📝 Username: ${stargazer.login}`, 'cyan');
    log(`   🆔 ID: ${stargazer.id}`, 'cyan');
    log(`   ⭐ Starred at: ${new Date(stargazer.starred_at).toLocaleString()}`, 'magenta');
    log(`   🔗 Profile: ${stargazer.html_url}`, 'blue');
  });
  
  if (stargazers.length > displayCount) {
    log(`\n... and ${stargazers.length - displayCount} more stargazers`, 'yellow');
  }
  
  // Add simple list of all usernames with profile URLs
  log(`\n📋 All Stargazers (${stargazers.length}):`, 'yellow');
  log('=' .repeat(50), 'blue');
  
  stargazers.forEach((stargazer, index) => {
    console.log(`${index + 1}. ${stargazer.login} (${stargazer.html_url})`);
  });
}

function saveStargazersToFile(stargazers, filename = 'stargazers.json') {
  try {
    const data = {
      repository: `${REPO_OWNER}/${REPO_NAME}`,
      total_stargazers: stargazers.length,
      fetched_at: new Date().toISOString(),
      stargazers: stargazers
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    log(`\n💾 Stargazers data saved to ${filename}`, 'green');
  } catch (error) {
    log(`\n❌ Error saving to file: ${error.message}`, 'red');
  }
}

function generateStargazersReport(stargazers) {
  const report = {
    summary: {
      repository: `${REPO_OWNER}/${REPO_NAME}`,
      total_stargazers: stargazers.length,
      report_generated_at: new Date().toISOString()
    },
    statistics: {
      user_types: {},
      top_stargazers: [],
      recent_stargazers: [],
      oldest_stargazers: []
    },
    stargazers_list: stargazers.map(s => ({
      login: s.login,
      id: s.id,
      profile_url: s.html_url,
      starred_at: s.starred_at,
      type: s.type || 'User'
    }))
  };
  
  // Analyze user types
  stargazers.forEach(stargazer => {
    const type = stargazer.type || 'User';
    report.statistics.user_types[type] = 
      (report.statistics.user_types[type] || 0) + 1;
  });
  
  // Get top 20 stargazers
  report.statistics.top_stargazers = stargazers.slice(0, 20).map(s => ({
    login: s.login,
    id: s.id,
    profile_url: s.html_url,
    starred_at: s.starred_at
  }));
  
  // Get recent stargazers (last 10) - sorted by starred_at date
  const sortedByDate = [...stargazers].sort((a, b) => 
    new Date(b.starred_at) - new Date(a.starred_at)
  );
  report.statistics.recent_stargazers = sortedByDate.slice(0, 10).map(s => ({
    login: s.login,
    starred_at: s.starred_at
  }));
  
  // Get oldest stargazers (first 10)
  report.statistics.oldest_stargazers = sortedByDate.slice(-10).reverse().map(s => ({
    login: s.login,
    starred_at: s.starred_at
  }));
  
  return report;
}

function displayReport(report) {
  log('\n📈 Detailed Report:', 'bright');
  log('=' .repeat(50), 'blue');
  
  log(`\n📊 Summary:`, 'yellow');
  log(`   Repository: ${report.summary.repository}`, 'cyan');
  log(`   Total Stargazers: ${report.summary.total_stargazers}`, 'green');
  log(`   Report Generated: ${new Date(report.summary.report_generated_at).toLocaleString()}`, 'cyan');
  
  log(`\n👥 User Types:`, 'yellow');
  Object.entries(report.statistics.user_types).forEach(([type, count]) => {
    log(`   ${type}: ${count}`, 'cyan');
  });
  
  log(`\n⭐ Recent Stargazers (Last 10):`, 'yellow');
  report.statistics.recent_stargazers.forEach((stargazer, index) => {
    log(`   ${index + 1}. ${stargazer.login} - ${new Date(stargazer.starred_at).toLocaleDateString()}`, 'cyan');
  });
  
  log(`\n🏆 Oldest Stargazers (First 10):`, 'yellow');
  report.statistics.oldest_stargazers.forEach((stargazer, index) => {
    log(`   ${index + 1}. ${stargazer.login} - ${new Date(stargazer.starred_at).toLocaleDateString()}`, 'cyan');
  });
}

async function getDetailedUserInfo(username) {
  try {
    const userUrl = `https://api.github.com/users/${username}`;
    const response = await makeRequest(userUrl);
    return response.data;
  } catch (error) {
    log(`⚠️  Could not fetch detailed info for ${username}: ${error.message}`, 'yellow');
    return null;
  }
}

function displayEnrichedStargazersInfo(enrichedStargazers) {
  log('\n📊 Detailed Stargazers Information:', 'bright');
  log('=' .repeat(60), 'blue');
  
  log(`\n🎯 Total Stargazers with Details: ${enrichedStargazers.length}`, 'green');
  
  // Display first 10 stargazers with detailed information
  const displayCount = Math.min(10, enrichedStargazers.length);
  log(`\n👥 Top ${displayCount} Stargazers (Detailed):`, 'yellow');
  
  enrichedStargazers.slice(0, displayCount).forEach((stargazer, index) => {
    log(`\n${index + 1}. ${stargazer.login}`, 'bright');
    log(`   📝 Username: ${stargazer.login}`, 'cyan');
    log(`   🆔 ID: ${stargazer.id}`, 'cyan');
    log(`   ⭐ Starred at: ${new Date(stargazer.starred_at).toLocaleString()}`, 'magenta');
    log(`   🔗 Profile: ${stargazer.html_url}`, 'blue');
    
    // Show additional detailed info if available
    if (stargazer.name) {
      log(`   📛 Full Name: ${stargazer.name}`, 'cyan');
    }
    if (stargazer.company) {
      log(`   🏢 Company: ${stargazer.company}`, 'cyan');
    }
    if (stargazer.location) {
      log(`   📍 Location: ${stargazer.location}`, 'cyan');
    }
    if (stargazer.bio) {
      log(`   📖 Bio: ${stargazer.bio.substring(0, 100)}${stargazer.bio.length > 100 ? '...' : ''}`, 'cyan');
    }
    if (stargazer.followers !== undefined) {
      log(`   👥 Followers: ${stargazer.followers}`, 'cyan');
    }
    if (stargazer.public_repos !== undefined) {
      log(`   📦 Public Repos: ${stargazer.public_repos}`, 'cyan');
    }
  });
  
  if (enrichedStargazers.length > displayCount) {
    log(`\n... and ${enrichedStargazers.length - displayCount} more stargazers`, 'yellow');
  }
}

async function enrichStargazersData(stargazers) {
  log('\n🔍 Fetching detailed user information...', 'cyan');
  log(`📊 Processing ${stargazers.length} stargazers in batches...`, 'yellow');
  
  const enrichedStargazers = [];
  const batchSize = 50; // Smaller batch size to be more respectful to the API
  let processedCount = 0;
  
  for (let i = 0; i < stargazers.length; i += batchSize) {
    const batch = stargazers.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(stargazers.length / batchSize);
    
    log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`, 'yellow');
    
    const promises = batch.map(async (stargazer, batchIndex) => {
      try {
        const detailedInfo = await getDetailedUserInfo(stargazer.login);
        processedCount++;
        log(`   ✅ ${processedCount}/${stargazers.length}: ${stargazer.login}`, 'green');
        return {
          ...stargazer,
          ...detailedInfo
        };
      } catch (error) {
        processedCount++;
        log(`   ⚠️  ${processedCount}/${stargazers.length}: ${stargazer.login} - ${error.message}`, 'yellow');
        return stargazer; // Return original data if detailed fetch fails
      }
    });
    
    const batchResults = await Promise.all(promises);
    enrichedStargazers.push(...batchResults);
    
    // Add a delay between batches to be respectful to the API rate limits
    if (i + batchSize < stargazers.length) {
      log(`   ⏳ Waiting 2 seconds before next batch...`, 'cyan');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  log(`\n✅ Successfully processed ${processedCount} stargazers!`, 'green');
  return enrichedStargazers;
}

function generateStargazersSummary(stargazers, options) {
  log('\n📋 Stargazers Summary:', 'bright');
  log('=' .repeat(50), 'blue');
  
  log(`\n🎯 Total Stargazers: ${stargazers.length}`, 'green');
  
  if (options.date) {
    log(`📅 Filtered by date: ${options.date}`, 'cyan');
  } else {
    log(`📅 Sort order: ${options.sort === 'desc' ? 'Newest first' : 'Oldest first'}`, 'cyan');
  }
  
  if (options.limit) {
    log(`📊 Limited to: ${options.limit} results`, 'cyan');
  }
  
  log('\n👥 Stargazers Summary:', 'yellow');
  log('=' .repeat(50), 'blue');
  
  stargazers.forEach((stargazer, index) => {
    const starredDate = new Date(stargazer.starred_at).toLocaleDateString();
    const starredTime = new Date(stargazer.starred_at).toLocaleTimeString();
    
    if (options.date) {
      // For specific date filter, show only username
      log(`${index + 1}. ${stargazer.login}`, 'bright');
    } else {
      // For general queries, show username and starred date
      log(`${index + 1}. ${stargazer.login} - ⭐ ${starredDate} ${starredTime}`, 'bright');
    }
  });
  
  // Generate CSV-like summary
  log('\n📄 CSV Summary:', 'yellow');
  log('=' .repeat(50), 'blue');
  
  if (options.date) {
    console.log('Username');
    stargazers.forEach(stargazer => {
      console.log(stargazer.login);
    });
  } else {
    console.log('Username,Starred Date,Starred Time');
    stargazers.forEach(stargazer => {
      const starredDate = new Date(stargazer.starred_at).toLocaleDateString();
      const starredTime = new Date(stargazer.starred_at).toLocaleTimeString();
      console.log(`${stargazer.login}\t(${starredDate} ${starredTime} - ${stargazer.html_url})`);
    });
  }
  
  // Save summary to file
  const summaryData = {
    repository: `${REPO_OWNER}/${REPO_NAME}`,
    total_stargazers: stargazers.length,
    filter_options: options,
    generated_at: new Date().toISOString(),
    stargazers: stargazers.map(s => ({
      username: s.login,
      starred_at: s.starred_at,
      starred_date: new Date(s.starred_at).toLocaleDateString(),
      starred_time: new Date(s.starred_at).toLocaleTimeString()
    }))
  };
  
  const summaryFilename = `stargazers-summary-${Date.now()}.json`;
  fs.writeFileSync(summaryFilename, JSON.stringify(summaryData, null, 2));
  log(`\n💾 Summary saved to: ${summaryFilename}`, 'green');
  
  // Add code to generate a file by name participants.txt by extracting 'username' from the summaryData
  const participants = summaryData.stargazers.map(s => s.username);
  fs.writeFileSync('participants.txt', participants.join('\n'));
  log(`\n💾 Participants saved to: participants.txt`, 'green');
  
  return summaryData;
}

async function main() {
  try {
    log('🚀 GitHub Stargazers Fetcher', 'bright');
    log('=' .repeat(50), 'blue');
    
    // Show current options
    log('\n⚙️  Current Options:', 'yellow');
    log(`   Sort Order: ${options.sort === 'desc' ? 'Descending (newest first)' : 'Ascending (oldest first)'}`, 'cyan');
    if (options.date) {
      log(`   Date Filter: ${options.date}`, 'cyan');
    }
    if (options.limit) {
      log(`   Result Limit: ${options.limit}`, 'cyan');
    }
    log('');
    
    // Fetch stargazers
    const stargazers = await getStargazers(options.limit);
    
    // Filter and sort stargazers based on options
    const filteredAndSortedStargazers = filterAndSortStargazers(stargazers, options);
    
    // Display basic information
    displayStargazersInfo(filteredAndSortedStargazers);
    
    // Fetch detailed information for all stargazers
    log('\n🔍 Fetching detailed information for all stargazers...', 'cyan');
    const enrichedStargazers = await enrichStargazersData(filteredAndSortedStargazers);
    
    // Display enriched information
    displayEnrichedStargazersInfo(enrichedStargazers);
    
    // Generate and display detailed report
    const report = generateStargazersReport(enrichedStargazers);
    displayReport(report);
    
    // Save data to files
    saveStargazersToFile(enrichedStargazers, 'stargazers-detailed.json');
    saveStargazersToFile(report, 'stargazers-report.json');
    
    // Generate and save summary
    generateStargazersSummary(enrichedStargazers, options);
    
    log('\n✅ Script completed successfully!', 'green');
    log(`📁 Check the generated files:`, 'cyan');
    log(`   - stargazers-detailed.json (detailed user data)`, 'cyan');
    log(`   - stargazers-report.json (processed report)`, 'cyan');
    log(`   - stargazers-summary.json (summary)`, 'cyan');
    
  } catch (error) {
    log(`\n❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

// Parse command line options
const options = {
  sort: 'desc', // 'asc' or 'desc'
  date: null,   // specific date filter (YYYY-MM-DD)
  limit: null,  // limit number of results
  help: false
};

if (args.length === 0) {
  options.help = true;
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--sort' || arg === '-s') {
    const sortValue = args[i + 1];
    if (sortValue === 'asc' || sortValue === 'desc') {
      options.sort = sortValue;
      i++; // Skip next argument
    }
  } else if (arg === '--date' || arg === '-d') {
    const dateValue = args[i + 1];
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      options.date = dateValue;
      i++; // Skip next argument
    }
  } else if (arg === '--limit' || arg === '-l') {
    const limitValue = parseInt(args[i + 1]);
    if (limitValue && limitValue > 0) {
      options.limit = limitValue;
      i++; // Skip next argument
    }
  }
}

if (options.help) {
  log('GitHub Stargazers Fetcher', 'bright');
  log('Usage: node github-stargazers.js [options]', 'cyan');
  log('\nOptions:', 'yellow');
  log('  --help, -h           Show this help message', 'cyan');
  log('  --sort <asc|desc>, -s <asc|desc>', 'cyan');
  log('                       Sort by starred date (default: desc)', 'cyan');
  log('  --date <YYYY-MM-DD>, -d <YYYY-MM-DD>', 'cyan');
  log('                       Filter by specific date', 'cyan');
  log('  --limit <number>, -l <number>', 'cyan');
  log('                       Limit number of results', 'cyan');
  log('\nExamples:', 'yellow');
  log('  node github-stargazers.js', 'cyan');
  log('  node github-stargazers.js --sort desc', 'cyan');
  log('  node github-stargazers.js --sort asc', 'cyan');
  log('  node github-stargazers.js --date 2025-02-26', 'cyan');
  log('  node github-stargazers.js --limit 10', 'cyan');
  log('  node github-stargazers.js --sort desc --limit 20', 'cyan');
  log('\nAuthentication (Recommended):', 'yellow');
  log('  Set GITHUB_TOKEN environment variable for higher rate limits:', 'cyan');
  log('  export GITHUB_TOKEN=your_github_token', 'cyan');
  log('  node github-stargazers.js', 'cyan');
  log('\nRate Limiting:', 'yellow');
  log('  - Unauthenticated: 60 requests/hour', 'cyan');
  log('  - Authenticated: 5,000 requests/hour', 'cyan');
  log('  - Script will automatically wait if rate limit is exceeded', 'cyan');
  log('\nDescription:', 'yellow');
  log('  Fetches ALL stargazers information for the Solace Agent Mesh repository', 'cyan');
  log('  from the GitHub API with pagination support.', 'cyan');
  process.exit(0);
}

function filterAndSortStargazers(stargazers, options) {
  let filteredStargazers = [...stargazers];
  
  // Filter by date if specified
  if (options.date) {
    const targetDate = new Date(options.date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    filteredStargazers = filteredStargazers.filter(stargazer => {
      const starredDate = new Date(stargazer.starred_at);
      return starredDate >= targetDate && starredDate < nextDate;
    });
    
    log(`📅 Filtered to ${filteredStargazers.length} stargazers on ${options.date}`, 'yellow');
  }
  
  // Sort by starred_at date
  filteredStargazers.sort((a, b) => {
    const dateA = new Date(a.starred_at);
    const dateB = new Date(b.starred_at);
    return options.sort === 'asc' ? dateA - dateB : dateB - dateA;
  });
  
  // Note: Limit is already applied during fetching for efficiency
  if (options.limit) {
    log(`📊 Already limited to ${filteredStargazers.length} results during fetch`, 'yellow');
  }
  
  return filteredStargazers;
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getStargazers,
  displayStargazersInfo,
  generateStargazersReport,
  saveStargazersToFile,
  getDetailedUserInfo,
  enrichStargazersData,
  generateStargazersSummary
};

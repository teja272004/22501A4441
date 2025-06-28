const axios = require('axios');

const LOG_ENDPOINT = "http://20.244.56.144/evaluation-service/logs";
const AUTH_TOKEN = process.env.ACCESS_TOKEN;


const VALID_CONFIG = {
  stacks: ["backend", "frontend"],
  levels: ["debug", "info", "warn", "error", "fatal"],
  backendPackages: [
    "cache", "controller", "cron_job", "db", "domain",
    "handler", "repository", "route", "service"
  ],
  sharedPackages: [
    "auth", "config", "middleware", "utils"
  ]
};

function Log(stack, level, package, message) {
  
  if (!VALID_CONFIG.stacks.includes(stack)) return;
  if (!VALID_CONFIG.levels.includes(level)) return;
  if (![...VALID_CONFIG.backendPackages, ...VALID_CONFIG.sharedPackages].includes(package)) return;
  if (!AUTH_TOKEN) return;

 
  axios.post(LOG_ENDPOINT, {
    stack,
    level,
    package,
    message
  }, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    timeout: 5000
  }).catch(() => {}); 
}

module.exports = { Log };
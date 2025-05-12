// Cloudflare Pages Function for leaderboard 
// KV namespace binding needs to be added in the Cloudflare Dashboard

export async function onRequest(context) {
  // Get the request details
  const request = context.request;
  const env = context.env;
  
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  // GET request - return leaderboard
  if (request.method === "GET") {
    return await getLeaderboard(env);
  }
  
  // POST request - add score
  if (request.method === "POST") {
    try {
      const { initials, score } = await request.json();
      return await addScore(env, request, initials, score);
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid request" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
  
  // Default 404 response
  return new Response("Not found", { status: 404 });
}

// Handle OPTIONS requests for CORS
function handleOptions(request) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// Get all leaderboard entries
async function getLeaderboard(env) {
  let leaderboardData;
  try {
    leaderboardData = await env.LEADERBOARD_KV.get("global_leaderboard");
  } catch (error) {
    console.error("Error accessing KV:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  if (!leaderboardData) {
    // Initialize with default values if no leaderboard exists
    const defaultLeaderboard = [
      { initials: "CPU", score: 5000 },
      { initials: "BOT", score: 4000 },
      { initials: "AI", score: 3000 },
      { initials: "PRO", score: 2000 },
      { initials: "MAX", score: 1000 }
    ];
    
    try {
      await env.LEADERBOARD_KV.put("global_leaderboard", JSON.stringify(defaultLeaderboard));
    } catch (error) {
      console.error("Error writing to KV:", error);
    }
    
    return new Response(JSON.stringify(defaultLeaderboard), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  return new Response(leaderboardData, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// Add a new score to the leaderboard
async function addScore(env, request, initials, score) {
  // Basic validation
  if (!initials || !score || typeof score !== 'number' || score <= 0) {
    return new Response(JSON.stringify({
      success: false,
      message: "Invalid score data"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Anti-cheat: Set reasonable maximum score limit (adjust based on your game)
  const MAX_REASONABLE_SCORE = 100000;
  if (score > MAX_REASONABLE_SCORE) {
    console.warn(`Suspicious score submission: ${initials} submitted ${score} points`);
    return new Response(JSON.stringify({
      success: false,
      message: "Score exceeds reasonable limits"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Rate limiting based on IP address (basic implementation)
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `ratelimit:${clientIP}`;

  try {
    const rateData = await env.LEADERBOARD_KV.get(rateLimitKey);
    if (rateData) {
      const { count, timestamp } = JSON.parse(rateData);
      const now = Date.now();
      const timeWindow = 60 * 1000; // 1 minute

      if (now - timestamp < timeWindow && count >= 5) {
        return new Response(JSON.stringify({
          success: false,
          message: "Too many submissions, please try again later"
        }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // Update rate limit counter
      if (now - timestamp < timeWindow) {
        await env.LEADERBOARD_KV.put(rateLimitKey, JSON.stringify({
          count: count + 1,
          timestamp
        }), { expirationTtl: 60 });
      } else {
        await env.LEADERBOARD_KV.put(rateLimitKey, JSON.stringify({
          count: 1,
          timestamp: now
        }), { expirationTtl: 60 });
      }
    } else {
      // First submission from this IP
      await env.LEADERBOARD_KV.put(rateLimitKey, JSON.stringify({
        count: 1,
        timestamp: Date.now()
      }), { expirationTtl: 60 });
    }
  } catch (error) {
    console.error("Error with rate limiting:", error);
    // Continue even if rate limiting fails
  }
  
  // Get the current leaderboard
  let leaderboard;
  try {
    const leaderboardData = await env.LEADERBOARD_KV.get("global_leaderboard");
    leaderboard = leaderboardData ? JSON.parse(leaderboardData) : [];
  } catch (error) {
    console.error("Error reading from KV:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Server error" 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Format initials (uppercase, max 3 chars)
  const formattedInitials = initials.toUpperCase().substring(0, 3);
  
  // Add the new score
  leaderboard.push({ initials: formattedInitials, score });
  
  // Sort by score (descending)
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep only top 10
  const topScores = leaderboard.slice(0, 10);
  
  // Save back to KV
  try {
    await env.LEADERBOARD_KV.put("global_leaderboard", JSON.stringify(topScores));
  } catch (error) {
    console.error("Error writing to KV:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Server error" 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Find the rank of the new score
  const rank = topScores.findIndex(entry => 
    entry.initials === formattedInitials && entry.score === score
  );
  
  return new Response(JSON.stringify({ 
    success: true, 
    rank: rank !== -1 ? rank : null,
    leaderboard: topScores 
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
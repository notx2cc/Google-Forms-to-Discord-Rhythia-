function onFormSubmit(e) {
  var startTime = Date.now(); // Performance tracker
  
  // ⚙️ CONFIGURATION
  var webhookUrl = ""; 
  var logWebhookUrl = ""; 
  var REVIEW_ROLE_ID = ""; 

  var mapId = "-";
  try {
    var itemResponses = e.response.getItemResponses();
    var responses = {};
    
    // FUZZY MATCH ENGINE
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i];
      var title = itemResponse.getItem().getTitle().trim().toLowerCase();
      var value = itemResponse.getResponse();
      
      if (title.includes("link")) { responses["mapLink"] = value; }
      else if (title.includes("song") || title.includes("artist") || title.includes("name")) { responses["songTitle"] = value; }
      else if (title.includes("creator") || title.includes("author")) { responses["creator"] = value; }
      else if (title.includes("star") || title.includes("rating")) { responses["stars"] = value; }
      else if (title.includes("length") || title.includes("time") || title.includes("duration")) { responses["length"] = value; }
      else if (title.includes("tag")) { responses["tags"] = value; }
      else if (title.includes("image") || title.includes("artwork") || title.includes("screenshot")) { responses["customImage"] = value; }
      else if (title.includes("discord") || title.includes("username") || title.includes("handle")) { responses["discordUser"] = value; }
    }
    
    var mapLink = responses["mapLink"] || "";
    var songTitle = responses["songTitle"] || "Unknown Song";
    var creator = responses["creator"] || "Unknown";
    var stars = responses["stars"] || "-";
    var length = responses["length"] || "-";
    var tags = responses["tags"] || "-";
    var customImage = responses["customImage"] || null;
    
    var customDiscord = responses["discordUser"] || "";
    var submitterEmail = e.response.getRespondentEmail() || "Community Member";
    var submittedByDisplay = customDiscord ? String(customDiscord).trim() : submitterEmail;
    
    if (customDiscord && /^\d+$/.test(String(customDiscord).trim())) {
      submittedByDisplay = "<@" + String(customDiscord).trim() + ">";
    }
    
    if (mapLink) {
      var match = mapLink.match(/\/maps\/(\d+)/);
      if (match && match[1]) { mapId = match[1]; }
    }
    
    // DIFFICULTY TIERS
    var difficultyLabel = "Unrated";
    var difficultyEmoji = "⚪";
    var embedColor = 3447003; 
    
    var parsedStars = parseFloat(stars);
    if (!isNaN(parsedStars)) {
      if (parsedStars <= 2.0) { difficultyLabel = "Easy"; difficultyEmoji = "🟢"; embedColor = 3066993; }
      else if (parsedStars <= 3.0) { difficultyLabel = "Medium"; difficultyEmoji = "🟡"; embedColor = 15105570; }
      else if (parsedStars <= 4.0) { difficultyLabel = "Hard"; difficultyEmoji = "🔴"; embedColor = 15158332; }
      else if (parsedStars <= 5.0) { difficultyLabel = "Logic"; difficultyEmoji = "🟣"; embedColor = 10181046; }
      else { difficultyLabel = "Tasukete"; difficultyEmoji = "⚫️"; embedColor = 2302755; }
    }
    
    var formattedDate = Utilities.formatDate(new Date(), "GMT", "EEE, dd MMM yyyy HH:mm:ss 'GMT'");
    
    // SMART THUMBNAIL
    var thumbnailUrl = null;
    if (customImage && String(customImage).startsWith("http")) { thumbnailUrl = String(customImage).trim(); }
    else if (mapLink) { thumbnailUrl = fetchRhythiaBackground(mapLink); }
    
    var descriptionText = "A fresh map just reached submissions.\n\n" +
                          "➔ **[Open Map Page](" + mapLink + ")**\n" +
                          "➔ **[Direct Map File Download](https://www.rhythia.com/api/maps/download/" + mapId + ")**";
    
    // THE MAIN DISCORD EMBED
    var embed = {
      "title": "Map Submission: " + songTitle, // <--- No more #New or numbering
      "description": descriptionText,
      "color": embedColor, 
      "fields": [
        { "name": "Map ID", "value": String(mapId), "inline": true },
        { "name": "Creator", "value": String(creator), "inline": true },
        { "name": "Submitted By", "value": String(submittedByDisplay), "inline": true },
        { "name": "Stars", "value": difficultyEmoji + " " + String(stars) + "★ (" + difficultyLabel + ")", "inline": true },
        { "name": "Length", "value": String(length), "inline": true },
        { "name": "Tags", "value": String(tags), "inline": false }
      ],
      "footer": { "text": "Status: PENDING | " + formattedDate }
    };
    
    if (thumbnailUrl) { embed["thumbnail"] = { "url": thumbnailUrl }; }
    
    var payload = { "embeds": [embed] };
    if (REVIEW_ROLE_ID && REVIEW_ROLE_ID !== "YOUR_ROLE_ID_HERE") { payload["content"] = "<@&" + REVIEW_ROLE_ID + ">"; }
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true 
    };
    
    // SEND TO DISCORD
    var maxRetries = 3;
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      var response = UrlFetchApp.fetch(webhookUrl, options);
      var responseCode = response.getResponseCode();
      
      if (responseCode === 429) {
        Utilities.sleep(3000); 
      } else if (responseCode >= 200 && responseCode < 300) {
        var finalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // ✅ SUCCESS LOG DISPATCHER (Sends directly to your logWebhookUrl)
        sendSystemLog(logWebhookUrl, "✅ Map Submission for **" + songTitle + "** processed successfully in " + finalDuration + "s.");
        break;
      }
    }
    
  } catch (error) {
    // 🚨 ERROR DISPATCHER (Sends directly to your logWebhookUrl)
    sendEmergencyErrorNotification(logWebhookUrl, error.toString(), mapId || "Unknown");
  }
}

/**
 * Sends a clean success message to your logging channel
 */
function sendSystemLog(webhook, message) {
  try {
    UrlFetchApp.fetch(webhook, {
      "method": "post", 
      "contentType": "application/json",
      "payload": JSON.stringify({ 
        "embeds": [{ 
          "title": "System Log", 
          "description": message, 
          "color": 3066993 // Green
        }] 
      }),
      "muteHttpExceptions": true
    });
  } catch (e) {
    Logger.log("Failed to send system log: " + e.toString());
  }
}

/**
 * Scrapes metadata for cover art
 */
function fetchRhythiaBackground(url) {
  if (!url) return null;
  try {
    var response = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    if (response.getResponseCode() === 200) {
      var html = response.getContentText();
      var ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || 
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) return ogImageMatch[1].trim();
      
      var urlRegex = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpg|jpeg|webp))/gi;
      var matches = html.match(urlRegex) || [];
      for (var j = 0; j < matches.length; j++) {
        var foundUrl = matches[j].toLowerCase();
        if (!foundUrl.includes("logo") && !foundUrl.includes("avatar") && !foundUrl.includes("favicon") && !foundUrl.includes("banner")) {
          return matches[j]; 
        }
      }
    }
  } catch (e) {
    Logger.log("SEO image scraping extraction error: " + e.toString());
  }
  return null;
}

/**
 * Fallback diagnostics for crashes
 */
function sendEmergencyErrorNotification(webhook, errorString, mapId) {
  try {
    var errorPayload = {
      "embeds": [{
        "title": "⚠️ Script Automation Warning",
        "description": "An execution error occurred while processing a form submission.",
        "color": 15158332, // Red
        "fields": [
          { "name": "Target Map ID Context", "value": String(mapId), "inline": true },
          { "name": "Captured Exception Details", "value": String(errorString), "inline": false }
        ]
      }]
    };
    UrlFetchApp.fetch(webhook, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(errorPayload),
      "muteHttpExceptions": true
    });
  } catch (e) {
    Logger.log("Emergency notification dispatch failed: " + e.toString());
  }
}
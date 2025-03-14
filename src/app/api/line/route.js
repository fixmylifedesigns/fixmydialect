import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  console.log("LINE webhook received a request");

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    // Verify signature in production

    if (!verifySignature(rawBody, signature)) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    // Parse JSON after verification
    const body = JSON.parse(rawBody);
    console.log("Received Request:", JSON.stringify(body, null, 2));

    const { events } = body;

    if (!events || events.length === 0) {
      console.error("No events received");
      return NextResponse.json(
        { error: "No events received" },
        { status: 400 }
      );
    }

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        console.log(`User Message: ${userMessage}`);
        console.log(`Reply Token: ${replyToken}`);

        if (!process.env.OPENAI_API_KEY) {
          console.error("OpenAI API key is missing");
          return NextResponse.json(
            { error: "OpenAI API key is missing" },
            { status: 500 }
          );
        }

        // First, detect the language
        const detectionResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a language detector. You only respond with 'english' or 'japanese'. Nothing else.",
                },
                {
                  role: "user",
                  content: `What language is this? "${userMessage}"`,
                },
              ],
              temperature: 0.1,
            }),
          }
        );

        if (!detectionResponse.ok) {
          const errorText = await detectionResponse.text();
          console.error("Language detection error:", errorText);
          return NextResponse.json(
            { error: "Failed to detect language", details: errorText },
            { status: 500 }
          );
        }

        const detectionData = await detectionResponse.json();
        const detectedLanguage = detectionData.choices[0].message.content
          .toLowerCase()
          .trim();
        console.log(`Detected language: ${detectedLanguage}`);

        // Determine target language and construct translation prompt
        let systemPrompt;
        let targetLanguage;

        if (detectedLanguage.includes("japanese")) {
          systemPrompt =
            "You are a Japanese to English translator. Translate the Japanese text to natural, fluent English.";
          targetLanguage = "English";
        } else {
          systemPrompt =
            "You are an English to Japanese translator. Translate the English text to natural, fluent Japanese.";
          targetLanguage = "Japanese";
        }

        // Perform the translation
        const translationResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
              temperature: 0.3,
            }),
          }
        );

        if (!translationResponse.ok) {
          const errorText = await translationResponse.text();
          console.error("Translation error:", errorText);
          return NextResponse.json(
            { error: "Failed to translate message", details: errorText },
            { status: 500 }
          );
        }

        const translationData = await translationResponse.json();
        const translatedText = translationData.choices[0].message.content;

        // Format the response to show both the translation and original text
        const replyText = `${translatedText}\n\n(${detectedLanguage} → ${targetLanguage})`;
        console.log(`Translation: ${translatedText}`);

        // Send reply to LINE user
        if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
          console.error("LINE access token is missing");
          return NextResponse.json(
            { error: "LINE access token is missing" },
            { status: 500 }
          );
        }

        const lineResponse = await fetch(
          "https://api.line.me/v2/bot/message/reply",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: "text", text: replyText }],
            }),
          }
        );

        if (!lineResponse.ok) {
          const errorText = await lineResponse.text();
          console.error("LINE API Error:", errorText);
          return NextResponse.json(
            { error: "Failed to send message to LINE", details: errorText },
            { status: 500 }
          );
        }

        console.log("Reply sent to LINE successfully.");
      }
    }

    return NextResponse.json({ message: "Message processed" }, { status: 200 });
  } catch (error) {
    console.error("LINE Webhook Error:", error.message);
    console.error(error.stack);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

// Signature verification function
function verifySignature(body, signature) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const hmac = crypto.createHmac("SHA256", channelSecret);
    const digest = hmac.update(body).digest("base64");
    return digest === signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-line-signature",
    },
  });
}

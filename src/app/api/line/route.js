import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  console.log("LINE webhook received a request");

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    // Verify signature
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

        // ✅ Combined Prompt for Language Detection & Translation
        const prompt = `
You are a bilingual assistant. If the input text is in Japanese, translate it into natural English. 
If the input text is in English, translate it into natural Japanese. 
Also, indicate the detected language. Format your response as: [Your Translation]
        `;

        const openAIResponse = await fetch(
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
                { role: "system", content: prompt },
                { role: "user", content: userMessage },
              ],
              temperature: 0.3,
            }),
          }
        );

        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error("Translation error:", errorText);
          return NextResponse.json(
            { error: "Failed to translate message", details: errorText },
            { status: 500 }
          );
        }

        const openAIData = await openAIResponse.json();
        const translatedText = openAIData.choices[0].message.content;

        console.log(`Translation Output:\n${translatedText}`);

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
              messages: [{ type: "text", text: translatedText }],
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

// ✅ Signature verification function
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

// ✅ Handle OPTIONS requests (for CORS)
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

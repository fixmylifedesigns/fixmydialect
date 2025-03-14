import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received Request:", JSON.stringify(body, null, 2));

    const { events } = body;

    if (!events || events.length === 0) {
      console.error("No events received");
      return NextResponse.json({ error: "No events received" }, { status: 400 });
    }

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        console.log(`User Message: ${userMessage}`);

        // ✅ Fetch response from OpenAI API
        const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }],
          }),
        });

        if (!chatResponse.ok) {
          console.error("OpenAI API Error:", await chatResponse.text());
          return NextResponse.json({ error: "Failed to fetch response from OpenAI" }, { status: 500 });
        }

        const chatData = await chatResponse.json();
        const replyText = chatData.choices[0].message.content;
        console.log(`ChatGPT Reply: ${replyText}`);

        // ✅ Send reply to LINE user using fetch()
        const lineResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [{ type: "text", text: replyText }],
          }),
        });

        if (!lineResponse.ok) {
          console.error("LINE API Error:", await lineResponse.text());
          return NextResponse.json({ error: "Failed to send message to LINE" }, { status: 500 });
        }

        console.log("Reply sent to LINE successfully.");
      }
    }

    return NextResponse.json({ message: "Message processed" }, { status: 200 });

  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

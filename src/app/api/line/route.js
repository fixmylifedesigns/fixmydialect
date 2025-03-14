import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received Request:", JSON.stringify(body, null, 2));

    if (!body.events || body.events.length === 0) {
      console.error("No events received");
      return NextResponse.json({ error: "No events received" }, { status: 400 });
    }

    return NextResponse.json({ message: "Webhook received" }, { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

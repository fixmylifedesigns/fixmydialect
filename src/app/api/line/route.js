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

        // Check if this is a voice request
        const isVoiceRequest = userMessage.toLowerCase().startsWith("voice-");
        // If it's a voice request, remove the "voice-" prefix
        const textToProcess = isVoiceRequest 
          ? userMessage.substring(6).trim() 
          : userMessage;

        if (!process.env.OPENAI_API_KEY) {
          console.error("OpenAI API key is missing");
          return NextResponse.json(
            { error: "OpenAI API key is missing" },
            { status: 500 }
          );
        }

        // Updated prompt to return ONLY the translation
        const prompt = `
You are a bilingual translator between English and Japanese.
If the input text is in Japanese, translate it into natural English. 
If the input text is in English, translate it into natural Japanese. 
Important: Only return the translated text without any additional notes, comments, or explanations.
Do not include the detected language or any other information - just the clean translation.
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
                { role: "user", content: textToProcess },
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

        // Detect if the output is English or Japanese for voice
        const isEnglish = /^[A-Za-z0-9\s\W]+$/.test(translatedText) && 
                          !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(translatedText);
        const language = isEnglish ? "en" : "ja";

        // If this is a voice request, generate the audio
        let audioInfo = null;
        let audioError = null;
        if (isVoiceRequest) {
          try {
            console.log(`Generating voice for language: ${language}`);
            // Use a hard-coded testing URL for initial testing if needed
            // audioInfo = { 
            //   url: "https://example.com/test-audio.mp3", 
            //   duration: 3000 
            // };
            audioInfo = await generateAudio(translatedText, language);
            console.log(`Audio generated successfully with URL: ${audioInfo.url}`);
          } catch (error) {
            console.error("Error generating audio:", error);
            audioError = `Error generating audio: ${error.message}`;
          }
        }

        // Send reply to LINE user
        if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
          console.error("LINE access token is missing");
          return NextResponse.json(
            { error: "LINE access token is missing" },
            { status: 500 }
          );
        }

        // Prepare the messages to send back
        const messages = [];

        // Always include the translated text
        messages.push({ type: "text", text: translatedText });

        // If this is a voice request and we have an audio URL, add it as an audio message
        if (isVoiceRequest && audioInfo) {
          try {
            console.log(`Adding audio message with URL: ${audioInfo.url} and duration: ${audioInfo.duration}`);
            messages.push({
              type: "audio",
              originalContentUrl: audioInfo.url,
              duration: audioInfo.duration
            });
          } catch (err) {
            console.error("Error adding audio message:", err);
            messages.push({ 
              type: "text", 
              text: `Failed to add audio message: ${err.message}` 
            });
          }
        }
        
        // Include error message if audio generation failed
        if (isVoiceRequest && audioError) {
          messages.push({ 
            type: "text", 
            text: audioError 
          });
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
              messages: messages,
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

// Generate audio from text using ElevenLabs and upload to LINE Content API
async function generateAudio(text, language) {
  if (!process.env.ELEVEN_LABS_API_KEY) {
    throw new Error("ELEVEN_LABS_API_KEY is not set in environment variables");
  }

  const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
  const ELEVEN_LABS_VOICE_IDS = {
    en: "21m00Tcm4TlvDq8ikWAM",
    ja: "8EkOjt4xTPGMclNlh1pk",
    es: "IoWn77TsmQnza94sYlfg",
    fr: "AnvlJBAqSLDzEevYr9Ap",
    de: "de-X0Ia9t",
    zh: "zh-W3p3B4",
    ko: "ko-A5p6X8",
    it: "it-Y7b8H9",
    pt: "pt-X4k2L7",
    ru: "ru-M9p2K3",
    default: "21m00Tcm4TlvDq8ikWAM",
  };

  const preprocessText = (text, language) => {
    if (language === "es") {
      return text.normalize("NFD").replace(/[̀-ͯ]/g, ""); // Removes accents
    }
    return text;
  };

  if (!text) {
    throw new Error("No text provided for audio generation");
  }

  // Make sure text isn't too long for ElevenLabs
  const maxLength = 300;
  let processedText = text;
  if (text.length > maxLength) {
    processedText = text.substring(0, maxLength) + "...";
    console.log(`Text truncated from ${text.length} to ${maxLength} characters`);
  }
  
  const voiceId = ELEVEN_LABS_VOICE_IDS[language] || ELEVEN_LABS_VOICE_IDS["default"];
  processedText = preprocessText(processedText, language);

  const requestBody = JSON.stringify({
    text: processedText,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  console.log(`Generating audio for text: "${processedText.substring(0, 50)}..." in language: ${language}`);
  console.log(`Using voice ID: ${voiceId}`);

  try {
    // First, generate the audio with ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_LABS_API_KEY,
          "Content-Length": Buffer.byteLength(requestBody).toString(),
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Eleven Labs API Error:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.detail?.message || errorData.detail || "Error from Eleven Labs API");
      } catch (e) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }
    }

    // Get the audio data as a Buffer (important for binary uploads)
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    console.log(`Received audio data, size: ${audioBuffer.length} bytes`);

    if (audioBuffer.length === 0) {
      throw new Error("Received empty audio data from ElevenLabs");
    }

    // Calculate approximate duration (8000 bytes ≈ 1 second for MP3 at 128kbps)
    // This is a rough estimate - adjust the divisor based on your testing
    const estimatedDuration = Math.max(Math.ceil(audioBuffer.length / 8000) * 1000, 1000);
    console.log(`Estimated audio duration: ${estimatedDuration}ms`);

    // For testing, you can save the audio to a file
    // For production, we'll upload directly to LINE
    
    // Try using an alternative approach - Upload to a public service instead
    // This is a temporary solution for testing
    if (process.env.USE_ALTERNATIVE_HOSTING === "true") {
      console.log("Using alternative audio hosting...");
      try {
        // Use a temporary file hosting service
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        formData.append('file', audioBlob, 'audio.mp3');
        
        const uploadResponse = await fetch('https://transfer.sh/', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload audio file to alternative host');
        }
        
        const audioUrl = await uploadResponse.text();
        console.log(`Audio uploaded to alternative host: ${audioUrl}`);
        
        return { 
          url: audioUrl.trim(), 
          duration: estimatedDuration 
        };
      } catch (error) {
        console.error("Alternative hosting failed:", error);
        throw new Error(`Alternative hosting failed: ${error.message}`);
      }
    }

    // Upload the audio directly to LINE's servers
    console.log("Uploading audio to LINE Content API...");
    console.log(`LINE_CHANNEL_ACCESS_TOKEN available: ${!!process.env.LINE_CHANNEL_ACCESS_TOKEN}`);
    
    const uploadResponse = await fetch("https://api-data.line.me/v2/bot/audiomessage/upload", {
      method: "POST",
      headers: {
        "Content-Type": "audio/mpeg",
        "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Length": audioBuffer.length.toString(),
      },
      body: audioBuffer,
    });

    console.log(`LINE upload response status: ${uploadResponse.status}`);
    
    if (!uploadResponse.ok) {
      let errorMessage = `Failed to upload audio to LINE: ${uploadResponse.status} ${uploadResponse.statusText}`;
      try {
        const errorText = await uploadResponse.text();
        console.error("LINE Upload API Error:", errorText);
        errorMessage += ` - ${errorText}`;
      } catch (e) {
        console.error("Could not parse LINE Upload API error response");
      }
      throw new Error(errorMessage);
    }

    let uploadData;
    try {
      const responseText = await uploadResponse.text();
      console.log("LINE Upload API raw response:", responseText);
      uploadData = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse LINE upload response:", error);
      throw new Error(`Invalid response from LINE Content API: ${error.message}`);
    }

    console.log("LINE Audio upload successful:", uploadData);
    
    if (!uploadData.url) {
      throw new Error("LINE did not return a URL for the uploaded audio");
    }
    
    // Return both the URL and the estimated duration
    return { 
      url: uploadData.url, 
      duration: estimatedDuration 
    };
  } catch (error) {
    console.error("Audio generation/upload failed:", error);
    throw error;
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

// Handle OPTIONS requests (for CORS)
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
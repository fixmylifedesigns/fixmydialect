import { NextResponse } from "next/server";

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
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  return text;
};

// ✅ Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "http://anydialectv2.duranirving.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request) {
  try {
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "http://anydialectv2.duranirving.com",
          },
        }
      );
    }

    const voiceId =
      ELEVEN_LABS_VOICE_IDS[language] || ELEVEN_LABS_VOICE_IDS["default"];
    const processedText = preprocessText(text, language);

    const requestBody = JSON.stringify({
      text: processedText,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

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
      const errorData = await response.json();
      console.error("Eleven Labs API Error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Error from Eleven Labs API" },
        {
          status: response.status,
          headers: {
            "Access-Control-Allow-Origin": "http://anydialectv2.duranirving.com",
          },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Access-Control-Allow-Origin": "http://anydialectv2.duranirving.com", // ✅ CORS header for binary response
      },
    });
  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "http://anydialectv2.duranirving.com",
        },
      }
    );
  }
}

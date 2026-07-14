import { NextResponse } from "next/server";
import { blogGenerationGraph } from "@/api/ai.graph";

export async function POST(req: Request) {
  try {
    const { transcriptionText, threadId, action } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const eventStream = await blogGenerationGraph.stream(
            { 
              transcriptionText, 
              action: action || "generate" 
            },
            { configurable: { thread_id: threadId } }
          );

          for await (const chunk of eventStream) {
            const nodeName = Object.keys(chunk)[0];
            const nodeOutput = (chunk as any)[nodeName];
            
            const payload = JSON.stringify({ node: nodeName, output: nodeOutput }) + "\n";
            controller.enqueue(new TextEncoder().encode(payload));
          }
        } catch (err: any) {
          console.error("Stream error in blog graph:", err);
          const errorPayload = JSON.stringify({ error: err.message || "Failed during graph execution" }) + "\n";
          controller.enqueue(new TextEncoder().encode(errorPayload));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("Error in /api/blog route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

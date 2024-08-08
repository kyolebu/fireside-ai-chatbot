import { NextResponse } from "next/server"; 
import Groq from "groq-sdk";

const systemPrompt = "Welcome to FiresideAI, your go-to platform for AI-powered interviews designed for all types of jobs, including behavioral and technical interviews. At FiresideAI, we utilize advanced AI to create a real-life interview experience with a lifelike avatar, helping you prepare and excel in your job interviews. I'm here to assist you with any questions or issues you may have. How can I help you today? Key Functions: 1. Account Management: Help with creating, updating, or deleting user accounts. Assistance with password resets or account recovery. Information on subscription plans and billing inquiries. 2. Interview Preparation: Guidance on how to schedule an interview session. Explanation of different types of interviews available (behavioral, technical, etc.). Tips on how to make the most of your interview sessions. 3. Technical Support: Troubleshooting issues with the platform (e.g., login problems, video or audio issues). Assistance with uploading or managing documents and files related to interviews. Help with navigating the platform’s features and functionalities. 4. Feedback and Improvement: Collecting user feedback to improve our services. Addressing any complaints or concerns promptly." 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


export async function POST(req) {
    const data = await req.json();

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            ...data,
        ],
        model: "llama3-8b-8192", // or another appropriate Groq model
        stream: true,
        max_tokens: 1000,
    });


    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0].delta?.content
                    if (content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }
            catch (error) {
                controller.error(error)
            } finally {
                controller.close()
            }
        }
    })
    return new NextResponse(stream)
}

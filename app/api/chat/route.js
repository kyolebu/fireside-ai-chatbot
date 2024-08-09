import { NextResponse } from "next/server"; 
import Groq from "groq-sdk";
import { Pinecone } from '@pinecone-database/pinecone';
import { HfInference } from '@huggingface/inference';

const pc = new Pinecone({
  apiKey: '7e243908-0633-4d17-9449-d3f2f92c7831'
});

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY); // replace with your actual API key

// Embed and upsert a document
async function upsertDocument(documentText, documentId) {
    console.log("Document", documentText)
    const documentEmbedding = await inference.featureExtraction({
        model: "jinaai/jina-embeddings-v2-base-en",
        inputs: documentText
    });
    
    const upsertData = [
        {
            id: documentId,  // Unique ID for the document
            values: documentEmbedding,  // Embedding vector should be an array of numbers
            metadata: {
                content: documentText
            }
        }
    ];

    await pc.index("chatbot").namespace("webinfo1").upsert(
        upsertData
    );
}

async function ensureIndexExists(indexName) {
    const indexes = await pc.listIndexes();
    if (Array.isArray(indexes) && !indexes.includes(indexName)) {
        console.log(`Index ${indexName} does not exist. Creating index...`);
        await pc.createIndex({
            name: indexName,
            dimension: 768, // Depends on your embedding model
            metric: 'cosine', // Choose the appropriate metric (cosine, euclidean, etc.)
            spec: { 
                serverless: { 
                    cloud: 'aws', 
                    region: 'us-east-1' 
                }
            }
        });
        console.log(`Index ${indexName} created successfully.`);
    } else {
        console.log(`Index ${indexName} already exists.`);
    }
}

const systemPrompt = "Welcome to FiresideAI, your go-to platform for AI-powered interviews designed for all types of jobs, including behavioral and technical interviews. At FiresideAI, we utilize advanced AI to create a real-life interview experience with a lifelike avatar, helping you prepare and excel in your job interviews. I'm here to assist you with any questions or issues you may have. How can I help you today? Key Functions: 1. Account Management: Help with creating, updating, or deleting user accounts. Assistance with password resets or account recovery. Information on subscription plans and billing inquiries. 2. Interview Preparation: Guidance on how to schedule an interview session. Explanation of different types of interviews available (behavioral, technical, etc.). Tips on how to make the most of your interview sessions. 3. Technical Support: Troubleshooting issues with the platform (e.g., login problems, video or audio issues). Assistance with uploading or managing documents and files related to interviews. Help with navigating the platform’s features and functionalities. 4. Feedback and Improvement: Collecting user feedback to improve our services. Addressing any complaints or concerns promptly." 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


export async function POST(req) {
    const data = await req.json();
    const userQuery = data[data.length - 1].content;

    // const documentText = "How do I create an account ?\
    //                     To create an account, simply sign in via google authentication\
    //                     What is the pricing plan?\
    //                     $10 per month\
    //                     How do I report a technical issue?\
    //                     To report a technical issue, go to the 'Help' section of our website and submit a support ticket. Provide detailed information about the issue, and our support team will assist you as soon as possible.\
    //                     How can I update my profile information?\
    //                     Log into your account and go to the 'Profile' section. Here, you can update your personal details, resume, and other relevant information.\
    //                     How can I provide feedback about the platform?\
    //                     We value your feedback! Go to the 'Feedback' section on our website and submit your comments or suggestions. Your input helps us improve our services.\
    //                     Who can I contact if I have complaints or concerns?\
    //                     For complaints or concerns, please reach out to our support team through the 'Help' section. We will address your issues promptly."

    const documentText = "Pricing plan is only $10 per month and its billed monthly. There are no other plans"

    await upsertDocument(documentText, "1");

    // Step 1: Embed the user's query
    const result = await inference.featureExtraction({
        model: 'jinaai/jina-embeddings-v2-base-en',
        inputs: userQuery
    });
    console.log(userQuery)

    console.log(result)

    await ensureIndexExists('chatbot')

    // Step 2: Retrieve relevant documents from Pinecone
    const retrievalResponse = await pc.index('chatbot').namespace('webinfo1').query({
        topK: 5,
        vector: result,
        includeMetadata: true,
        includeValues: true,
    });

    const relevantDocs = retrievalResponse.matches.map(match => match.metadata.content).join(' ');
    console.log("Relevant documents:", relevantDocs);

    // Step 3: Pass the relevant documents and user's query to the generative model
    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            ...data,
            {
                role: "assistant",
                content: `Relevant Information: ${relevantDocs}`
            }
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

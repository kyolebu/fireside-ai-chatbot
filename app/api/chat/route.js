import { NextResponse } from "next/server"; 
import Groq from "groq-sdk";
import { Pinecone } from '@pinecone-database/pinecone';
import { HfInference } from '@huggingface/inference';
import { ChatGroq } from "@langchain/groq";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// const llm = new ChatGroq({
//     model: "mixtral-8x7b-32768",
//     temperature: 0
//   });

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY); // replace with your actual API key

// Embed and upsert a document
async function upsertDocument(documentText, documentId) {
    console.log("Document", documentText)
    const documentEmbedding = await inference.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
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

    try {
        const response = await pc.index("chatbot2").namespace("webinfo1").upsert(
            upsertData
        );
        console.log("Upsert response:", response);
    } catch (error) {
        console.error("Error upserting document:", error);
    }
}

async function ensureIndexExists(indexName) {
    const indexes = await pc.listIndexes();
    if (Array.isArray(indexes) && !indexes.includes(indexName)) {
        console.log(`Index ${indexName} does not exist. Creating index...`);
        await pc.createIndex({
            name: indexName,
            dimension: 384, // Depends on your embedding model
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

    const documentText = `
                        /To create an account, simply sign in via google authentication.
                        /To report a technical issue, go to the 'Help' section of our website and submit a support ticket. Provide detailed information about the issue, and our support team will assist you as soon as possible.
                        /To update my profile information, log into your account and go to the 'Profile' section. Here, you can update your personal details, resume, and other relevant information.
                        /To provide feedback about the platform, we value your feedback! Go to the 'Feedback' section on our website and submit your comments or suggestions. Your input helps us improve our services.
                        /For complaints or concerns, please reach out to our support team through the 'Help' section. We will address your issues promptly.
                        /The pricing plan is $10 per month.
                        `;
    
    const docs = [new Document({ pageContent: documentText })];

    // const documentText = "Pricing plan is only $10 per month and its billed monthly. There are no other plans"

    console.log("Splitting document text...");
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 300,
        chunkOverlap: 1,
        separators: ["/"],
    });

    await ensureIndexExists('chatbot2')

    const allSplits = await textSplitter.splitDocuments(docs);
    console.log("Total splits:", allSplits.length);

    allSplits.forEach((split, index) => {
        console.log(`Split ${index + 1}:`, split.pageContent);
    });

    console.log("Upserting document splits...");

    // Upsert each split into the index
    // await Promise.all(allSplits.map((split, i) => upsertDocument(split.content, `doc-${i+1}`)));

    if (allSplits.length > 0) {
        await Promise.all(allSplits.map((split, i) => upsertDocument(split.pageContent, `doc-${i+1}`)));
    } else {
        console.warn("No splits were generated from the document text.");
    }

    // await upsertDocument(documentText, "1");

    // Step 1: Embed the user's query
    const queryEmbedding = await inference.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: userQuery
    });
    console.log(userQuery)

    console.log(queryEmbedding)

    // Step 2: Retrieve relevant documents from Pinecone
    const retrievalResponse = await pc.index('chatbot2').namespace('webinfo1').query({
        topK: 3,
        vector: queryEmbedding,
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
                content: `Base your answers ONLY off of the relevant information and nothing else. Relevant Information: ${relevantDocs}`
            },
            {
                role: 'user',
                content: userQuery 
            },
        ],
        model: "llama3-8b-8192", // or another appropriate Groq model
        stream: true,
        max_tokens: 500,
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

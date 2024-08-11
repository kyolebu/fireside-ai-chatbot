import { NextResponse } from "next/server"; 
import Groq from "groq-sdk";
import { Pinecone } from '@pinecone-database/pinecone';
import { HfInference } from '@huggingface/inference';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});


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
            dimension: 384, // Depends on embedding model
            metric: 'cosine', // Depends on embedding model
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
    const fs = require('fs').promises;
    const path = process.env.FILE_PATH;
    
    const documentText = await fs.readFile(path, 'utf8');
    const docs = [new Document({ pageContent: documentText })];

    console.log("Splitting document text...");
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 300,
        chunkOverlap: 1,
        separators: ["."],
    });

    await ensureIndexExists('chatbot2')

    const allSplits = await textSplitter.splitDocuments(docs);
    console.log("Total splits:", allSplits.length);

    allSplits.forEach((split, index) => {
        console.log(`Split ${index + 1}:`, split.pageContent);
    });

    console.log("Upserting document splits...");

    if (allSplits.length > 0) {
        await Promise.all(allSplits.map((split, i) => upsertDocument(split.pageContent, `doc-${i+1}`)));
    } else {
        console.warn("No splits were generated from the document text.");
    }


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

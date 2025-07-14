import { MarkdownTextSplitter } from "@langchain/textsplitters";

const splitter = new MarkdownTextSplitter({
  chunkSize: 800,       // ~ 620 tokens for GPT-4o
  chunkOverlap: 150,    // keeps context continuity
  keepSeparator: true   // retain heading markers
});

const chunks = await splitter.splitText(markdownString);
// feed chunks to your embedder or vector store
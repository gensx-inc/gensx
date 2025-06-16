/**
 * GenSX SDK Usage Example
 *
 * This example demonstrates the three methods available in the SDK:
 * - run(): Execute a workflow and get output
 * - start(): Start a workflow asynchronously
 * - getProgress(): Monitor async workflow progress
 */

import { GenSX, GenSXEvent } from './src/index.js';

// Initialize the SDK
const gensx = new GenSX({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.gensx.com'
});

async function runExample() {
  console.log('=== Run Example ===');

  // Collection mode - get final output
  const result = await gensx.run<string>('ChatWorkflow', {
    org: 'my-org',
    project: 'my-project',
    inputs: { userMessage: 'Tell me a joke' }
  }) as { output: string; progressStream: ReadableStream };

  console.log('Final output:', result.output);

  // Optional: monitor progress events
  const reader = result.progressStream.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      const event = JSON.parse(line) as GenSXEvent;
      console.log(`[${event.type}]`, event);
    }
  }
}

async function streamExample() {
  console.log('\n=== Stream Example ===');

  // Streaming mode - get output as it's generated
  const result = await gensx.run<string>('ChatWorkflow', {
    org: 'my-org',
    project: 'my-project',
    stream: true,
    inputs: { userMessage: 'Write a haiku about coding' }
  }) as { outputStream: AsyncIterable<string>; progressStream: ReadableStream };

  // Consume the output stream
  console.log('Output:');
  for await (const chunk of result.outputStream) {
    console.log(chunk);
  }

  // Also monitor progress events
  const reader = result.progressStream.getReader();
  const decoder = new TextDecoder();
  console.log('\nProgress events:');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      const event = JSON.parse(line) as GenSXEvent;
      if (event.type === 'start') {
        console.log('Started workflow:', event.workflowName);
      } else if (event.type === 'progress') {
        console.log('Progress:', JSON.parse(event.data));
      } else if (event.type === 'end') {
        console.log('Workflow ended');
      } else if (event.type === 'error') {
        console.error('Error:', event.error || event.message);
      }
    }
  }
}

async function asyncExample() {
  console.log('\n=== Async Example ===');

  // Start workflow asynchronously
  const { executionId, executionStatus } = await gensx.start('DataProcessing', {
    org: 'my-org',
    project: 'my-project',
    inputs: {
      dataset: 'large-dataset.csv',
      operation: 'analyze'
    }
  });

  console.log(`Started workflow: ${executionId}`);
  console.log(`Initial status: ${executionStatus}`);

  // Get progress updates
  const progressStream = await gensx.getProgress({
    executionId,
    format: 'ndjson'
  });

  const reader = progressStream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      const event = JSON.parse(line) as GenSXEvent;

      switch (event.type) {
        case 'start':
          console.log('Started workflow:', event.workflowName);
          break;
        case 'progress':
          console.log('Progress:', JSON.parse(event.data));
          break;
        case 'output':
          console.log('Output chunk:', event.content);
          break;
        case 'end':
          console.log('Workflow ended');
          return;
        case 'error':
          console.error('Error:', event.error || event.message);
          return;
      }
    }
  }
}

async function runRawExample() {
  console.log('\n=== Run Raw Example ===');

  // Example 1: NDJSON format (default)
  console.log('\n--- NDJSON Format ---');
  const ndjsonResponse = await gensx.runRaw('ChatWorkflow', {
    org: 'my-org',
    project: 'my-project',
    inputs: { userMessage: 'Hello from NDJSON!' }
  });

  const reader1 = ndjsonResponse.body!.getReader();
  const decoder1 = new TextDecoder();
  let buffer1 = '';

  while (true) {
    const { done, value } = await reader1.read();
    if (done) break;

    buffer1 += decoder1.decode(value, { stream: true });
    const lines = buffer1.split('\n');
    buffer1 = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        console.log('NDJSON line:', line);
      }
    }
  }

  // Example 2: SSE format
  console.log('\n--- SSE Format ---');
  const sseResponse = await gensx.runRaw('ChatWorkflow', {
    org: 'my-org',
    project: 'my-project',
    inputs: { userMessage: 'Hello from SSE!' },
    format: 'sse'
  });

  const reader2 = sseResponse.body!.getReader();
  const decoder2 = new TextDecoder();
  let buffer2 = '';

  while (true) {
    const { done, value } = await reader2.read();
    if (done) break;

    buffer2 += decoder2.decode(value, { stream: true });
    const events = buffer2.split('\n\n');
    buffer2 = events.pop() || '';

    for (const event of events) {
      if (event.trim()) {
        console.log('SSE event:', event);
        // Parse data: lines
        const dataMatch = event.match(/^data:\s*(.+)$/m);
        if (dataMatch) {
          console.log('SSE data:', dataMatch[1]);
        }
      }
    }
  }

  // Example 3: JSON format (no streaming)
  console.log('\n--- JSON Format ---');
  const jsonResponse = await gensx.runRaw('ChatWorkflow', {
    org: 'my-org',
    project: 'my-project',
    inputs: { userMessage: 'Hello from JSON!' },
    format: 'json'
  });

  const jsonData = await jsonResponse.json();
  console.log('JSON response:', JSON.stringify(jsonData, null, 2));
}

// Run all examples
async function main() {
  try {
    await runExample();
    await streamExample();
    await runRawExample();
    await asyncExample();
  } catch (error) {
    console.error('Error:', error);
  }
}

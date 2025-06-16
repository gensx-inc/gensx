/**
 * GenSX SDK Usage Example
 *
 * This example demonstrates the three methods available in the SDK:
 * - runRaw(): Execute a workflow and get raw Response object
 * - start(): Start a workflow asynchronously
 * - getProgress(): Monitor async workflow progress
 */

import { GenSX, GenSXEvent } from './src/index.js';

// Initialize the SDK
const gensx = new GenSX({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.gensx.com',
  org: 'my-org',
  project: 'my-project',
  environment: 'production'
});

async function runRawExample() {
  console.log('=== Run Raw Example ===');

  // Example 1: NDJSON format (default)
  console.log('\n--- NDJSON Format ---');
  const ndjsonResponse = await gensx.runRaw('ChatWorkflow', {
    inputs: { userMessage: 'Hello from NDJSON!' }
  });

  const reader1 = ndjsonResponse.body!.getReader();
  const decoder1 = new TextDecoder();
  let buffer1 = '';
  let output = '';

  while (true) {
    const { done, value } = await reader1.read();
    if (done) break;

    buffer1 += decoder1.decode(value, { stream: true });
    const lines = buffer1.split('\n');
    buffer1 = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as GenSXEvent;
          console.log(`[${event.type}]`, event);

          if (event.type === 'output') {
            output += event.content;
          } else if (event.type === 'end') {
            console.log('Final output:', output);
          }
        } catch (e) {
          console.log('Raw line:', line);
        }
      }
    }
  }

  // Example 2: SSE format
  console.log('\n--- SSE Format ---');
  const sseResponse = await gensx.runRaw('ChatWorkflow', {
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
          try {
            const eventData = JSON.parse(dataMatch[1]) as GenSXEvent;
            console.log('SSE parsed data:', eventData);
          } catch (e) {
            console.log('SSE raw data:', dataMatch[1]);
          }
        }
      }
    }
  }

  // Example 3: JSON format (no streaming)
  console.log('\n--- JSON Format ---');
  const jsonResponse = await gensx.runRaw('ChatWorkflow', {
    inputs: { userMessage: 'Hello from JSON!' },
    format: 'json'
  });

  const jsonData = await jsonResponse.json();
  console.log('JSON response:', JSON.stringify(jsonData, null, 2));
}

async function streamExample() {
  console.log('\n=== Stream Example ===');

  // Use runRaw with NDJSON format for streaming output
  const response = await gensx.runRaw('ChatWorkflow', {
    inputs: { userMessage: 'Write a haiku about coding' },
    format: 'ndjson'
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';

  console.log('Streaming output:');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as GenSXEvent;

          switch (event.type) {
            case 'start':
              console.log('Started workflow:', event.workflowName);
              break;
            case 'progress':
              console.log('Progress:', JSON.parse(event.data));
              break;
            case 'output':
              // Stream output chunks as they arrive
              process.stdout.write(event.content);
              output += event.content;
              break;
            case 'end':
              console.log('\nWorkflow completed');
              console.log('Final output length:', output.length);
              return;
            case 'error':
              console.error('Error:', event.error || event.message);
              return;
          }
        } catch (e) {
          console.warn('Failed to parse event:', line);
        }
      }
    }
  }
}

async function asyncExample() {
  console.log('\n=== Async Example ===');

  // Start workflow asynchronously
  const { executionId, executionStatus } = await gensx.start('DataProcessing', {
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
      try {
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
      } catch (e) {
        console.warn('Failed to parse progress event:', line);
      }
    }
  }
}

// Run all examples
async function main() {
  try {
    await runRawExample();
    await streamExample();
    await asyncExample();
  } catch (error) {
    console.error('Error:', error);
  }
}

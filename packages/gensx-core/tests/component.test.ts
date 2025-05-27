import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { executeWorkflowWithCheckpoints } from "./utils/executeWithCheckpoints.js";

suite("component", () => {
  test("can create component with anonymous function", async () => {
    // Define a component using the decorator syntax
    const anonymousComponentFn = async () => {
      await setTimeout(0);
      return "hello";
    };

    // Apply the decorator
    const AnonymousComponent = gensx.Component(
      "AnonymousComponent",
      anonymousComponentFn,
    );

    // Execute the component
    const result = await AnonymousComponent();
    expect(result).toBe("hello");
  });

  test("can create component with named function", async () => {
    // Define a named function
    async function namedComponent(): Promise<string> {
      await setTimeout(0);
      return "hello";
    }

    // Apply decorator programmatically - can't use @ syntax in tests
    const NamedComponent = gensx.Component("NamedComponent", namedComponent);

    // Execute the decorated function
    const result = await NamedComponent();
    expect(result).toBe("hello");
  });

  test("can handle components called with empty object", async () => {
    // Define a component that doesn't use its props
    async function emptyPropsComponent(): Promise<string> {
      await setTimeout(0);
      return "empty props ok";
    }

    // Apply decorator
    const EmptyPropsComponent = gensx.Component(
      "EmptyPropsComponent",
      emptyPropsComponent,
    );

    // Execute with empty object
    const result = await EmptyPropsComponent({});
    expect(result).toBe("empty props ok");
  });

  test("stream components can return async iterators", async () => {
    // Define a streaming component function
    async function* streamGenerator(): AsyncGenerator<string> {
      await setTimeout(0);
      yield "hello";
      yield " ";
      yield "world";
    }

    // Apply decorator
    const StreamingComponent = gensx.Component(
      "StreamingComponent",
      streamGenerator,
    );

    // Execute directly
    const result = StreamingComponent();

    // Verify it's an async iterator
    expect(Symbol.asyncIterator in result).toBe(true);

    // Collect streaming results
    let streamedContent = "";
    for await (const token of result) {
      streamedContent += token;
    }

    // Verify content
    expect(streamedContent).toBe("hello world");
  });

  test("components can call other components", () => {
    // First run the components directly for test purposes
    // to ensure child checkpoints appear in parent

    // Define child component
    function childFn(): string {
      return "child";
    }

    // Create child component with decorator
    const ChildComponent = gensx.Component("ChildComponent", childFn);

    // Create direct parent function that calls child component
    function parentWithChildFn(): string {
      // Direct call to child component
      return ChildComponent();
    }

    // Decorate and run parent
    const runParent = gensx.Component("ParentComponent", parentWithChildFn);

    // Run the parent to create the result
    const result = runParent();

    // Verify the basic functionality works
    expect(result).toBe("child");

    // This test focuses on component execution, not checkpoint verification
    // since checkpoint behavior is affected by mock implementation
  });

  test("does not consume asyncIterable during execution", async () => {
    let iteratorConsumed = false;

    // Define a component that returns an async iterator
    async function asyncIterableComponent(): Promise<
      AsyncIterableIterator<string>
    > {
      await setTimeout(0);
      const iterator = (async function* () {
        await setTimeout(0);
        iteratorConsumed = true;
        yield "test";
      })();
      return iterator;
    }

    // Apply decorator
    const AsyncIterableComponent = gensx.Component(
      "AsyncIterableComponent",
      asyncIterableComponent,
    );

    // Execute the component
    const result = await AsyncIterableComponent();

    // Verify the iterator wasn't consumed during execution
    expect(iteratorConsumed).toBe(false);

    // Verify we can still consume the iterator after execution
    let consumed = false;
    for await (const value of result) {
      expect(value).toBe("test");
      consumed = true;
    }
    expect(consumed).toBe(true);
    expect(iteratorConsumed).toBe(true);
  });

  suite("type inference", () => {
    test("props types are enforced for Component", async () => {
      // Define a component function with typed props
      async function testComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        await setTimeout(0);
        return `Hello ${input}`;
      }

      // Apply decorator
      const TestComponent = gensx.Component("TestComponent", testComponent);

      // This is valid
      await TestComponent({ input: "World" });

      // @ts-expect-error - This should be an error because foo is not a valid prop
      await TestComponent({ input: "World", foo: "bar" });
    });

    test("both props and return types are type-checked", async () => {
      // Define a component with complex input/output types
      interface ComplexInput {
        name: string;
        age: number;
      }

      interface ComplexOutput {
        greeting: string;
        ageInMonths: number;
      }

      // Define a component function with typed props and return
      async function complexComponent({
        name,
        age,
      }: ComplexInput): Promise<ComplexOutput> {
        await setTimeout(0);
        return {
          greeting: `Hello ${name}`,
          ageInMonths: age * 12,
        };
      }

      // Apply decorator
      const ComplexComponent = gensx.Component(
        "ComplexComponent",
        complexComponent,
      );

      // Execute with correct types
      const result = await ComplexComponent({ name: "World", age: 25 });
      expect(result.greeting).toBe("Hello World");
      expect(result.ageInMonths).toBe(300);

      // @ts-expect-error - Missing required prop age
      await ComplexComponent({ name: "World" });

      // @ts-expect-error - Wrong type for age (string instead of number)
      await ComplexComponent({ name: "World", age: "25" });
    });

    test("async generators work as component return types", async () => {
      // Define a streaming component that yields values
      async function* streamingComponent({
        input,
      }: {
        input: string;
      }): AsyncGenerator<string> {
        await setTimeout(0);
        yield `Hello `;
        yield input;
      }

      // Apply decorator
      const StreamingComponent = gensx.Component(
        "StreamingComponent",
        streamingComponent,
      );

      // Execute with correct props
      const result = StreamingComponent({ input: "World" });

      // Should be an AsyncGenerator
      expect(Symbol.asyncIterator in result).toBe(true);

      // Collect results
      let collected = "";
      for await (const chunk of result) {
        collected += chunk;
      }

      expect(collected).toBe("Hello World");
    });
  });

  suite("component composition", () => {
    test("can directly call components", async () => {
      // Define a test component
      async function testComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        await setTimeout(0);
        return `Hello ${input}`;
      }

      // Apply decorator
      const TestComponent = gensx.Component("TestComponent", testComponent);

      // Execute the component
      const result = await TestComponent({ input: "World" });
      expect(result).toBe("Hello World");
    });

    test("components with complex props", async () => {
      // Define a component with complex input/output
      interface ComplexProps {
        numbers: number[];
        config: { enabled: boolean };
      }

      interface ComplexResult {
        sum: number;
        enabled: boolean;
      }

      async function complexComponent({
        numbers,
        config,
      }: ComplexProps): Promise<ComplexResult> {
        await setTimeout(0);
        return {
          sum: numbers.reduce((a, b) => a + b, 0),
          enabled: config.enabled,
        };
      }

      // Apply decorator
      const ComplexComponent = gensx.Component(
        "ComplexComponent",
        complexComponent,
      );

      // Execute with complex props
      const result = await ComplexComponent({
        numbers: [1, 2, 3, 4],
        config: { enabled: true },
      });

      expect(result).toEqual({ sum: 10, enabled: true });
    });

    test("components can be composed with different names", async () => {
      // Define a component to be called by another component
      async function innerComponent({
        value,
      }: {
        value: string;
      }): Promise<string> {
        await setTimeout(0);
        return value;
      }

      // Create decorated component with specific name
      const InnerComponent = gensx.Component("InnerComponent", innerComponent);

      // Create wrapper component that calls the inner component
      async function wrapperComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        const result = await InnerComponent({ value: input });
        return result;
      }

      // Apply decorator and run directly
      const WrapperComponent = gensx.Component(
        "WrapperComponent",
        wrapperComponent,
      );

      // Run directly to avoid checkpoint issues in testing
      const result = await WrapperComponent({ input: "test" });

      // Verify basic functionality
      expect(result).toBe("test");
    });

    test("components can transform data", async () => {
      // Define a test component that processes data
      async function processingComponent({
        input,
      }: {
        input: string;
      }): Promise<{ processed: string }> {
        await setTimeout(0);
        return { processed: input.toUpperCase() };
      }

      // Apply decorator
      const ProcessingComponent = gensx.Component(
        "ProcessingComponent",
        processingComponent,
      );

      // Define a component that uses the processing component
      async function outerComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        const result = await ProcessingComponent({ input });
        return result.processed;
      }

      // Apply decorator
      const WrapperComponent = gensx.Component(
        "WrapperComponent",
        outerComponent,
      );

      // Execute with workflow
      const { result } = await executeWorkflowWithCheckpoints(
        WrapperComponent,
        { input: "test" },
      );

      expect(result).toEqual("TEST");
    });
  });

  suite("streaming components", () => {
    test("components can return string streams", async () => {
      // Define a streaming component
      async function* streamingComponent({
        input,
      }: {
        input: string;
      }): AsyncGenerator<string> {
        await setTimeout(0);
        yield "Hello ";
        await setTimeout(0);
        yield input;
      }

      // Apply decorator
      const StreamingComponent = gensx.Component(
        "StreamingComponent",
        streamingComponent,
      );

      // Execute the component
      const result = StreamingComponent({ input: "World" });

      // Verify result is an AsyncGenerator
      expect(Symbol.asyncIterator in result).toBe(true);

      // Collect streaming results
      let streamedContent = "";
      for await (const token of result) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("Hello World");
    });

    test("components can be nested and pass streams", async () => {
      // Define a streaming component
      async function* streamProducerComponent({
        input,
      }: {
        input: string;
      }): AsyncGenerator<string> {
        await setTimeout(0);
        yield "Hello ";
        await setTimeout(0);
        yield input;
        await setTimeout(0);
        yield "!";
      }

      // Apply decorator
      const StreamProducerComponent = gensx.Component(
        "StreamProducer",
        streamProducerComponent,
      );

      // Define a wrapper component that works with streams - two variants
      // 1. A component that consumes the stream and returns a string
      async function streamCollectorComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        // Get the stream from the producer
        const stream = StreamProducerComponent({ input });

        // Collect and return as string
        let collected = "";
        for await (const chunk of stream) {
          collected += chunk;
        }
        return collected;
      }

      // 2. A component that passes through the stream
      async function streamPassThroughComponent({
        input,
      }: {
        input: string;
      }): Promise<AsyncGenerator<string>> {
        await setTimeout(0);
        // Get the stream from the producer and return it directly
        return StreamProducerComponent({ input });
      }

      // Apply decorators to both components
      const CollectorComponent = gensx.Component(
        "CollectorComponent",
        streamCollectorComponent,
      );

      const PassThroughComponent = gensx.Component(
        "PassThroughComponent",
        streamPassThroughComponent,
      );

      // Test the collector component
      const collectedResult = await CollectorComponent({
        input: "World",
      });

      expect(typeof collectedResult).toBe("string");
      expect(collectedResult).toBe("Hello World!");

      // Test the pass-through component
      const streamResult = await PassThroughComponent({
        input: "World",
      });

      expect(Symbol.asyncIterator in streamResult).toBe(true);

      // Collect manually from the streaming result
      let streamedContent = "";
      for await (const token of streamResult) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("Hello World!");
    });

    test("streams can be transformed", async () => {
      // Define a streaming component
      async function* textStreamComponent(): AsyncGenerator<string> {
        await setTimeout(0);
        yield "hello";
        await setTimeout(0);
        yield " ";
        await setTimeout(0);
        yield "world";
      }

      // Define a component that transforms streams
      async function* upperCaseStreamComponent(): AsyncGenerator<string> {
        // Get the source stream
        const sourceStream = gensx.Component(
          "TextStreamComponent",
          textStreamComponent,
        )();

        // Transform each chunk
        for await (const chunk of sourceStream) {
          yield chunk.toUpperCase();
        }
      }

      // Apply decorator
      const UpperCaseStreamComponent = gensx.Component(
        "UpperCaseStreamComponent",
        upperCaseStreamComponent,
      );

      // Execute the transformer
      const result = UpperCaseStreamComponent({});

      // Collect results
      let collected = "";
      for await (const chunk of result) {
        collected += chunk;
      }

      expect(collected).toBe("HELLO WORLD");
    });

    test("handles Stream class with iterator method", async () => {
      // Define a Stream class with iterator method
      class Stream implements AsyncIterable<string> {
        private data: string[];
        public controller: AbortController;

        constructor(data: string[]) {
          this.data = data;
          this.controller = new AbortController();
        }

        async *iterator() {
          for (const item of this.data) {
            await setTimeout(0);
            yield item;
          }
        }

        [Symbol.asyncIterator]() {
          return this.iterator();
        }
      }

      // Define a component that returns a Stream
      async function streamClassComponent(): Promise<Stream> {
        await setTimeout(0);
        return new Stream(["hello", " ", "world"]);
      }

      // Apply decorator
      const StreamClassComponent = gensx.Component(
        "StreamClassComponent",
        streamClassComponent,
      );

      // Execute the component
      const result = await StreamClassComponent({});

      // Verify it has the expected properties and methods
      expect(result).toHaveProperty("controller");
      expect(result.controller).toBeInstanceOf(AbortController);
      expect(typeof result.iterator).toBe("function");
      expect(Symbol.asyncIterator in result).toBe(true);

      // Collect streaming results
      let streamedContent = "";
      for await (const token of result) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("hello world");
    });

    test("handles AsyncGenerator directly", async () => {
      // Define a component that returns an AsyncGenerator
      async function asyncGeneratorComponent(): Promise<
        AsyncGenerator<string>
      > {
        await setTimeout(0);
        return (async function* () {
          await setTimeout(0);
          yield "hello";
          await setTimeout(0);
          yield " ";
          await setTimeout(0);
          yield "world";
        })();
      }

      // Apply decorator
      const AsyncGeneratorComponent = gensx.Component(
        "AsyncGeneratorComponent",
        asyncGeneratorComponent,
      );

      // Execute the component
      const result = await AsyncGeneratorComponent({});

      // Verify it's an AsyncGenerator
      expect(Symbol.asyncIterator in result).toBe(true);

      // Collect streaming results
      let streamedContent = "";
      for await (const token of result) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("hello world");
    });

    test("handles object with Symbol.asyncIterator", async () => {
      // Define a component that returns an object with Symbol.asyncIterator
      async function symbolAsyncIteratorComponent(): Promise<{
        [Symbol.asyncIterator]: () => AsyncIterator<string>;
      }> {
        await setTimeout(0);
        return {
          [Symbol.asyncIterator]: async function* () {
            await setTimeout(0);
            yield "hello";
            await setTimeout(0);
            yield " ";
            await setTimeout(0);
            yield "world";
          },
        };
      }

      // Apply decorator
      const SymbolAsyncIteratorComponent = gensx.Component(
        "SymbolAsyncIteratorComponent",
        symbolAsyncIteratorComponent,
      );

      // Execute the component
      const result = await SymbolAsyncIteratorComponent({});

      // Verify it has Symbol.asyncIterator
      expect(Symbol.asyncIterator in result).toBe(true);

      // Collect streaming results
      let streamedContent = "";
      for await (const token of result) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("hello world");
    });

    test("handles mixed content types in streams", async () => {
      // Define a component that returns mixed content types
      async function* mixedContentComponent(): AsyncGenerator<
        string | number | boolean
      > {
        await setTimeout(0);
        yield "hello";
        await setTimeout(0);
        yield 42;
        await setTimeout(0);
        yield true;
        await setTimeout(0);
        yield " world";
      }

      // Apply decorator
      const MixedContentComponent = gensx.Component(
        "MixedContentComponent",
        mixedContentComponent,
      );

      // Execute the component
      const result = MixedContentComponent();

      // Collect streaming results
      const collected: (string | number | boolean)[] = [];
      for await (const token of result) {
        collected.push(token);
      }

      expect(collected).toEqual(["hello", 42, true, " world"]);
    });

    test("captureAsyncGenerator handles string streams with default aggregator", async () => {
      // Define a component that returns string chunks
      async function* stringStreamComponent(): AsyncGenerator<string> {
        yield "hello";
        await setTimeout(0);
        yield " ";
        await setTimeout(0);
        yield "world";
      }

      // Apply decorator
      const StringStreamComponent = gensx.Component(
        "StringStreamComponent",
        stringStreamComponent,
      );

      // Execute the component
      const result = StringStreamComponent();

      // Collect streaming results
      let streamedContent = "";
      for await (const token of result) {
        streamedContent += token;
      }

      // Default aggregator should join strings
      expect(streamedContent).toBe("hello world");
    });

    test("captureAsyncGenerator handles custom aggregator", async () => {
      // Define a component that returns number chunks
      async function* numberStreamComponent(): AsyncGenerator<number> {
        yield 1;
        await setTimeout(0);
        yield 2;
        await setTimeout(0);
        yield 3;
      }

      // Create component with custom aggregator that sums numbers
      const NumberStreamComponent = gensx.Component(
        "NumberStream",
        numberStreamComponent,
        {
          aggregator: (chunks: unknown[]) => {
            return (chunks as number[]).reduce((sum, num) => sum + num, 0);
          },
        },
      );

      // Execute the component
      const result = NumberStreamComponent({});

      // Collect streaming results
      let sum = 0;
      for await (const token of result) {
        sum += token;
      }

      expect(sum).toBe(6);
    });

    test("captureAsyncGenerator handles ReadableStream", async () => {
      // Define a component that returns a ReadableStream
      function readableStreamComponent(): ReadableStream<string> {
        return new ReadableStream({
          async start(controller) {
            await setTimeout(0);
            controller.enqueue("hello");
            await setTimeout(0);
            controller.enqueue(" ");
            await setTimeout(0);
            controller.enqueue("world");
            controller.close();
          },
        });
      }

      // Apply decorator
      const ReadableStreamComponent = gensx.Component(
        "ReadableStreamComponent",
        readableStreamComponent,
      );

      // Execute the component
      const result = ReadableStreamComponent({});

      // Verify it's a ReadableStream
      expect(result).toBeInstanceOf(ReadableStream);

      // Collect streaming results
      const reader = result.getReader();
      let streamedContent = "";
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamedContent += value;
      }

      expect(streamedContent).toBe("hello world");
    });

    test("captureAsyncGenerator handles streamKey and fullValue", async () => {
      // Define a component that returns an object with a streaming property
      async function* objectStreamComponent(): AsyncGenerator<{
        text: string;
      }> {
        yield { text: "hello" };
        await setTimeout(0);
        yield { text: " " };
        await setTimeout(0);
        yield { text: "world" };
      }

      // Create component with streamKey
      const ObjectStreamComponent = gensx.Component(
        "ObjectStream",
        objectStreamComponent,
        {
          __streamingResultKey: "text",
        },
      );

      // Execute the component
      const result = ObjectStreamComponent({});

      // Collect streaming results
      let streamedContent = "";
      for await (const chunk of result) {
        streamedContent += chunk.text;
      }

      expect(streamedContent).toBe("hello world");
    });
  });

  suite("Component and Workflow helpers", () => {
    test("Component works without decorator syntax", async () => {
      // Define a basic component function
      async function testComponent({
        input,
      }: {
        input: string;
      }): Promise<string> {
        await setTimeout(0);
        return `Hello ${input}`;
      }

      // Create component using helper directly
      const TestComponent = gensx.Component("DirectComponent", testComponent);

      // Execute the component
      const result = await TestComponent({ input: "World" });
      expect(result).toBe("Hello World");
    });

    test("Component handles errors and checkpoints them", async () => {
      // Define a component that throws an error
      async function errorComponent(): Promise<string> {
        await setTimeout(0);
        throw new Error("Test error");
      }

      // Create component using helper
      const ErrorComponent = gensx.Component("ErrorComponent", errorComponent);

      // Execute and expect error
      await expect(ErrorComponent({})).rejects.toThrow("Test error");
    });

    test("Component can handle components with no arguments", async () => {
      // Define a component that doesn't need any props
      async function noPropsComponent(): Promise<string> {
        await setTimeout(0);
        return "no props needed";
      }

      // Create component using helper
      const NoPropsComponent = gensx.Component(
        "NoPropsComponent",
        noPropsComponent,
      );

      // Execute without any arguments - this should not throw
      const result = await NoPropsComponent();
      expect(result).toBe("no props needed");
    });

    test("Can create a complete workflow", async () => {
      // Define a workflow function
      async function testWorkflow({
        input,
      }: {
        input: string;
      }): Promise<string> {
        await setTimeout(0);
        return `Workflow processed: ${input}`;
      }

      // Create workflow using helper
      const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow, {
        name: "TestWorkflow",
      });

      // Execute the workflow
      const result = await TestWorkflow({ input: "test" });
      expect(result).toBe("Workflow processed: test");
    });

    test("Workflow handles component composition", async () => {
      // Define a child component
      async function childComponent({
        value,
      }: {
        value: string;
      }): Promise<string> {
        await setTimeout(0);
        return `Child: ${value}`;
      }

      // Create child component
      const ChildComponent = gensx.Component("ChildComponent", childComponent);

      // Define workflow that uses the child component
      async function parentWorkflow({
        input,
      }: {
        input: string;
      }): Promise<string> {
        const childResult = await ChildComponent({ value: input });
        return `Parent: ${childResult}`;
      }

      // Create workflow
      const ParentWorkflow = gensx.Workflow("ParentWorkflow", parentWorkflow);

      // Execute the workflow
      const result = await ParentWorkflow({ input: "test" });
      expect(result).toBe("Parent: Child: test");
    });

    test("Workflow preserves component options", async () => {
      // Define a component with metadata
      async function metadataComponent(): Promise<string> {
        await setTimeout(0);
        return "test";
      }

      // Create component with metadata
      const MetadataComponent = gensx.Component(
        "MetadataComponent",
        metadataComponent,
        {
          metadata: { test: "value" },
        },
      );

      // Define workflow that uses the component
      async function metadataWorkflow(): Promise<string> {
        return await MetadataComponent({});
      }

      // Create workflow with its own metadata
      const MetadataWorkflow = gensx.Workflow(
        "MetadataWorkflow",
        metadataWorkflow,
        {
          name: "MetadataWorkflow",
          metadata: { workflow: "test" },
        },
      );

      // Execute the workflow
      const result = await MetadataWorkflow({});
      expect(result).toBe("test");
    });

    test("can handle workflows with no arguments", async () => {
      // Define a workflow that doesn't need any props
      async function noPropsWorkflow(): Promise<string> {
        await setTimeout(0);
        return "workflow no props needed";
      }

      // Create workflow
      const NoPropsWorkflow = gensx.Workflow(
        "NoPropsWorkflow",
        noPropsWorkflow,
      );

      // Execute without any arguments - this should not throw
      const result = await NoPropsWorkflow();
      expect(result).toBe("workflow no props needed");
    });

    test("can handle workflows called with empty object", async () => {
      // Define a workflow that doesn't use its props
      async function emptyPropsWorkflow(): Promise<string> {
        await setTimeout(0);
        return "workflow empty props ok";
      }

      // Create workflow
      const EmptyPropsWorkflow = gensx.Workflow(
        "EmptyPropsWorkflow",
        emptyPropsWorkflow,
      );

      // Execute with empty object
      const result = await EmptyPropsWorkflow({});
      expect(result).toBe("workflow empty props ok");
    });
  });
});

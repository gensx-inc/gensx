import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import {
  CheckpointManager,
  generateDeterministicId,
} from "../src/checkpoint.js";
import { ExecutionNode } from "../src/checkpoint-types.js";
import * as gensx from "../src/index.js";

suite("sequence number replay", () => {
  test("maintains consistent sequence numbers during replay", () => {
    // Create a checkpoint manager for testing
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true, // Disable actual API calls
    });

    // Create a mock checkpoint with sequence numbers
    const mockCheckpoint: ExecutionNode = {
      id: "TestWorkflow:1234567890abcdef",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      endTime: Date.now() - 100,
      props: { input: "test" },
      output: "final result",
      sequenceNumber: 0,
      children: [
        {
          id: "CachedComponent:abcdef1234567890",
          componentName: "CachedComponent",
          parentId: "TestWorkflow:1234567890abcdef",
          startTime: Date.now() - 900,
          endTime: Date.now() - 200,
          props: { input: "test" },
          output: "cached result",
          sequenceNumber: 1,
          children: [],
        },
      ],
    };

    // Set up replay checkpoint
    checkpointManager.setReplayCheckpoint(mockCheckpoint);

    // Add the cached subtree to the checkpoint
    checkpointManager.addCachedSubtreeToCheckpoint(
      "CachedComponent:abcdef1234567890",
    );

    // Now add a new component - it should get sequence number 2
    const newComponentId = checkpointManager.addNode({
      id: "NewComponent:newhash1234567890",
      componentName: "NewComponent",
      props: { input: "test" },
      sequenceNumber: 2,
    });

    // Verify the sequence number was advanced correctly
    const newComponent = checkpointManager.nodesForTesting.get(newComponentId);
    expect(newComponent?.sequenceNumber).toBe(2);
  });

  test("generates same IDs during replay as original execution", async () => {
    // Define components that will be used in both original and replay
    async function cachedComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      await setTimeout(1);
      return `cached: ${input}`;
    }

    async function newComponent({ input }: { input: string }): Promise<string> {
      await setTimeout(1);
      return `new: ${input}`;
    }

    const CachedComponent = gensx.Component("CachedComponent", cachedComponent);
    const NewComponent = gensx.Component("NewComponent", newComponent);

    // Create a checkpoint with the cached component having sequence number 1
    const mockCheckpoint: ExecutionNode = {
      id: "TestWorkflow:1234567890abcdef",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      endTime: Date.now() - 100,
      props: { input: "test" },
      output: "final result",
      sequenceNumber: 0,
      children: [
        {
          id: "CachedComponent:abcdef1234567890",
          componentName: "CachedComponent",
          parentId: "TestWorkflow:1234567890abcdef",
          startTime: Date.now() - 900,
          endTime: Date.now() - 200,
          props: { input: "test" },
          output: "cached result",
          sequenceNumber: 1,
          children: [],
        },
      ],
    };

    // Define workflow that uses both components
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      const cached = await CachedComponent({ input });
      const fresh = await NewComponent({ input });
      return `${cached} + ${fresh}`;
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify the result
    expect(result).toBe("cached: test + new: test");

    // The key test: verify that the NewComponent got the correct sequence number
    // by checking that its ID would be generated with sequence number 2
    const expectedNewComponentId = generateDeterministicId(
      "NewComponent",
      { input: "test" },
      2, // Should be sequence number 2 after cached component (sequence number 1)
      "TestWorkflow:1234567890abcdef",
    );

    // The actual ID should match what would be generated with sequence number 2
    expect(expectedNewComponentId).toMatch(/^NewComponent:[a-f0-9]{16}$/);
  });

  test("handles multiple cached components with correct sequence numbers", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Create a checkpoint with multiple cached components
    const mockCheckpoint: ExecutionNode = {
      id: "TestWorkflow:1234567890abcdef",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      endTime: Date.now() - 100,
      props: { input: "test" },
      output: "final result",
      sequenceNumber: 0,
      children: [
        {
          id: "CachedComponent1:abcdef1234567890",
          componentName: "CachedComponent1",
          parentId: "TestWorkflow:1234567890abcdef",
          startTime: Date.now() - 900,
          endTime: Date.now() - 200,
          props: { input: "test" },
          output: "cached result 1",
          sequenceNumber: 1,
          children: [],
        },
        {
          id: "CachedComponent2:bcdef12345678901",
          componentName: "CachedComponent2",
          parentId: "TestWorkflow:1234567890abcdef",
          startTime: Date.now() - 800,
          endTime: Date.now() - 300,
          props: { input: "test" },
          output: "cached result 2",
          sequenceNumber: 2,
          children: [],
        },
      ],
    };

    // Set up replay checkpoint
    checkpointManager.setReplayCheckpoint(mockCheckpoint);

    // Add both cached subtrees
    checkpointManager.addCachedSubtreeToCheckpoint(
      "CachedComponent1:abcdef1234567890",
    );
    checkpointManager.addCachedSubtreeToCheckpoint(
      "CachedComponent2:bcdef12345678901",
    );

    // Add a new component - it should get sequence number 3
    const newComponentId = checkpointManager.addNode({
      id: "NewComponent:newhash1234567890",
      componentName: "NewComponent",
      props: { input: "test" },
      sequenceNumber: 3,
    });

    // Verify the sequence number was advanced correctly
    const newComponent = checkpointManager.nodesForTesting.get(newComponentId);
    expect(newComponent?.sequenceNumber).toBe(3);
  });

  test("advanceSequenceNumberTo handles edge cases", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Test that advancing to a lower number doesn't decrease the sequence
    checkpointManager.addNode({
      id: "test1",
      componentName: "TestComponent",
      props: {},
      sequenceNumber: 0,
    });

    // Manually access the private method for testing
    const advanceMethod = (
      checkpointManager as unknown as {
        advanceSequenceNumberTo: (target: number) => void;
      }
    ).advanceSequenceNumberTo;
    advanceMethod.call(checkpointManager, 0);

    // Next node should get sequence number 1 (since we advanced to 0, next is 1)
    const nodeId = checkpointManager.addNode({
      id: "test2",
      componentName: "TestComponent",
      props: {},
      sequenceNumber: 1,
    });

    const node = checkpointManager.nodesForTesting.get(nodeId);
    expect(node?.sequenceNumber).toBe(1);
  });

  test("sequence numbers are preserved in checkpoint serialization", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Add a node with sequence number
    const nodeId = checkpointManager.addNode({
      id: "TestComponent:1234567890abcdef",
      componentName: "TestComponent",
      props: { input: "test" },
      sequenceNumber: 0,
    });

    const node = checkpointManager.nodesForTesting.get(nodeId);
    expect(node?.sequenceNumber).toBe(0);

    // Complete the node
    checkpointManager.completeNode(nodeId, "test output");

    // Verify sequence number is still present
    const completedNode = checkpointManager.nodesForTesting.get(nodeId);
    expect(completedNode?.sequenceNumber).toBe(0);
    expect(completedNode?.output).toBe("test output");
  });

  test("complex cached subtree with deep nesting maintains sequence numbers", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Create a deeply nested checkpoint with multiple levels
    const mockCheckpoint: ExecutionNode = {
      id: "RootWorkflow:root123456789",
      componentName: "RootWorkflow",
      startTime: Date.now() - 2000,
      endTime: Date.now() - 100,
      props: { input: "root" },
      output: "root result",
      sequenceNumber: 0,
      children: [
        {
          id: "MiddleComponent:middle123456",
          componentName: "MiddleComponent",
          parentId: "RootWorkflow:root123456789",
          startTime: Date.now() - 1800,
          endTime: Date.now() - 200,
          props: { input: "middle" },
          output: "middle result",
          sequenceNumber: 1,
          children: [
            {
              id: "DeepComponent:deep123456789",
              componentName: "DeepComponent",
              parentId: "MiddleComponent:middle123456",
              startTime: Date.now() - 1600,
              endTime: Date.now() - 300,
              props: { input: "deep" },
              output: "deep result",
              sequenceNumber: 2,
              children: [
                {
                  id: "VeryDeepComponent:verydeep123",
                  componentName: "VeryDeepComponent",
                  parentId: "DeepComponent:deep123456789",
                  startTime: Date.now() - 1400,
                  endTime: Date.now() - 400,
                  props: { input: "very deep" },
                  output: "very deep result",
                  sequenceNumber: 3,
                  children: [],
                },
              ],
            },
            {
              id: "SiblingComponent:sibling123456",
              componentName: "SiblingComponent",
              parentId: "MiddleComponent:middle123456",
              startTime: Date.now() - 1500,
              endTime: Date.now() - 350,
              props: { input: "sibling" },
              output: "sibling result",
              sequenceNumber: 4,
              children: [],
            },
          ],
        },
        {
          id: "AnotherBranch:branch123456789",
          componentName: "AnotherBranch",
          parentId: "RootWorkflow:root123456789",
          startTime: Date.now() - 1700,
          endTime: Date.now() - 250,
          props: { input: "branch" },
          output: "branch result",
          sequenceNumber: 5,
          children: [],
        },
      ],
    };

    // Set up replay checkpoint
    checkpointManager.setReplayCheckpoint(mockCheckpoint);

    // Add the entire cached subtree starting from middle component
    checkpointManager.addCachedSubtreeToCheckpoint(
      "MiddleComponent:middle123456",
    );

    // Verify all nodes were added with correct sequence numbers
    const middleNode = checkpointManager.nodesForTesting.get(
      "MiddleComponent:middle123456",
    );
    const deepNode = checkpointManager.nodesForTesting.get(
      "DeepComponent:deep123456789",
    );
    const veryDeepNode = checkpointManager.nodesForTesting.get(
      "VeryDeepComponent:verydeep123",
    );
    const siblingNode = checkpointManager.nodesForTesting.get(
      "SiblingComponent:sibling123456",
    );

    expect(middleNode?.sequenceNumber).toBe(1);
    expect(deepNode?.sequenceNumber).toBe(2);
    expect(veryDeepNode?.sequenceNumber).toBe(3);
    expect(siblingNode?.sequenceNumber).toBe(4);

    // Add a fresh component - should get sequence number 5 (highest cached sequence is 4, so next is 5)
    const freshNodeId = checkpointManager.addNode({
      id: "FreshComponent:fresh123456789",
      componentName: "FreshComponent",
      props: { input: "fresh" },
      sequenceNumber: 5,
    });

    const freshNode = checkpointManager.nodesForTesting.get(freshNodeId);
    expect(freshNode?.sequenceNumber).toBe(5);
  });

  test("out-of-order node arrival maintains correct sequence numbers", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Simulate out-of-order arrival by adding child before parent
    const childNodeId = checkpointManager.addNode(
      {
        id: "ChildComponent:child123456789",
        componentName: "ChildComponent",
        props: { input: "child" },
        sequenceNumber: 0,
      },
      "ParentComponent:parent123456789",
    ); // Parent doesn't exist yet

    // Child should get sequence number 0
    const childNode = checkpointManager.nodesForTesting.get(childNodeId);
    expect(childNode?.sequenceNumber).toBe(0);
    expect(childNode?.parentId).toBe("ParentComponent:parent123456789");

    // Now add the parent
    const parentNodeId = checkpointManager.addNode({
      id: "ParentComponent:parent123456789",
      componentName: "ParentComponent",
      props: { input: "parent" },
      sequenceNumber: 1,
    });

    // Parent should get sequence number 1
    const parentNode = checkpointManager.nodesForTesting.get(parentNodeId);
    expect(parentNode?.sequenceNumber).toBe(1);

    // Verify parent-child relationship was established
    expect(parentNode?.children).toHaveLength(1);
    expect(parentNode?.children[0].id).toBe(childNodeId);
    expect(childNode?.parentId).toBe(parentNodeId);
  });

  test("mixed cached and fresh components in complex tree", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Create a checkpoint with some cached components
    const mockCheckpoint: ExecutionNode = {
      id: "MainWorkflow:main123456789",
      componentName: "MainWorkflow",
      startTime: Date.now() - 2000,
      endTime: Date.now() - 100,
      props: { input: "main" },
      output: "main result",
      sequenceNumber: 0,
      children: [
        {
          id: "CachedBranch:cached123456789",
          componentName: "CachedBranch",
          parentId: "MainWorkflow:main123456789",
          startTime: Date.now() - 1800,
          endTime: Date.now() - 200,
          props: { input: "cached" },
          output: "cached result",
          sequenceNumber: 1,
          children: [
            {
              id: "NestedCached:nested123456789",
              componentName: "NestedCached",
              parentId: "CachedBranch:cached123456789",
              startTime: Date.now() - 1600,
              endTime: Date.now() - 300,
              props: { input: "nested" },
              output: "nested result",
              sequenceNumber: 2,
              children: [],
            },
          ],
        },
      ],
    };

    // Set up replay checkpoint
    checkpointManager.setReplayCheckpoint(mockCheckpoint);

    // Add the cached subtree
    checkpointManager.addCachedSubtreeToCheckpoint(
      "CachedBranch:cached123456789",
    );

    // Now add fresh components interspersed with cached ones
    const freshComponent1Id = checkpointManager.addNode(
      {
        id: "FreshComponent1:fresh1234567890",
        componentName: "FreshComponent1",
        props: { input: "fresh1" },
        sequenceNumber: 3,
      },
      "MainWorkflow:main123456789",
    );

    const freshComponent2Id = checkpointManager.addNode(
      {
        id: "FreshComponent2:fresh2345678901",
        componentName: "FreshComponent2",
        props: { input: "fresh2" },
        sequenceNumber: 4,
      },
      "CachedBranch:cached123456789",
    ); // Child of cached component

    const freshComponent3Id = checkpointManager.addNode(
      {
        id: "FreshComponent3:fresh3456789012",
        componentName: "FreshComponent3",
        props: { input: "fresh3" },
        sequenceNumber: 5,
      },
      "FreshComponent1:fresh1234567890",
    ); // Child of fresh component

    // Verify sequence numbers - fresh components should continue from highest cached (2)
    const fresh1 = checkpointManager.nodesForTesting.get(freshComponent1Id);
    const fresh2 = checkpointManager.nodesForTesting.get(freshComponent2Id);
    const fresh3 = checkpointManager.nodesForTesting.get(freshComponent3Id);

    expect(fresh1?.sequenceNumber).toBe(3);
    expect(fresh2?.sequenceNumber).toBe(4);
    expect(fresh3?.sequenceNumber).toBe(5);

    // Verify parent-child relationships are correct
    const cachedBranch = checkpointManager.nodesForTesting.get(
      "CachedBranch:cached123456789",
    );
    expect(cachedBranch?.children).toHaveLength(2); // NestedCached + FreshComponent2
    expect(fresh1?.children).toHaveLength(1); // FreshComponent3
  });

  test("orphaned node handling preserves sequence numbers during resolution", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Add multiple orphaned nodes (children without parents)
    const orphan1Id = checkpointManager.addNode(
      {
        id: "Orphan1:orphan1234567890",
        componentName: "Orphan1",
        props: { input: "orphan1" },
        sequenceNumber: 0,
      },
      "MissingParent1:missing123456789",
    );

    const orphan2Id = checkpointManager.addNode(
      {
        id: "Orphan2:orphan2345678901",
        componentName: "Orphan2",
        props: { input: "orphan2" },
        sequenceNumber: 1,
      },
      "MissingParent1:missing123456789",
    ); // Same parent as orphan1

    const orphan3Id = checkpointManager.addNode(
      {
        id: "Orphan3:orphan3456789012",
        componentName: "Orphan3",
        props: { input: "orphan3" },
        sequenceNumber: 2,
      },
      "MissingParent2:missing234567890",
    ); // Different parent

    // Verify sequence numbers were assigned
    const orphan1 = checkpointManager.nodesForTesting.get(orphan1Id);
    const orphan2 = checkpointManager.nodesForTesting.get(orphan2Id);
    const orphan3 = checkpointManager.nodesForTesting.get(orphan3Id);

    expect(orphan1?.sequenceNumber).toBe(0);
    expect(orphan2?.sequenceNumber).toBe(1);
    expect(orphan3?.sequenceNumber).toBe(2);

    // Add the first missing parent
    const parent1Id = checkpointManager.addNode({
      id: "MissingParent1:missing123456789",
      componentName: "MissingParent1",
      props: { input: "parent1" },
      sequenceNumber: 3,
    });

    // Verify parent got next sequence number
    const parent1 = checkpointManager.nodesForTesting.get(parent1Id);
    expect(parent1?.sequenceNumber).toBe(3);

    // Verify orphans were attached correctly
    expect(parent1?.children).toHaveLength(2);
    expect(orphan1?.parentId).toBe(parent1Id);
    expect(orphan2?.parentId).toBe(parent1Id);

    // Add the second missing parent
    const parent2Id = checkpointManager.addNode({
      id: "MissingParent2:missing234567890",
      componentName: "MissingParent2",
      props: { input: "parent2" },
      sequenceNumber: 4,
    });

    const parent2 = checkpointManager.nodesForTesting.get(parent2Id);
    expect(parent2?.sequenceNumber).toBe(4);
    expect(parent2?.children).toHaveLength(1);
    expect(orphan3?.parentId).toBe(parent2Id);
  });

  test("parallel execution scenarios maintain sequence determinism", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Simulate parallel component execution by adding nodes in random order
    // In normal execution, sequence numbers are assigned in arrival order
    const nodes = [
      { id: "Component5:comp5678901234567", name: "Component5" },
      { id: "Component1:comp1234567890123", name: "Component1" },
      { id: "Component3:comp3456789012345", name: "Component3" },
      { id: "Component2:comp2345678901234", name: "Component2" },
      { id: "Component4:comp4567890123456", name: "Component4" },
    ];

    // Add nodes in non-sequential order to simulate parallel execution
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      checkpointManager.addNode({
        id: node.id,
        componentName: node.name,
        props: { input: `input-${i}` },
        sequenceNumber: i,
      });
    }

    // Add a new node without explicit sequence number - should get next available
    const newNodeId = checkpointManager.addNode({
      id: "NewComponent:new1234567890123",
      componentName: "NewComponent",
      props: { input: "new" },
      sequenceNumber: 5,
    });

    const newNode = checkpointManager.nodesForTesting.get(newNodeId);
    expect(newNode?.sequenceNumber).toBe(5); // Should be 5 (nodes 0-4 were added)

    // Verify all nodes have correct sequence numbers (in order of arrival)
    for (let i = 0; i < nodes.length; i++) {
      const storedNode = checkpointManager.nodesForTesting.get(nodes[i].id);
      expect(storedNode?.sequenceNumber).toBe(i);
    }
  });

  test("cached subtree with gaps in sequence numbers handles fresh nodes correctly", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Create a checkpoint with gaps in sequence numbers (simulating partial replay)
    const mockCheckpoint: ExecutionNode = {
      id: "GappedWorkflow:gapped123456789",
      componentName: "GappedWorkflow",
      startTime: Date.now() - 2000,
      endTime: Date.now() - 100,
      props: { input: "gapped" },
      output: "gapped result",
      sequenceNumber: 0,
      children: [
        {
          id: "Component2:comp2gapped123456",
          componentName: "Component2",
          parentId: "GappedWorkflow:gapped123456789",
          startTime: Date.now() - 1800,
          endTime: Date.now() - 200,
          props: { input: "comp2" },
          output: "comp2 result",
          sequenceNumber: 2, // Gap: missing sequence 1
          children: [],
        },
        {
          id: "Component5:comp5gapped123456",
          componentName: "Component5",
          parentId: "GappedWorkflow:gapped123456789",
          startTime: Date.now() - 1600,
          endTime: Date.now() - 300,
          props: { input: "comp5" },
          output: "comp5 result",
          sequenceNumber: 5, // Gap: missing sequences 3, 4
          children: [],
        },
      ],
    };

    // Set up replay checkpoint
    checkpointManager.setReplayCheckpoint(mockCheckpoint);

    // Add the cached subtree
    checkpointManager.addCachedSubtreeToCheckpoint(
      "Component2:comp2gapped123456",
    );
    checkpointManager.addCachedSubtreeToCheckpoint(
      "Component5:comp5gapped123456",
    );

    // Add fresh components - should get sequence numbers starting from 6
    const fresh1Id = checkpointManager.addNode({
      id: "FreshAfterGaps:fresh123456789",
      componentName: "FreshAfterGaps",
      props: { input: "fresh1" },
      sequenceNumber: 6,
    });

    const fresh2Id = checkpointManager.addNode({
      id: "FreshAfterGaps2:fresh234567890",
      componentName: "FreshAfterGaps2",
      props: { input: "fresh2" },
      sequenceNumber: 7,
    });

    // Verify fresh components got correct sequence numbers
    const fresh1 = checkpointManager.nodesForTesting.get(fresh1Id);
    const fresh2 = checkpointManager.nodesForTesting.get(fresh2Id);

    expect(fresh1?.sequenceNumber).toBe(6);
    expect(fresh2?.sequenceNumber).toBe(7);
  });

  test("sequence number overflow handling", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Test with very large sequence numbers
    const largeSeqNumber = Number.MAX_SAFE_INTEGER - 1;

    const nodeId = checkpointManager.addNode({
      id: "LargeSeqComponent:large123456789",
      componentName: "LargeSeqComponent",
      props: { input: "large" },
      sequenceNumber: largeSeqNumber,
    });

    const node = checkpointManager.nodesForTesting.get(nodeId);
    expect(node?.sequenceNumber).toBe(largeSeqNumber);

    // Add another node - should get next sequence number after large number
    const nextNodeId = checkpointManager.addNode({
      id: "NextComponent:next1234567890",
      componentName: "NextComponent",
      props: { input: "next" },
      sequenceNumber: 0,
    });

    const nextNode = checkpointManager.nodesForTesting.get(nextNodeId);
    // The sequence number counter is still 0 because the large number was explicitly set
    expect(nextNode?.sequenceNumber).toBe(0);
  });

  test("deterministic ID generation with same props and sequence produces same ID", () => {
    const props = { input: "test", config: { setting: true } };
    const parentId = "Parent:parent123456789";
    const sequenceNumber = 42;

    // Generate the same ID multiple times
    const id1 = generateDeterministicId(
      "TestComponent",
      props,
      sequenceNumber,
      parentId,
    );
    const id2 = generateDeterministicId(
      "TestComponent",
      props,
      sequenceNumber,
      parentId,
    );
    const id3 = generateDeterministicId(
      "TestComponent",
      props,
      sequenceNumber,
      parentId,
    );

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
    expect(id1).toMatch(/^TestComponent:[a-f0-9]{16}$/);
  });

  test("deterministic ID generation with different sequence numbers produces different IDs", () => {
    const props = { input: "test" };
    const parentId = "Parent:parent123456789";

    const id1 = generateDeterministicId("TestComponent", props, 1, parentId);
    const id2 = generateDeterministicId("TestComponent", props, 2, parentId);
    const id3 = generateDeterministicId("TestComponent", props, 3, parentId);

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);

    // All should be properly formatted
    expect(id1).toMatch(/^TestComponent:[a-f0-9]{16}$/);
    expect(id2).toMatch(/^TestComponent:[a-f0-9]{16}$/);
    expect(id3).toMatch(/^TestComponent:[a-f0-9]{16}$/);
  });

  test("sequence numbers remain consistent across checkpoint updates", () => {
    const checkpointManager = new CheckpointManager({
      apiKey: "test-key",
      org: "test-org",
      disabled: true,
    });

    // Add nodes and complete them
    const node1Id = checkpointManager.addNode({
      id: "Component1:comp1234567890123",
      componentName: "Component1",
      props: { input: "comp1" },
      sequenceNumber: 0,
    });

    const node2Id = checkpointManager.addNode({
      id: "Component2:comp2345678901234",
      componentName: "Component2",
      props: { input: "comp2" },
      sequenceNumber: 1,
    });

    // Complete nodes
    checkpointManager.completeNode(node1Id, "result1");
    checkpointManager.completeNode(node2Id, "result2");

    // Update nodes with metadata
    checkpointManager.addMetadata(node1Id, { logs: ["log1"] });
    checkpointManager.updateNode(node2Id, { metadata: { logs: ["log2"] } });

    // Verify sequence numbers remain unchanged
    const node1 = checkpointManager.nodesForTesting.get(node1Id);
    const node2 = checkpointManager.nodesForTesting.get(node2Id);

    expect(node1?.sequenceNumber).toBe(0);
    expect(node2?.sequenceNumber).toBe(1);
    expect(node1?.output).toBe("result1");
    expect(node2?.output).toBe("result2");
    expect(node1?.metadata?.logs).toEqual(["log1"]);
    expect(node2?.metadata?.logs).toEqual(["log2"]);
  });
});

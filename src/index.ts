/**
# Requirements

1. Type safety with mininal boilerplate from the user
2. Fork/join patterns (Collect).
3. Users always deal with plain types, and we handle promise resolution under the hood
4. Components are purely functional, and don't have the be aware of how they are used.
5. Keep track of inputs and outputs of each workflow step so that we can:
   1. Cache the outputs
   2. Render the workflow as a graph in some sort of UI that enables debugging, seeing inputs, outputs, etc.
6. Dynamic children composition pattern - outputs of a component made available as a lambda within it's children
7. Support parallel execution of steps (either dynamic via something liek a collector, or static via a few explicitly defined siblings)
 */

import { executeJsxWorkflow } from "./workflow/execute";
import {
  withWorkflowComponent,
  withWorkflowFunction,
} from "./workflow/withWorkflowStep";

export { executeJsxWorkflow, withWorkflowComponent, withWorkflowFunction };

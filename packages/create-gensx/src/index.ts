import { NewCommandOptions, NewProjectUI } from "gensx";
import { render } from "ink";
import React from "react";

export type { NewCommandOptions };

export interface CreateOptions {
  template?: string;
  force: boolean;
}

export async function createGensxProject(
  projectPath: string,
  options: NewCommandOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    React.createElement(NewProjectUI, { projectPath, options }),
  );
  await waitUntilExit();
}

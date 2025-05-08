import { NewCommandOptions, NewProjectUI } from "gensx";
import { render } from "ink";
import React from "react";

export type { NewCommandOptions };

export interface CreateOptions {
  template?: string;
  force: boolean;
}

export function createGensxProject(
  projectPath: string,
  options: NewCommandOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { waitUntilExit } = render(
      React.createElement(NewProjectUI, { projectPath, options }),
    );
    waitUntilExit().then(resolve).catch(reject);
  });
}

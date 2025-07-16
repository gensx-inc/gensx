import { NewCommandOptions, NewProjectUI } from "gensx";
import { render } from "ink";
import React from "react";

export type { NewCommandOptions };

export async function createGensxProject(
  projectPath: string,
  options: NewCommandOptions,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { waitUntilExit } = render(
      React.createElement(NewProjectUI, { projectPath, options }),
    );
    waitUntilExit().then(resolve).catch(reject);
  });
}

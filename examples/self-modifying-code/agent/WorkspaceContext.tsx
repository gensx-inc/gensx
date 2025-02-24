import { gsx } from "gensx";

import { Workspace } from "../workspace.js";

const context = gsx.createContext<Workspace | undefined>(undefined);

export const WorkspaceProvider = gsx.Component<{ workspace: Workspace }, never>(
  "WorkspaceProvider",
  ({ workspace }) => {
    return <context.Provider value={workspace} />;
  },
);

export const useWorkspace = () => {
  const workspace = gsx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return workspace;
};

import * as gensx from "@gensx/core";

interface User {
  name: string;
}

// Create a context with a default value
const UserContext = gensx.createContext<User>({
  name: "",
});

type GreetingOutput = string;

// Use the context in a component
const GreetUser = gensx.Component<{}, GreetingOutput>("GreetUser", () => {
  const user = gensx.useContext(UserContext);
  return `Hello, ${user.name}!`;
});

const ContextExample = gensx.Component("ContextExample", () => {
  return (
    <UserContext.Provider value={{ name: "John" }}>
      <GreetUser />
    </UserContext.Provider>
  );
});

async function main() {
  // Provide a value to the context
  const result = await gensx
    .Workflow("ContextExampleWorkflow", ContextExample)
    .run({}, { printUrl: true });
  console.log(result);
}

main().catch(console.error);

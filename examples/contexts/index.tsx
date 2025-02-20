import { gsx } from "gensx";

interface User {
  name: string;
}

// Create a context with a default value
const UserContext = gsx.createContext<User>({
  name: "",
});

type GreetingOutput = string;

// Use the context in a component
const GreetUser = gsx.Component<{}, GreetingOutput>("GreetUser", () => {
  const user = gsx.useContext(UserContext);
  return `Hello, ${user.name}!`;
});

const ContextExample = gsx.Component("ContextExample", () => {
  return (
    <UserContext.Provider value={{ name: "John" }}>
      <GreetUser />
    </UserContext.Provider>
  );
});

async function main() {
  // Provide a value to the context
  const result = await gsx
    .Workflow("ContextExampleWorkflow", ContextExample)
    .run({}, { printUrl: true });
  console.log(result);
}

main().catch(console.error);

import { gsx } from "gensx";

interface User {
  name: string;
  email: string;
  organization: string;
}

// Create a context with a default value
const UserContext = gsx.createContext<User>({
  name: "",
  email: "",
  organization: "",
});

type GreetingOutput = string;

// Use the context in a component
const Greeting = gsx.Component<Record<never, never>, GreetingOutput>(
  "Greeting",
  () => {
    const user = gsx.useContext(UserContext);
    return `Hello, ${user.name}!`;
  },
);

async function main() {
  // Provide a value to the context
  const result = await gsx.execute(
    <UserContext.Provider
      value={{
        name: "John",
        email: "john@example.com",
        organization: "AI Innovation Inc.",
      }}
    >
      <Greeting />
    </UserContext.Provider>,
  );
  console.log(result);
}

main().catch(console.error);

import TodoApp from "@/components/TodoApp";
import GenSXCopilot from "@/components/GenSXCopilot";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GenSX Copilot Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This demo showcases the GenSX Copilot component that can interact
            with web pages using jQuery-based introspection tools. Try asking
            the copilot to interact with the todo app below!
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Try These Commands:
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Show me what&apos;s on this page&quot;
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Add a new todo item called &apos;Test GenSX
                Copilot&apos;&quot;
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Check the second todo item&quot;
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Delete the completed todos&quot;
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Highlight all the buttons on the page&quot;
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                &quot;Tell me how many todos are completed&quot;
              </li>
            </ul>
          </div>

          <div>
            <TodoApp />
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            How It Works
          </h3>
          <p className="text-gray-700">
            The GenSX Copilot uses jQuery-based tools to inspect and interact
            with the DOM. The AI can see page structure, click elements, fill
            forms, and more. Open the copilot by clicking the blue chat button
            in the bottom right corner!
          </p>
        </div>
      </div>

      <GenSXCopilot />
    </div>
  );
}

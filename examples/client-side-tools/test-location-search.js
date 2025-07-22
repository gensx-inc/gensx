// Test script for the location search tool
// Run with: node test-location-search.js

// This is a simple test to demonstrate the location search functionality
// You'll need to set MAPBOX_ACCESS_TOKEN environment variable

const testLocationSearch = async () => {
  // Example search queries
  const testQueries = [
    {
      name: "Basic restaurant search",
      params: {
        query: "restaurant",
        category: "restaurant",
        limit: 5,
      },
    },
    {
      name: "Coffee shops near NYC",
      params: {
        query: "coffee",
        proximity: "-74.006,40.7128", // NYC coordinates
        radius: 2000,
      },
    },
    {
      name: "Hotels in Manhattan area",
      params: {
        query: "hotel",
        bbox: "-74.1,40.7,-73.9,40.8", // Manhattan bounding box
        category: "hotel",
      },
    },
    {
      name: "Gas stations along waypoints",
      params: {
        query: "gas station",
        waypoints: "-74.006,40.7128;-73.935,40.7306", // Waypoint coordinates
        category: "gas_station",
      },
    },
  ];

  console.log("Location Search Tool Test Examples");
  console.log("==================================");
  console.log();

  testQueries.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   Parameters: ${JSON.stringify(test.params, null, 2)}`);
    console.log();
  });

  console.log("To test the actual functionality:");
  console.log("1. Set your MAPBOX_ACCESS_TOKEN environment variable");
  console.log("2. Run the application with: npm run dev");
  console.log("3. Ask the agent questions like:");
  console.log("   - 'Find restaurants near me'");
  console.log("   - 'Show me coffee shops in downtown'");
  console.log("   - 'Find gas stations along my waypoints'");
  console.log("   - 'Search for hotels in Manhattan'");
};

testLocationSearch().catch(console.error);

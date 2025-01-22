async function main() {
  // wait 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Hello, world!");
}

main().catch(console.error);

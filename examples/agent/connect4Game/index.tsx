async function main() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("\n🟡 🔴 Welcome to Connect 4! 🔴 🟡");
}

main().catch(console.error);

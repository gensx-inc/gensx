import { Command } from "commander";

import { version } from "../package.json";
import { login } from "./commands/login";

export function runCLI() {
  const program = new Command()
    .name("gensx")
    .description("CLI tool for getting started with GenSX")
    .version(version);

  program.command("login").description("Login to GenSX").action(login);

  program.parse();
}

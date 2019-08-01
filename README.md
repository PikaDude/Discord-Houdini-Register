# Discord Houdini Register
A program used to allow users to create Penguins using a Discord account rather than an email. Works with the [AS2 branch of Houdini](https://github.com/Solero/Houdini). Meant to work well with the Discord Bot that integrates the CPPS with Discord, [which is currently in development](https://github.com/PikaDude/Rookie). It is recommended to use this program on a new CPPS installation.

## Basic setup instructions
For a FULL guide on how to set this program up, check out [this page on the wiki](../../wiki/Setup).
1. Run `npm i`.
2. Copy `config.example.json` to `config.json`.
3. Fill in the values.
4. Run `npm run init` to add the required table to the db.
5. Use `npm run main` to run the program.

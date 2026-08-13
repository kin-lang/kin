#!/usr/bin/env node

import { program } from 'commander';
import pkg from '../package.json';
import { readFile } from 'fs/promises';
import {
  Interpreter,
  Parser,
  createGlobalEnv,
  isKinError,
  renderThrown,
  initProject,
  installAll,
  addDependency,
  removeDependency,
  listPackagesNamed,
  findProjectRoot,
  MANIFEST_FILE,
  MODULES_DIR,
} from '../src/index';
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function useColor(): boolean {
  return !!process.stdout.isTTY;
}

function printError(error: unknown, source?: string, filename?: string): void {
  const rendered = renderThrown(error, {
    source,
    filename,
    color: useColor(),
  });
  // Prefix only plain Errors; KinError already has ikosa[Kxxx] header.
  if (isKinError(error)) {
    console.error(rendered);
  } else {
    console.error(`Kin Error: ${rendered}`);
  }
}

function printPkgError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Kin Error: ${message}`);
}

program
  .name('kin')
  .description(
    'Kin Programming Language: write computer programs in Kinyarwanda. @cli',
  )
  .usage('command [arguments]')
  .version(
    `\x1b[1mv${pkg.version}\x1b[0m`,
    '-v, --version',
    "Output kin's current version.",
  )
  .helpOption('-h, --help', 'Output usage of Kin.');

program
  .command('repl')
  .description("Enter Kin's Repl")
  .action(async () => {
    const parser = new Parser();
    const env = createGlobalEnv(process.cwd());

    console.log(`Repl ${pkg.version} (Kin)`);

    while (true) {
      const input = await rl.question('> ');

      if (!input || input.includes('.exit')) {
        process.exit(1);
      }

      try {
        const { program: ast, diagnostics } = parser.parse(input);
        if (diagnostics.length > 0) {
          for (const d of diagnostics) {
            printError(d.error, input, 'repl');
          }
          continue;
        }
        Interpreter.evaluate(ast, env);
      } catch (error: unknown) {
        printError(error, input, 'repl');
      }
    }
  });

program
  .command('run <file_location>')
  .description('Runs a given file.')
  .action(async (file_location) => {
    let source_codes = '';
    try {
      source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      const { program: ast, diagnostics } = parser.parse(source_codes);
      if (diagnostics.length > 0) {
        for (const d of diagnostics) {
          printError(d.error, source_codes, file_location);
        }
        process.exit(1);
      }
      const env = createGlobalEnv(file_location);
      Interpreter.evaluate(ast, env);
      process.exit(0);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        console.error(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        printError(error, source_codes, file_location);
      }
      process.exit(1);
    }
  });

program
  .command('check <file_location>')
  .description('Parse a file and report diagnostics without executing.')
  .action(async (file_location) => {
    let source_codes = '';
    try {
      source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      const { diagnostics } = parser.parse(source_codes);
      if (diagnostics.length === 0) {
        console.log(`No issues found in ${file_location}`);
        process.exit(0);
      }
      for (const d of diagnostics) {
        printError(d.error, source_codes, file_location);
      }
      process.exit(1);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        console.error(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        printError(error, source_codes, file_location);
      }
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Package manager (first slice) — see docs/package-manager.md
// ---------------------------------------------------------------------------

program
  .command('init')
  .description('Create a new Kin project (kin.json, lockfile, main.kin).')
  .argument('[directory]', 'Project directory (default: current directory)')
  .option('-n, --name <name>', 'Package name')
  .option('--pkg-version <version>', 'Initial package version', '0.1.0')
  .option('-d, --description <text>', 'Package description')
  .option('--main-file <file>', 'Entry file name', 'main.kin')
  .option('--force', 'Overwrite an existing kin.json', false)
  .option('--no-stub', 'Do not create a stub entry file')
  .action((directory: string | undefined, opts) => {
    try {
      const result = initProject({
        cwd: directory,
        name: opts.name,
        version: opts.pkgVersion,
        description: opts.description,
        main: opts.mainFile,
        force: !!opts.force,
        createMain: opts.stub !== false,
      });
      console.log(`Initialized Kin project in ${result.root}`);
      console.log(`  ${MANIFEST_FILE}`);
      console.log(`  kin-lock.json`);
      if (result.mainPath) {
        console.log(`  ${result.mainPath.replace(result.root + '/', '')}`);
      }
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

const pkgCmd = program
  .command('pkg')
  .description('Manage Kin package dependencies.');

pkgCmd
  .command('install')
  .description(
    'Install dependencies from kin.json into kin_modules/ and refresh the lockfile.',
  )
  .action(() => {
    try {
      const report = installAll({ cwd: process.cwd() });
      if (report.results.length === 0) {
        console.log('No dependencies listed in kin.json.');
        process.exit(0);
      }
      for (const r of report.results) {
        const mark =
          r.action === 'installed'
            ? '+'
            : r.action === 'updated'
              ? '~'
              : '=';
        console.log(
          `${mark} ${r.name}@${r.version} (${r.sourceType}) → ${MODULES_DIR}/${r.name}`,
        );
      }
      console.log(
        `Installed ${report.results.length} package(s) into ${MODULES_DIR}/`,
      );
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

pkgCmd
  .command('add')
  .description(
    'Add and install a dependency. Spec: path:./dir, ./dir, or git+https://...[#ref].',
  )
  .argument(
    '<spec>',
    'Dependency source (path or git URL). Optional name via --name.',
  )
  .option('-n, --name <name>', 'Package name (default: from package kin.json)')
  .action((spec: string, opts: { name?: string }) => {
    try {
      const result = addDependency(spec, {
        cwd: process.cwd(),
        name: opts.name,
      });
      console.log(
        `Added ${result.name}@${result.version} (${result.sourceType}) → ${MODULES_DIR}/${result.name}`,
      );
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

pkgCmd
  .command('remove')
  .alias('rm')
  .description('Remove a dependency from kin.json, the lockfile, and kin_modules/.')
  .argument('<name>', 'Package name to remove')
  .action((name: string) => {
    try {
      removeDependency(name, { cwd: process.cwd() });
      console.log(`Removed ${name}`);
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

pkgCmd
  .command('list')
  .alias('ls')
  .description('List locked packages for this project.')
  .action(() => {
    try {
      const root = findProjectRoot(process.cwd());
      if (!root) {
        console.error(
          `Kin Error: No ${MANIFEST_FILE} found. Run "kin init" first.`,
        );
        process.exit(1);
      }
      const packages = listPackagesNamed({ cwd: process.cwd() });
      if (packages.length === 0) {
        console.log('No packages installed.');
        process.exit(0);
      }
      for (const p of packages) {
        console.log(
          `${p.name}@${p.version}\t${p.sourceType}\t${p.source}`,
        );
      }
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

// Top-level aliases for common package workflows
program
  .command('install')
  .description('Alias for "kin pkg install".')
  .action(() => {
    // Delegate by re-parsing would be awkward; call the same handler logic.
    try {
      const report = installAll({ cwd: process.cwd() });
      if (report.results.length === 0) {
        console.log('No dependencies listed in kin.json.');
        process.exit(0);
      }
      for (const r of report.results) {
        const mark =
          r.action === 'installed'
            ? '+'
            : r.action === 'updated'
              ? '~'
              : '=';
        console.log(
          `${mark} ${r.name}@${r.version} (${r.sourceType}) → ${MODULES_DIR}/${r.name}`,
        );
      }
      console.log(
        `Installed ${report.results.length} package(s) into ${MODULES_DIR}/`,
      );
      process.exit(0);
    } catch (error: unknown) {
      printPkgError(error);
      process.exit(1);
    }
  });

program.parse();

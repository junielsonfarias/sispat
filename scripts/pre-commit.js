#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('🔍 Running pre-commit checks...'));

const runCommand = (command, description) => {
  try {
    console.log(chalk.yellow(`${description}...`));
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${description} passed!`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ ${description} failed!`));
    return false;
  }
};

const checks = [
  { cmd: 'pnpm run lint', desc: '📋 Checking code style' },
  { cmd: 'pnpm run format:check', desc: '🎨 Checking code formatting' },
];

let allPassed = true;

for (const check of checks) {
  if (!runCommand(check.cmd, check.desc)) {
    allPassed = false;
  }
}

if (allPassed) {
  console.log(chalk.green('🎉 All pre-commit checks passed!'));
  process.exit(0);
} else {
  console.log(chalk.red('💥 Some pre-commit checks failed!'));
  process.exit(1);
}

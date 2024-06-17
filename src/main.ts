import * as core from '@actions/core';
import * as exec from '@actions/exec';
import type { ExecOptions } from '@actions/exec';
import { intoCommands, intoArgs } from './helper';

export type Execution = {
  command: string;
  code: number;
  stdout: string;
  stderr: string;
};

async function executeCommand(
  command: string,
  backend: string,
): Promise<Execution> {
  let stdout = '';
  let stderr = '';

  const options: ExecOptions = {
    env: {
      GIT_BACKEND: backend,
    },
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
      stderr: (data: Buffer) => {
        stderr += data.toString();
      },
    },
  };

  const code = await exec.exec('git-metrics', intoArgs(command), options);
  return {
    command,
    code,
    stdout,
    stderr,
  };
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const output: Execution[] = [];
  try {
    const script = core.getInput('script', { required: true });
    const backend = core.getInput('backend', { required: false });
    const continueOnError = core.getBooleanInput('continueOnError', {
      required: false,
    });

    for (const command of intoCommands(script)) {
      core.debug(`executing command ${command}`);
      const result = await executeCommand(command, backend);
      core.debug(`exit code ${result.code}`);
      output.push(result);
      if (result.code !== 0 && !continueOnError) {
        core.setFailed(
          `command ${command} failed with exit code ${result.code}`,
        );
        break;
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
  core.setOutput('result', JSON.stringify(output));
}

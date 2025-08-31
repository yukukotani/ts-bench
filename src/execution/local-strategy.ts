import type { ExecutionStrategy, Command, PrepareContext, PreparedCommand } from './types';

export class LocalExecutionStrategy implements ExecutionStrategy {
  prepare(core: Command, ctx: PrepareContext): PreparedCommand {
    return {
      command: core.args,
      options: {
        cwd: `${process.cwd()}/${ctx.exercisePath}`,
        env: core.env ? { ...core.env } : undefined
      }
    };
  }
}


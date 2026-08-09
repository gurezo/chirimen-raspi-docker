import {
  createNodeRuntimeContext,
  type NodeRuntimeContext,
} from 'node-runtime';

export type { NodeRuntimeContext };

/**
 * server 用 Runtime Context を生成する。
 * GPIO / I2C 解決は libs/node-runtime に委譲する。
 */
export async function createRuntimeContext(): Promise<NodeRuntimeContext> {
  return createNodeRuntimeContext();
}

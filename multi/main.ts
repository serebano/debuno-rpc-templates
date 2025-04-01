import { serve, config } from '@debuno/rpc'
import denoConfig from './deno.json' with {type: 'json'}

const rpcrc = config(denoConfig.rpc)

serve(...rpcrc)

console.log({ rpcrc })

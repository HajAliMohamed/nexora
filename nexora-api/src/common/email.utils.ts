// eslint-disable-next-line @typescript-eslint/no-require-imports
const undici = require('undici');

let agent: any = null;

function getAgent(): any {
  if (!agent) {
    agent = new undici.Agent({ connect: { family: 4 } });
  }
  return agent;
}

export function emailFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, dispatcher: getAgent() } as any);
}

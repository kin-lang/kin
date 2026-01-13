/****************************************
 *                  Log                 *
 *      utility for loggin messages     *
 ****************************************/

export const LogMessage = console.log;
export const LogError = (...args: unknown[]) => {
  const message = args.map((arg: unknown) => (arg as any).toString()).join(' ');
  throw new Error(message);
};

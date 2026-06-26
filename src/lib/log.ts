/****************************************
 *                  Log                 *
 *      utility for loggin messages     *
 ****************************************/

export const LogMessage = console.log;
export const LogError = (...args: unknown[]) => {
  const message = args.map((arg) => String(arg)).join(' ');
  throw new Error(message);
};

/****************************************
 *                  Log                 *
 *      utility for loggin messages     *
 ****************************************/

export const LogMessage = console.log;
export const LogError = (...args: unknown[]) => {
  console.error(...args);
  process.exit(1);
};

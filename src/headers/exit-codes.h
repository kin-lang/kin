#ifndef INTERPRETER_EXIT_CODES_H
#define INTERPRETER_EXIT_CODES_H

// Exit codes for the klang interpreter
#define EXIT_SUCCESS 0                  // Successful execution
#define EXIT_GENERIC_ERROR 1            // Generic error
#define EXIT_SYNTAX_ERROR 2             // Syntax error
#define EXIT_RUNTIME_ERROR 3            // Runtime error
#define EXIT_INVALID_ARGUMENTS 4       // invalid arguments
#define EXIT_FILE_NOT_FOUND  5              // file not found
#define EXIT_UNABLE_TO_READ_FILE 6     // unable to open a file
#define EXIT_NO_ENOUGH_MEMORY 7        // no enough memory

#endif // INTERPRETER_EXIT_CODES_H
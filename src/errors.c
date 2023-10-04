#include <stdio.h>
#include <stdlib.h>


#include "headers/errors.h"
#include "headers/exit-codes.h"
#include "headers/error-codes.h"


// reporting Sytax Error
void syntaxError(ErrorCodes reason, char character , int line) {
    switch (reason) {
        case ERROR_UNEXPECTED_CHARACTER:
            fprintf(stderr, "SyntaxError: Unexpected character '%c' on line %d\n", character, line);
            exit(EXIT_FAILURE);
            break;
        case ERROR_UNTERMINATED_STRING_LITERAL:
            fprintf(stderr, "SyntaxError: Unterminated string literal on line %d\n", line);
            exit(EXIT_FAILURE);
        default:
            break;
    }
}

//report File Operation Error
void fileOperationError(ErrorCodes reason, const char* fileLocation) {
    switch (reason) {
        case ERROR_FAILED_TO_READ_FILE:
            fprintf(stderr, "File Operation Error: No enough memory to read \'%s\' \n", fileLocation);
            exit(EXIT_UNABLE_TO_READ_FILE);
        case ERROR_FILE_NOT_FOUND:
            fprintf(stderr, "File Operation Error: File \" %s \" not found. \n", fileLocation);
            exit(EXIT_FILE_NOT_FOUND);
        case ERROR_NO_ENOUGH_MEMORY_TO_RUN_A_FILE:
            fprintf(stderr, "File Operation Error: no enough memory to read \"%s\" \n", fileLocation);
            exit(EXIT_NO_ENOUGH_MEMORY);
        default:
            break;
    }
}

void argumentsError(ErrorCodes reason) {
    switch (reason) {
        case ERROR_INVALID_TERMINAL_ARGUMENTS:
            fprintf(stderr, "Invalid Arguments Error: Please enter reply or provide a file \n");
            exit(EXIT_INVALID_ARGUMENTS);
            break;
        default:
            break;
    }
}

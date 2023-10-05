#include "error-codes.h"

#ifndef KIN_ERRORS
#define KIN_ERRORS



void syntaxError(ErrorCodes reason, char character , int line);
void fileOperationError(ErrorCodes reason, const char* fileLocation);
void argumentsError(ErrorCodes reason);

#endif
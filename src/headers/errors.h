#include "error-codes.h"

#ifndef KIN_ERRORS
#define KIN_ERRORS



void syntaxError(ErrorCodes reason, char character , int line); // reporting Sytax Error
void fileOperationError(ErrorCodes reason, const char* fileLocation); // report File Operation Errror
void argumentsError(ErrorCodes reason); // report Invalid Arguments Error

#endif
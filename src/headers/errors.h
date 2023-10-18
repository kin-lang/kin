/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#include "error-codes.h"

#ifndef KIN_ERRORS
#define KIN_ERRORS



void syntaxError(ErrorCodes reason, char character , int line);
void fileOperationError(ErrorCodes reason, const char* fileLocation);
void argumentsError(ErrorCodes reason);

#endif
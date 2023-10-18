/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#ifndef KIN_ERROR_CODES
#define KIN_ERROR_CODES

typedef enum {
    ERROR_UNEXPECTED_CHARACTER, ERROR_UNTERMINATED_STRING_LITERAL,
    ERROR_FILE_NOT_FOUND, ERROR_NO_ENOUGH_MEMORY_TO_RUN_A_FILE,
    ERROR_FAILED_TO_READ_FILE, ERROR_INVALID_TERMINAL_ARGUMENTS
} ErrorCodes;

#endif
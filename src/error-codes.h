/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#ifndef KIN_INTERPRETER_UTILS_H
#define KIN_INTERPRETER_UTILS_H

#define EXIT_SUCCESS 0                  
#define EXIT_FAILURE 1                
#define EXIT_SYNTAX_ERROR 2             
#define EXIT_RUNTIME_ERROR 3           
#define EXIT_INVALID_ARGUMENTS 4       
#define EXIT_FILE_NOT_FOUND  5              
#define EXIT_UNABLE_TO_READ_FILE 6     
#define EXIT_NO_ENOUGH_MEMORY 7        
#define EXIT_GENERIC_ERROR 8      

typedef enum {
    ERROR_UNEXPECTED_CHARACTER, ERROR_UNTERMINATED_STRING_LITERAL,
    ERROR_FILE_NOT_FOUND, ERROR_NO_ENOUGH_MEMORY_TO_RUN_A_FILE,
    ERROR_FAILED_TO_READ_FILE, ERROR_INVALID_TERMINAL_ARGUMENTS,
    ERROR_INSUFFICIENT_MEMORY
} ErrorCodes;

#endif
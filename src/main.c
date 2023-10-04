#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

// .h files imports
#include "headers/exit-codes.h"
#include "headers/lexer.h"
#include "headers/parser.h"
#include "headers/error-codes.h"
#include "headers/errors.h"


// constants
#define OL 0 // file reading



// Our Kin-lang REPL.
static void repl() {
  char line[1024]; // storing megabyte -> 1024 characters
  while (true) {
    printf("kin >> ");

    if (!fgets(line, sizeof(line), stdin)) {
      printf("\n");
      break;
    }

    // interpret(line);
    printf("%s", line);
  }
}

// readFile Content
static char* readFile(char const *fileLocation) {
    FILE *source_file = fopen (fileLocation,"r+b" );
    
    // < no file
    if(source_file == NULL) {
        fileOperationError(ERROR_FILE_NOT_FOUND, fileLocation);
    }
    // > no file

    // < file size
        fseek(source_file, OL, SEEK_END);
        size_t file_size = ftell(source_file);
        rewind(source_file);
    // > file size

    char* buffer = (char*)malloc(file_size + 1);

    //< no buffer
    if( buffer == NULL) {
        fileOperationError(ERROR_NO_ENOUGH_MEMORY_TO_RUN_A_FILE, fileLocation);
    }
    //>

    size_t bytes_read = fread(buffer, sizeof(char), file_size ,source_file);

    //< failed to read file
    if( bytes_read < file_size ){
        fileOperationError(ERROR_FAILED_TO_READ_FILE, fileLocation);
    }
    //> failed to read file

    buffer[bytes_read] = '\0';

    fclose(source_file);

    return buffer;
}

static void runFile(char const *file_location) {
    char *source_code_buffer = readFile(file_location); // defined in common
    parser(source_code_buffer);
}

int main(int argc, char const *argv[]){
    // entry point of our interpreter
    
    if (argc == 1) {
        repl(); //enter our repl
    }else if(argc == 2) {
        runFile(argv[1]); // run codes that are in provided file location
    }else {
        argumentsError(ERROR_INVALID_TERMINAL_ARGUMENTS);
    }

    return 0;
}
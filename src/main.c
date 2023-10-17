#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

/* .h files imports */
#include "headers/common.h"
#include "headers/exit-codes.h"
#include "headers/lexer.h"
#include "headers/parser.h"
#include "headers/error-codes.h"
#include "headers/errors.h"


/* constants */
#define OL 0

/* Global variables */
SOURCE_CODE_INFO source_code_info;


/* Our Kin-lang REPL. */
static void repl() {
  char line[1024]; /* storing megabyte -> 1024 characters */
  while (true) {
    printf("kin >> ");

    if (!fgets(line, sizeof(line), stdin)) {
      printf("\n");
      break;
    }

    /* interpret(line); */
    printf("%s", line);
  }
}

/* readFile Content */
static char* readFile(char const *fileLocation) {
    FILE *source_file = fopen (fileLocation,"r+b" );
    
    /* no file */
    if(source_file == NULL) {
        fileOperationError(ERROR_FILE_NOT_FOUND, fileLocation);
    }

    /* file size */
    fseek(source_file, OL, SEEK_END);
    size_t file_size = ftell(source_file);
    rewind(source_file);


    char* buffer = (char*)malloc(file_size + 1);

    /* no buffer */
    if( buffer == NULL) {
        fileOperationError(ERROR_NO_ENOUGH_MEMORY_TO_RUN_A_FILE, fileLocation);
    }

    size_t bytes_read = fread(buffer, sizeof(char), file_size ,source_file);

    /* failed to read file */
    if( bytes_read < file_size ){
        fileOperationError(ERROR_FAILED_TO_READ_FILE, fileLocation);
    }

    buffer[bytes_read] = '\0';

    fclose(source_file);

    /* Update source code info globally */
        source_code_info.buffer = buffer;
        source_code_info.size = file_size;
    /* Update source code info globally */

    return buffer;
}

static void runFile(char const *file_location) {
    char *source_code_buffer = readFile(file_location); /*defined in common*/
    parser(); /* parser Input */
}


/* function to display the help to user */
static void displayUsage() {
    printf("Usage: kin [options] [file]\n\n");
    printf("Options:\n");
    printf("  -h, --help        Display this help message and exit.\n");
    printf("  -v, --version     Display the interpreter version.\n");
    printf("\nCommands:\n");
    printf("  help              Display this help message.\n\n");
    printf("Examples:\n");
    printf("  kin script.kin    Run the 'script.kin' file.\n");
    
    /* exit after displaying the help to the user */
    exit(0);
}

int main(int argc, char const *argv[]){
    /* entry point of our interpreter */
    
    if (argc == 1) {
        repl(); /* enter our repl */
    }else if(arc == 2) {
        runFile(argv[1]); /* run codes that are in provided file location */
    } else if(argc == 3) {
        if (strcmp(argv[1], "help") == 0 || strcmp(argv[1], "-h") == 0 || strcmp(argv[1], "--help") == 0) {
            displayUsage();
        } else {
            argumentsError(ERROR_UNKNOWN_COMMAND);
        }
    }else {
        argumentsError(ERROR_INVALID_TERMINAL_ARGUMENTS);
    }

    return 0;
}
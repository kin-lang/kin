#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

// .h files imports
#include "exit-codes.h"


// constants
#define OL 0



// Our Klang REPL.
static void repl() {
  char line[1024]; // storing megabyte -> 1024 characters
  while (true) {
    printf("klang >> ");

    if (!fgets(line, sizeof(line), stdin)) {
      printf("\n");
      break;
    }

    // interpret(line);
    printf("%s", line);
  }
}

// readFile Content
static char* readFile(char* const fileLocation) {
    FILE *source_file = fopen (fileLocation,"r+b" );
    
    // < no file
    if(source_file == NULL) {
        printf ("Error opening the file\n");
        exit(EXIT_FILE_NOT_FOUND);
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
        fprintf(stderr, "No enough memory to read \'%s\' \n", fileLocation);
        exit(EXIT_UNABLE_TO_READ_FILE);
    }
    //>

    size_t bytes_read = fread(buffer, sizeof(char), file_size ,source_file);

    //< failed to read file
    if( bytes_read < file_size ){
        fprintf(stderr, "Unable to read file \'%s\' \n", fileLocation);
        exit(EXIT_UNABLE_TO_READ_FILE);
    }
    //> failed to read file

    buffer[bytes_read] = '\0';

    fclose(source_file);

    return buffer;
}


static void runFile(char const *file_location) {
    char* buffer = readFile(file_location);
    printf("%s", buffer);
}

int main(int argc, char const *argv[]){
    // entry point of our interpreter
    
    if (argc == 1) {
        repl(); //enter our repl
    }else if(argc == 2) {
        runFile(argv[1]); // run codes that are in provided file location
    }else {
        printf("please enter reply or provide a file \n");
        exit(EXIT_INVALID_ARGUMENTS);
    }

    return 0;
}

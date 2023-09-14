cmake_minimum_required(VERSION 3.0.0)
project(
    ruanda-lang
    VERSION 1.0
    DESCRIPTION "Programming Language in Kinyarwanda ( the native language for Rwandans )."
    LANGUAGES C CXX
)


# Use `ccache` if it is installed in system's PATH.
find_program(CCACHE_PROGRAM ccache)
if (CCACHE_PROGRAM)
  set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE "${CCACHE_PROGRAM}")
endif()

# Export compilation database in JSON format.
set(CMAKE_EXPORT_COMPILE_COMMANDS on)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Allow arbitrary characters in test names.
cmake_policy(SET CMP0110 NEW)

add_executable(
    /src/main.c
    /src/utils.c
    /src/lexer_parser/lexer.c
    /src/lexer_parser/parser.c
)
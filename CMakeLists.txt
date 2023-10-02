cmake_minimum_required(VERSION 3.19)
project(kin C)

# Set C standard to C11
set(CMAKE_C_STANDARD 11)

# Add executable and list source files
add_executable(kin
    src/lexer.c
    src/parser.c
    src/main.c
)

# Specify include directories (if needed)
target_include_directories(kin PRIVATE include)

# Add compiler-specific options
if (CMAKE_COMPILER_IS_GNUCC)
    target_compile_options(kin PRIVATE -Wall -Wextra)
elseif (MSVC)
    target_compile_options(kin PRIVATE /W4)
endif()

# Specify output directory for the executable
set(EXECUTABLE_OUTPUT_PATH ${CMAKE_BINARY_DIR}/bin)

# Optional: Generate compile_commands.json for better IDE integration
# set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
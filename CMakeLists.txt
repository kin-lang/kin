cmake_minimum_required(VERSION 3.19)
project(klang C)

# Set C standard to C11
set(CMAKE_C_STANDARD 11)

# Add executable and list source files
add_executable(klang
    src/main.c
    src/lexer.c
    src/parser.c
)

# Specify include directories (if needed)
target_include_directories(klang PRIVATE include)

# Add compiler-specific options if necessary (e.g., for warnings or optimizations)
if (CMAKE_COMPILER_IS_GNUCC)
    target_compile_options(klang PRIVATE -Wall -Wextra)
elseif (MSVC)
    target_compile_options(klang PRIVATE /W4)
endif()

# Specify output directory for the executable (optional)
set(EXECUTABLE_OUTPUT_PATH ${CMAKE_BINARY_DIR}/bin)

# Optional: Generate compile_commands.json for better IDE integration
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
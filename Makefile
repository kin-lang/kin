exec =  kin.out
sources = $(wildcard src/*.c)
objects = $(sources:.c=.o)
flags = -g


$(exec): $(objects)
	gcc $(objects) $(flags) -o $(exec)

%.o: %.c ./%.h
	gcc -c $(flags) $< -o $@

install:
	make
	cp ./kin.out /usr/local/bin/kin

clean:
	-rm *.out
	-rm *.o
	-rm src/*.o

# Kin

**Kin** is a straightforward programming language created with the purpose of aiding Kinyarwanda speakers in easily learning programming.
> **Note** Kin is designed to enable individuals to write computer programs in Kinyarwanda, the native language of Rwandans. The aim is to facilitate an easy introduction to programming for people. While it is well-suited for teaching or learning programming, its suitability for use in a production environment is not guaranteed.

## What does it look like

```Kin
# Program to calculate factorial in Kin Programming Language

porogaramu_ntoya factorial(umubare) {               # Factorial function
    niba (umubare == 1) {                           # Check if a given number is equal to 1
        tanga 1;                                    # Return one if the condition above was true
    } niba_byanze {                                 # If  above condition has failed
        tanga umubare * factorial(umubare - 1);     # Call factorial again to find the factorial of a given number - 1
    }
}


reka umubare1 = 10;                                  # Declare variable umubare1 and assign 10 to it.

reka ibisubizo = factorial(umubare1);                # Call factorial function to find the factorial of umubare1

tangaza_amakuru(ibisubizo);                          # Log ibisubizo to the std
```
> **Note** *umubare* is a keyword in Kin, don't use it as an identifier.

## Maintainers

This language is still under development and it's being written by [@pacifiquem](https://github.com/pacifiquem).

## Contributing

Contributions are welcomed, refer to [Contiributing.md](https://github.com/kin-lang/kin/blob/main/contributing.md) for futher info.

## License

This project is under [Apache License 2.0 LICENSE](https://github.com/kin-lang/kin/blob/main/LICENSE).

<br>
<br>

<p align="right" style="color: gray; font: bold;">PACIFIQUE Murangwa - Author</p>

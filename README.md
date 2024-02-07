<p align="center">
  <a href="https://github.com/pacifiquem" target="blank"><img src="https://github.com/kin-lang/kin/blob/main/kin-logo.svg" width="120" alt="Kin Logo" /></a>
</p>

<p align="center">Write computer programs in Kinyarwanda! </p>

## Description

**Kin** is a straightforward programming language created with the purpose of aiding Kinyarwanda speakers in easily learning programming.
> [!Important]
> **Kin** is designed to enable individuals to write computer programs in Kinyarwanda, the native language of Rwandans. The aim is to facilitate an easy introduction to programming for people. While it is well-suited for teaching or learning programming, its suitability for use in a production environment is not guaranteed.

## What does it look like

```kin
# Program to calculate factorial in Kin Programming Language

porogaramu_ntoya factorial(nbr) {
    niba (nbr == 1) {
        tanga 1
    }
        tanga nbr * factorial(nbr - 1)
}

reka input_nbr = injiza_amakuru("Enter a number: ")
reka nbr_factorial = factorial(nbr)
tangaza_amakuru(nbr_factorial)
```

## Maintainers

This language is still under development and it's being written by [@pacifiquem](https://github.com/pacifiquem).

## Contributing

Contributions are welcomed, refer to [Contiributing.md](https://github.com/kin-lang/kin/blob/main/contributing.md) for futher info.

## License

This project is under [Apache License 2.0 LICENSE](https://github.com/kin-lang/kin/blob/main/LICENSE).

<br>
<br>

<p align="right" style="color: gray; font: bold;">PACIFIQUE Murangwa - Author</p>

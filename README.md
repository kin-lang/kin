<p align="center">
  <a href="https://github.com/pacifiquem" target="blank"><img src="https://github.com/kin-lang/kin/blob/main/kin-logo.svg" width="120" alt="Kin Logo" /></a>
</p>

<p align="center">Write computer programs in Kinyarwanda! </p>
<p align="center">
  <a href="https://kinlang.vercel.app/getting-started">Getting Started</a> .
  <a href="https://kinlang.vercel.app/getting-started">Why Kin?</a> .
  <a href="https://kinlang.vercel.app/getting-started#ide-integrations">VS Code support</a> .
  <a href="https://github.com/kin-lang/showcase"> Show us what you did! </a>
</p>

## Description

**Kin** is a straightforward programming language created with the purpose of aiding Kinyarwanda speakers in easily learning programming.
> [!Important]
> **Kin** is designed to enable individuals to write computer programs in Kinyarwanda, the native language of Rwandans. The aim is to facilitate an easy introduction to programming for people. While it is well-suited for teaching or learning programming, its suitability for use in a production environment is not guaranteed.

## What does it look like

```kin

#                        FizzBuzz
#  FizzBuzz problem solved by using Kin Programming language
#


reka limit = injiza_amakuru("Enter the limit (must be a number): ")

reka response;
reka i = 1

subiramo_niba(i <= limit) {
    niba (i%5 == 0 && i%3 == 0) {
        response = "FizzBuzz"
    } nanone_niba (i%5 == 0) {
        response = "Fizz"
    } nanone_niba (i%3 == 0) {
        response = "Buzz"
    } niba_byanze {
        response = i
    }

    i = i + 1

    tangaza_amakuru(response)
}

```

## Maintainers

This language is maintained by [@pacifiquem](https://github.com/pacifiquem).

## Contributing

Contributions are welcomed, refer to [Contiributing.md](https://github.com/kin-lang/kin/blob/main/contributing.md) for futher info.

## License

This project is under [Apache License 2.0 LICENSE](https://github.com/kin-lang/kin/blob/main/LICENSE).

<br>
<br>

<p align="right" style="color: gray; font: bold;">PACIFIQUE Murangwa - Author</p>

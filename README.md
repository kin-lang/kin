<p align="center">
  <img src="https://github.com/kin-lang/kin/blob/main/public/kin-logo.svg" width="120" alt="Kin Logo" />
</p>

<p align="center">Write computer programs in Kinyarwanda! </p>
<p align="center">
  <a href="https://kinlang.vercel.app/getting-started">Getting Started</a> .
  <a href="https://kinlang.vercel.app/#why">Why Kin?</a> .
  <a href="https://kinlang.vercel.app/getting-started#ide-integrations">VS Code support</a> .
  <a href="https://github.com/kin-lang/showcase"> Show us what you did! </a>
</p>

<div align="center">
  
![GitHub](https://img.shields.io/github/license/kin-lang/kin) . ![GitHub last commit](https://img.shields.io/github/last-commit/kin-lang/kin) . ![Version](https://img.shields.io/npm/v/@kin-lang/kin) . ![Stars](https://img.shields.io/github/stars/kin-lang/kin) . ![Issues](https://img.shields.io/github/issues/kin-lang/kin)

</div>

## Description

**Kin** is a straightforward programming language created with the purpose of aiding Rwandans to write computer programs in their native language Kinyarwanda.

## Why Kin?

- **Goal**:
  Kin's main objective is to make learning programming more accessible by using Kinyarwanda, the native language for Rwandans.
- **Focus**:
  It's a straightforward language, prioritizing easy of use over complex features. This makes it suitable for education purpose.
- **Use Cases**:
  While Kin is great for learning the fundamentals, it's suitability for large-scale software development isn't guaranteed.

## What does it look like

- This is implementation of linear search:

  ```Kin
  reka arr = [45, 56, 334, 78, 34, 78, 23, 90]

  reka i = 0

  reka key = 23

  subiramo_niba(i < KIN_URUTONDE.ingano(arr)) {
    niba (arr[i] == key) {
      tangaza_amakuru("Key ", key, " is on ", i + 1, " position")
    }

    i = i + 1
  }
  ```

- Hello \<name\> !
  ```Kin
  reka name = injiza_amakuru("Enter your name: ")
  tangaza_amakuru("Hello ", name, "!")
  ```
- Executing system commands
  ```Kin
  sisitemu("sudo shutdown now")
  ```

## Syntax

Though **Kin** inherited it's syntax and structure from **JavaScript**, they're completely different when it comes to behavior.
Some notable **Kin**'s syntax rules are:

- Semicolon:
  - A semicolon is required when you declare a variable but you don't assign a value to it.
    ```Kin
     reka x; # This will work
    ```
  - A semicolon is required when a function returns but there's not expression to return.
    ```Kin
    porogaramu_ntoya main() {
      tanga; # This will work
    }
    ```
    > In General a semicolon is used to tell Kin that there's an ommited statement.
- White spaces:
  - Kin ignores white spaces, that's why multiple lines can be written at the same line ... these codes are equivalens
    ```Kin
    reka x = 5
    reka x=5
    ```

## Fun fact!

- Multiple statements can be written on the same line.

  ```Kin
  reka name = injiza_amakuru("Enter your name: ") tangaza_amakuru("Hello ", name, "!")
  ```

- Nested statements are also supported.
  ```Kin
  tangaza_amakuru("Hello ", injiza_amakuru("Enter your name: "), "!")
  ```

---

## Contributing

We still have a long way to go with Kin, we're calling for your contributions!
Contributions are welcomed, refer to [Contiributing.md](https://github.com/kin-lang/kin/blob/main/contributing.md) for futher info.

## Maintainers

This language is maintained by [@pacifiquem](https://github.com/pacifiquem).

## License

This project is under [Apache License 2.0 LICENSE](https://github.com/kin-lang/kin/blob/main/LICENSE).

<br>
<br>

<p align="right" style="color: gray; font: bold;">PACIFIQUE Murangwa - Author</p>

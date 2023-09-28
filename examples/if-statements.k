#   Copyright (c) MURANGWA Pacifique. and affiliates.
#   This source code is licensed under the Apache License 2.0 found in the
#   LICENSE file in the root directory of this source tree.


#if-statements in klang

i = injiza_amakuru `Duhe umubare: `;

niba ((i%3 == 0) && (i%5 == 0)) {
    tangaza_amakuru `FizzBuzz`;
}nanone_niba (i%3 == 0) {
    tangaza_amakuru `Buzz`;
}nanone_niba (i%5 == 0) {
    tangaza_amakuru `Fizz`;
}niba_ataribyo {
    tangaza_amakuru `${i}`;
}
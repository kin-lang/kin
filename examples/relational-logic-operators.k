#   Copyright (c) MURANGWA Pacifique. and affiliates.
#   This source code is licensed under the Apache License 2.0 found in the
#   LICENSE file in the root directory of this source tree.


umubare1 = 10;
umubare2 = 20;

niba ( umubare1 >= 10 && umubare2 <=20 ) {
    tangaza_amakuru("umubare1 is GREATER THAN OR EQUAL TO 10 AND umubare2 is LESS THAN OR EQUAL TO 20");
}

niba ( umubare1 >= 10 || umubare2 <=20 ) {
    tangaza_amakuru("umubare1 is GREATER THAN OR EQUAL TO 10 OR umubare2 is LESS THAN OR EQUAL TO 20");
}

niba (umubare1 > 5) {
    tangaza_amakuru("umubare1 is GREATER THAN 5");
}

niba (umubare2 < 30) {
    tangaza_amakuru("umubare2 is LESS THAN 20");
}

this_is_klang = sibyo;

if(!this_is_klang) {
    tangaza_amakuru("this language is NOT klang");
}
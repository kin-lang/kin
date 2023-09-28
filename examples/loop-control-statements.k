#   Copyright (c) MURANGWA Pacifique. and affiliates.
#   This source code is licensed under the Apache License 2.0 found in the
#   LICENSE file in the root directory of this source tree.


#loops control statements in klang

i = 0;

niba (i<100) subiramo {

    niba ((i%3 == 0) && (i%5 == 0)) {
        komeza;
    }nanone_niba ((i%3) == 0) {
        tangaza_amakuru `${i}`;
    }nanone_niba ((i%5 == 0) && (i>90)) {
        hagarara;
    }niba_ataribyo {
        tangaza_amakuru `${i}`;
    }

    i++;
}
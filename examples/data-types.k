#   Copyright (c) MURANGWA Pacifique. and affiliates.
#   This source code is licensed under the Apache License 2.0 found in the
#   LICENSE file in the root directory of this source tree.


#data-types in klang


umubare = 10;
umubare_wibice = 10.1;
ukuri = nibyo;
urutonde = ["Ibigori", "Umuceri", "Ibindi"];
ijambo = "ijambo";
amafaranga = ubusa;

umuntu = {
    amazina: "MURANGWA Pacifique",
    imyaka: 19,
    indeshyo: 187
};

tangaza_amakuru `--
    ${ubwoko(umubare)}
    ${ubwoko(umubare_wibice)}
    ${ubwoko(ukuri)};
    ${ubwoko(urutonde)}
    ${ubwoko(ijambo)}
    ${ubwoko(amafaranga)}
`;
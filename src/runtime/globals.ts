/*************************************************************************************************************
 *                                                    Globals                                                *
 *              Global environment for Kin: constants plus registration of in-built methods                  *
 *************************************************************************************************************/
import { MK_BOOL, MK_NULL, MK_STRING } from './values';
import Environment from './environment';
import {
  hagarara,
  injiza_amakuru,
  sisitemu,
  tangaza_amakuru,
} from './in-built/io';
import { createKinImibare } from './in-built/math';
import { createKinAmagambo } from './in-built/strings';
import { createKinIgihe } from './in-built/time';
import { createKinUrutonde } from './in-built/arrays';
import { createKinInyandiko } from './in-built/files';
import { ubwoko } from './in-built/types';

export function createGlobalEnv(filename: string): Environment {
  const env = new Environment();
  env.declareVar('filename', MK_STRING(filename), true);
  env.declareVar('nibyo', MK_BOOL(true), true);
  env.declareVar('sibyo', MK_BOOL(false), true);
  env.declareVar('ubusa', MK_NULL(), true);

  env.declareVar('ikosa', MK_NULL(), false);

  env.declareVar('tangaza_amakuru', tangaza_amakuru, true);
  env.declareVar('sisitemu', sisitemu, true);
  env.declareVar('injiza_amakuru', injiza_amakuru, true);
  env.declareVar('hagarara', hagarara, true);
  env.declareVar('KIN_IMIBARE', createKinImibare(), true);
  env.declareVar('KIN_AMAGAMBO', createKinAmagambo(), true);
  env.declareVar('KIN_IGIHE', createKinIgihe(), true);
  env.declareVar('KIN_URUTONDE', createKinUrutonde(), true);
  env.declareVar('ubwoko', ubwoko, true);
  env.declareVar('KIN_INYANDIKO', createKinInyandiko(env), true);

  return env;
}

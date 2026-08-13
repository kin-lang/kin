/*************************************************************************************************************
 *                                                    Globals                                                *
 *  Global environment for Kin: constants plus registration of in-built methods.                             *
 *  Implementations live under ./in-built/ so each domain can be found and edited on its own.                *
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
import {
  normalizeTypeSafetyMode,
  TypeSafetyMode,
} from './types';

export interface GlobalEnvOptions {
  /**
   * Type-safety mode for this run.
   * When omitted, uses `KIN_TYPES` env if valid, otherwise `on`.
   * File `# kin-types:` is applied by hosts that pass `ParseResult.typeSafety`
   * (see `runSource`).
   */
  typeSafety?: TypeSafetyMode;
}

export function createGlobalEnv(
  filename: string,
  options: GlobalEnvOptions = {},
): Environment {
  const fromEnv = normalizeTypeSafetyMode(process.env.KIN_TYPES);
  const typeSafety = options.typeSafety ?? fromEnv ?? 'on';
  const env = new Environment(undefined, typeSafety);
  env.declareVar('filename', MK_STRING(filename), true);
  env.declareVar('nibyo', MK_BOOL(true), true);
  env.declareVar('sibyo', MK_BOOL(false), true);
  env.declareVar('ubusa', MK_NULL(), true);

  env.declareVar('ikosa', MK_NULL(), false);

  env.declareVar('tangaza_amakuru', tangaza_amakuru, true);
  env.declareVar('sisitemu', sisitemu, true);
  env.declareVar('injiza_amakuru', injiza_amakuru, true);
  // Process exit. Named hagarara in the env; the lexer keyword shadows it
  // in source, so it is only reachable via the JS API.
  env.declareVar('hagarara', hagarara, true);
  env.declareVar('KIN_IMIBARE', createKinImibare(), true);
  env.declareVar('KIN_AMAGAMBO', createKinAmagambo(), true);
  env.declareVar('KIN_IGIHE', createKinIgihe(), true);
  env.declareVar('KIN_URUTONDE', createKinUrutonde(), true);
  env.declareVar('ubwoko', ubwoko, true);
  env.declareVar('KIN_INYANDIKO', createKinInyandiko(), true);

  return env;
}

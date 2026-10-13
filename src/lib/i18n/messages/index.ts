import common from './common';
import shell from './shell';
import landing from './landing';
import auth from './auth';
import onboarding from './onboarding';
import diagnostic from './diagnostic';
import graph from './graph';
import learn from './learn';
import dashboard from './dashboard';
import review from './review';
import workspace from './workspace';
import legal from './legal';

const namespaces = {
  common,
  shell,
  landing,
  auth,
  onboarding,
  diagnostic,
  graph,
  learn,
  dashboard,
  review,
  workspace,
  legal,
};

type Namespaces = typeof namespaces;
export type Namespace = keyof Namespaces;
/** Every valid key, e.g. 'shell.nav.map'. A typo is a type error. */
export type MessageKey = {
  [N in Namespace]: `${N}.${keyof Namespaces[N]['id'] & string}`;
}[Namespace];

/** { id: { 'shell.nav.map': '...' }, en: {...} }, flattened once at import. */
export const messages: Record<'id' | 'en', Record<string, string>> = { id: {}, en: {} };
for (const [ns, dict] of Object.entries(namespaces)) {
  for (const locale of ['id', 'en'] as const) {
    for (const [k, v] of Object.entries(dict[locale])) messages[locale][`${ns}.${k}`] = v as string;
  }
}

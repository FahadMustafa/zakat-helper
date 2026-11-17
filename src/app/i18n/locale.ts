import { createContext, useContext } from 'react';
import type { Locale } from '../dates';
import type { Messages } from './en';
import { messages } from './index';

export const LocaleContext = createContext<Locale>('en');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Messages {
  return messages(useContext(LocaleContext));
}

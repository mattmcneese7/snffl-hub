import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import u from '../ui.module.css';
import f from './Field.module.css';

/** A search box, 44 tall, corners 10; its label is for screen readers. */
export function SearchField({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={f.wrap}>
      <span className={u.sr}>{label}</span>
      <input type="search" autoComplete="off" enterKeyHint="search" className={f.field} {...rest} />
    </label>
  );
}

/** A picker with its caps label above, 44 tall, corners 10. */
export function SelectField({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className={f.wrap}>
      <span className={u.label}>{label}</span>
      <select className={`${f.field} ${f.select}`} {...rest}>
        {children}
      </select>
    </label>
  );
}

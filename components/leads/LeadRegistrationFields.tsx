'use client';

import React, { useId } from 'react';
import type { LeadRegistrationValues } from '@/lib/services/lead-registration';
import { formatPhoneNumber } from '@/lib/utils';

interface LeadRegistrationFieldsProps {
  values: LeadRegistrationValues;
  onChange: (values: LeadRegistrationValues) => void;
  niches: { name: string }[];
  disabled?: boolean;
}

const inputClassName = 'w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.12)] text-[#E7ECE8] placeholder-[#9BA6A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8EB69B] disabled:opacity-60';

export function LeadRegistrationFields({ values, onChange, niches, disabled }: LeadRegistrationFieldsProps) {
  const id = useId();
  const segments = Array.from(new Set([...niches.map(niche => niche.name), 'Marmorarias / Marmoristas', 'Geral', values.segment]));
  const change = (field: keyof LeadRegistrationValues, value: string) => onChange({ ...values, [field]: value });
  const fields = [
    { key: 'name', label: 'Nome do Contato', placeholder: 'Ex: Dr. Roberto Silva', type: 'text', autoComplete: 'name' },
    { key: 'company_name', label: 'Empresa / Razão Social', placeholder: 'Ex: Silva Odontologia Integrada', type: 'text', autoComplete: 'organization' },
  ] as const;

  return (
    <fieldset disabled={disabled} className="space-y-4 min-w-0">
      {fields.map(field => (
        <div key={field.key}>
          <label htmlFor={`${id}-${field.key}`} className="block text-[#9BA6A0] mb-1 font-medium">{field.label}</label>
          <input id={`${id}-${field.key}`} type={field.type} autoComplete={field.autoComplete} placeholder={field.placeholder}
            value={values[field.key]} onChange={event => change(field.key, event.target.value)} className={inputClassName} />
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-segment`} className="block text-[#9BA6A0] mb-1 font-medium">Segmento / Nicho</label>
          <select id={`${id}-segment`} value={values.segment} onChange={event => change('segment', event.target.value)} className={inputClassName}>
            {segments.map(segment => <option key={segment} value={segment}>{segment === 'Geral' ? 'Outro / Geral' : segment}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-city`} className="block text-[#9BA6A0] mb-1 font-medium">Cidade</label>
          <input id={`${id}-city`} type="text" autoComplete="address-level2" placeholder="Ex: São Paulo" value={values.city}
            onChange={event => change('city', event.target.value)} className={inputClassName} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-whatsapp`} className="block text-[#9BA6A0] mb-1 font-medium">WhatsApp / Telefone</label>
          <input id={`${id}-whatsapp`} type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={values.whatsapp}
            onChange={event => change('whatsapp', formatPhoneNumber(event.target.value))} className={inputClassName} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="block text-[#9BA6A0] mb-1 font-medium">E-mail (opcional)</label>
          <input id={`${id}-email`} type="email" autoComplete="email" placeholder="contato@empresa.com.br" value={values.email}
            onChange={event => change('email', event.target.value)} className={inputClassName} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-instagram`} className="block text-[#9BA6A0] mb-1 font-medium">Instagram (opcional)</label>
          <input id={`${id}-instagram`} type="text" placeholder="@empresa ou link" value={values.instagram}
            onChange={event => change('instagram', event.target.value)} className={inputClassName} />
        </div>
        <div>
          <label htmlFor={`${id}-google-business`} className="block text-[#9BA6A0] mb-1 font-medium">Google Meu Negócio (opcional)</label>
          <input id={`${id}-google-business`} type="text" placeholder="Nome ou link no Google Maps" value={values.google_business}
            onChange={event => change('google_business', event.target.value)} className={inputClassName} />
        </div>
      </div>
    </fieldset>
  );
}

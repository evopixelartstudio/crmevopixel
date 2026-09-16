import { supabase, isSupabaseConfigured } from './client';
import { crmService } from '@/lib/services/crm-service';
import { Lead, Client, Prospect, Opportunity } from '@/types/database';

export class DatabaseService {
  // Leads
  public async getLeads(): Promise<Lead[]> {
    if (!isSupabaseConfigured) {
      return crmService.getLeads();
    }
    try {
      const { data, error } = await supabase.from('leads').select('*').order('score', { ascending: false });
      if (error || !data || data.length === 0) {
        return crmService.getLeads();
      }
      return data as Lead[];
    } catch {
      return crmService.getLeads();
    }
  }

  public async insertLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
    const memoryLead = crmService.addLead(lead);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('leads').insert([memoryLead]);
      } catch (err) {
        console.warn('Erro ao sincronizar lead com Supabase:', err);
      }
    }
    return memoryLead;
  }

  // Prospects
  public async getProspects(): Promise<Prospect[]> {
    if (!isSupabaseConfigured) {
      return crmService.getProspects();
    }
    try {
      const { data, error } = await supabase.from('prospects').select('*').order('icp_score', { ascending: false });
      if (error || !data || data.length === 0) {
        return crmService.getProspects();
      }
      return data as Prospect[];
    } catch {
      return crmService.getProspects();
    }
  }

  public async updateProspectStatus(id: string, status: Prospect['status']): Promise<void> {
    crmService.updateProspectStatus(id, status);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('prospects').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      } catch (err) {
        console.warn('Erro ao atualizar prospect no Supabase:', err);
      }
    }
  }

  // Clientes
  public async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured) {
      return crmService.getClients();
    }
    try {
      const { data, error } = await supabase.from('clients').select('*').order('lifetime_value', { ascending: false });
      if (error || !data || data.length === 0) {
        return crmService.getClients();
      }
      return data as Client[];
    } catch {
      return crmService.getClients();
    }
  }
}

export const dbService = new DatabaseService();

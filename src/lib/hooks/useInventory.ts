import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type UsageLog = Database['public']['Tables']['inventory_usage_log']['Row'];

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function logUsage(itemId: string, jobId: string | null, qty: number, staffId: string) {
    const { error } = await supabase.from('inventory_usage_log').insert({
      inventory_item_id: itemId,
      job_id: jobId,
      quantity_used: qty,
      logged_by: staffId,
    });
    if (error) return { error: error.message };

    // Decrement stock
    const item = items.find(i => i.id === itemId);
    if (item) {
      await supabase
        .from('inventory_items')
        .update({ quantity_on_hand: item.quantity_on_hand - qty })
        .eq('id', itemId);
    }
    await load();
    return { error: null };
  }

  async function updateStock(itemId: string, qty: number) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity_on_hand: qty })
      .eq('id', itemId);
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  const lowStock = items.filter(i => i.quantity_on_hand <= i.reorder_threshold);

  return { items, lowStock, loading, logUsage, updateStock, refresh: load };
}

import { useState, useRef, useEffect } from 'react';
import { getPartsForTrophy, makePartTag, type TrophyPart } from '../../../../lib/trophyParts';
import { TrophyLabels } from './TrophyLabels';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../../../../lib/auth';
import { useClients } from '../../../../lib/hooks/useClients';
import { supabase } from '../../../../lib/supabase';
import { Plus, Trash2, CheckCircle2, ArrowLeft, ArrowRight, Upload, X } from 'lucide-react';

interface ArrivalCheckInProps {
  onComplete: () => void;
}

const SPECIES_LIST = [
  'Baboon','Blesbok','Bontebok','Buffalo','Bushbuck','Bushpig','Caracal','Civet','Crocodile',
  'Duiker','Eland','Elephant','Fallow Deer','Gemsbok','Genet Cat','Giraffe','Grysbok',
  'Hartebeest','Hippo','Hyena','Impala','Jackal','Klipspringer','Kudu','Lechwe','Leopard',
  'Lion','Nguni','Nyala','Oribi','Ostrich','Reedbuck (Common)','Reedbuck (Mountain)',
  'Reedbuck (Vaal)','Sable','Serval','Springbok','Steenbok','Tsessebe','Warthog','Waterbuck',
  'Wild Cat','Wildebeest (Black)','Wildebeest (Blue)','Vervet Monkey','Zebra','Other',
];

const MOUNT_TYPES = [
  'Shoulder Mount','Offset Shoulder Mount','Pedestal Mount','Full Mount','Euro Skull',
  'Bleach Only','Artistic Skull','Rug Mount on Felt','Tan Only','Dip & Pack','Half Mount','Life Cast',
];

const CONDITIONS = ['salted','frozen','fresh','wet_salted','cape_only','other'];

// 2026 Export USD prices — from SA Price List 2026.xlsx (Export Prices folder)
const EXPORT_PRICE_DATA: Record<string, Record<string, number>> = {
  'Baboon':              { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1500,  euro_skull: 210, bleach_only: 130 },
  'Blesbok':             { shoulder: 755,  offset_shoulder: 870,  pedestal: 900,  full_mount: 2540,  euro_skull: 235, bleach_only: 130 },
  'Buffalo':             { shoulder: 1390, offset_shoulder: 1595, pedestal: 1665, full_mount: 0,     euro_skull: 395, bleach_only: 230 },
  'Bushbuck':            { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Bushpig':             { shoulder: 695,  offset_shoulder: 800,  pedestal: 725,  full_mount: 1620,  euro_skull: 315, bleach_only: 200 },
  'Caracal':             { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Civet':               { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 925,   euro_skull: 175, bleach_only: 95  },
  'Duiker':              { shoulder: 555,  offset_shoulder: 640,  pedestal: 585,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Eland':               { shoulder: 1155, offset_shoulder: 1330, pedestal: 1390, full_mount: 13860, euro_skull: 355, bleach_only: 210 },
  'Elephant':            { shoulder: 15750,offset_shoulder: 0,    pedestal: 0,    full_mount: 0,     euro_skull: 0,   bleach_only: 925 },
  'Fallow Deer':         { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2890,  euro_skull: 235, bleach_only: 130 },
  'Gemsbok':             { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 3700,  euro_skull: 335, bleach_only: 210 },
  'Genet Cat':           { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 870,   euro_skull: 160, bleach_only: 95  },
  'Giraffe':             { shoulder: 4850, offset_shoulder: 5580, pedestal: 5820, full_mount: 0,     euro_skull: 415, bleach_only: 255 },
  'Grysbok':             { shoulder: 440,  offset_shoulder: 505,  pedestal: 530,  full_mount: 750,   euro_skull: 160, bleach_only: 95  },
  'Hartebeest':          { shoulder: 925,  offset_shoulder: 1060, pedestal: 1110, full_mount: 3696,  euro_skull: 310, bleach_only: 185 },
  'Hippo':               { shoulder: 4465, offset_shoulder: 0,    pedestal: 0,    full_mount: 0,     euro_skull: 750, bleach_only: 390 },
  'Hyena':               { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2890,  euro_skull: 290, bleach_only: 185 },
  'Impala':              { shoulder: 750,  offset_shoulder: 865,  pedestal: 900,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Bontebok':            { shoulder: 750,  offset_shoulder: 865,  pedestal: 900,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Jackal':              { shoulder: 555,  offset_shoulder: 640,  pedestal: 665,  full_mount: 1075,  euro_skull: 175, bleach_only: 95  },
  'Klipspringer':        { shoulder: 555,  offset_shoulder: 640,  pedestal: 665,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Kudu':                { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 5200,  euro_skull: 290, bleach_only: 185 },
  'Leopard':             { shoulder: 1675, offset_shoulder: 0,    pedestal: 0,    full_mount: 4040,  euro_skull: 245, bleach_only: 140 },
  'Lion':                { shoulder: 1675, offset_shoulder: 0,    pedestal: 2010, full_mount: 6355,  euro_skull: 315, bleach_only: 200 },
  'Nyala':               { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 3465,  euro_skull: 245, bleach_only: 140 },
  'Oribi':               { shoulder: 580,  offset_shoulder: 665,  pedestal: 695,  full_mount: 980,   euro_skull: 175, bleach_only: 95  },
  'Reedbuck (Common)':   { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2020,  euro_skull: 235, bleach_only: 130 },
  'Reedbuck (Mountain)': { shoulder: 635,  offset_shoulder: 730,  pedestal: 765,  full_mount: 1100,  euro_skull: 175, bleach_only: 95  },
  'Reedbuck (Vaal)':     { shoulder: 580,  offset_shoulder: 665,  pedestal: 695,  full_mount: 980,   euro_skull: 175, bleach_only: 95  },
  'Sable':               { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 4390,  euro_skull: 310, bleach_only: 185 },
  'Serval':              { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 1215,  euro_skull: 175, bleach_only: 95  },
  'Springbok':           { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2020,  euro_skull: 235, bleach_only: 130 },
  'Steenbok':            { shoulder: 555,  offset_shoulder: 640,  pedestal: 585,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Tsessebe':            { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 2080,  euro_skull: 290, bleach_only: 185 },
  'Warthog':             { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1620,  euro_skull: 315, bleach_only: 200 },
  'Waterbuck':           { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 4045,  euro_skull: 290, bleach_only: 185 },
  'Wild Cat':            { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 780,   euro_skull: 160, bleach_only: 95  },
  'Wildebeest (Black)':  { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 3240,  euro_skull: 290, bleach_only: 185 },
  'Wildebeest (Blue)':   { shoulder: 980,  offset_shoulder: 1130, pedestal: 1180, full_mount: 4045,  euro_skull: 310, bleach_only: 185 },
  'Vervet Monkey':       { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 665,   euro_skull: 160, bleach_only: 95  },
  'Zebra':               { shoulder: 1100, offset_shoulder: 1265, pedestal: 1315, full_mount: 4390,  euro_skull: 355, bleach_only: 210 },
};

// 2026 Local ZAR prices (VAT exclusive) — from Colletts_Local_Pricelists_2025-2029_FINAL2.xlsx
const LOCAL_PRICE_DATA: Record<string, Record<string, number>> = {
  'Baboon':              { shoulder: 4585,  pedestal: 5566,  full_mount: 11485, euro_skull: 1880, bleach_only: 1547 },
  'Blesbok':             { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1346 },
  'Buffalo':             { shoulder: 14079, pedestal: 17075, full_mount: 104497,euro_skull: 4033, bleach_only: 3396 },
  'Bushbuck':            { shoulder: 6595,  pedestal: 8004,  full_mount: 19871, euro_skull: 1681, bleach_only: 1346 },
  'Bushpig':             { shoulder: 6295,  pedestal: 7647,  full_mount: 17810, euro_skull: 2389, bleach_only: 1577 },
  'Caracal':             { shoulder: 0,     pedestal: 0,     full_mount: 12128, euro_skull: 1413, bleach_only: 1213 },
  'Civet':               { shoulder: 0,     pedestal: 0,     full_mount: 11472, euro_skull: 1413, bleach_only: 1213 },
  'Crocodile':           { shoulder: 0,     pedestal: 0,     full_mount: 1844,  euro_skull: 4627, bleach_only: 3924 },
  'Duiker':              { shoulder: 4886,  pedestal: 6059,  full_mount: 11848, euro_skull: 1413, bleach_only: 1110 },
  'Eland':               { shoulder: 11804, pedestal: 15748, full_mount: 104497,euro_skull: 3015, bleach_only: 2699 },
  'Elephant':            { shoulder: 114484,pedestal: 138848,full_mount: 809832,euro_skull: 0,    bleach_only: 0    },
  'Fallow Deer':         { shoulder: 6595,  pedestal: 8004,  full_mount: 19476, euro_skull: 1891, bleach_only: 1552 },
  'Gemsbok':             { shoulder: 8547,  pedestal: 10369, full_mount: 41100, euro_skull: 2498, bleach_only: 2231 },
  'Genet Cat':           { shoulder: 0,     pedestal: 0,     full_mount: 8538,  euro_skull: 1256, bleach_only: 1110 },
  'Giraffe':             { shoulder: 25179, pedestal: 30537, full_mount: 130177,euro_skull: 4766, bleach_only: 4191 },
  'Grysbok':             { shoulder: 4678,  pedestal: 5670,  full_mount: 10830, euro_skull: 1413, bleach_only: 1110 },
  'Hartebeest':          { shoulder: 7866,  pedestal: 9539,  full_mount: 36177, euro_skull: 2498, bleach_only: 1547 },
  'Hippo':               { shoulder: 33206, pedestal: 40276, full_mount: 185109,euro_skull: 8526, bleach_only: 5525 },
  'Hyena':               { shoulder: 10314, pedestal: 12516, full_mount: 26561, euro_skull: 2881, bleach_only: 2244 },
  'Impala':              { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1552 },
  'Bontebok':            { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1552 },
  'Jackal':              { shoulder: 4585,  pedestal: 5566,  full_mount: 12625, euro_skull: 1413, bleach_only: 1110 },
  'Klipspringer':        { shoulder: 4886,  pedestal: 5937,  full_mount: 11837, euro_skull: 1413, bleach_only: 1110 },
  'Kudu':                { shoulder: 10614, pedestal: 12874, full_mount: 48668, euro_skull: 2498, bleach_only: 2231 },
  'Lechwe':              { shoulder: 8547,  pedestal: 10369, full_mount: 36177, euro_skull: 2498, bleach_only: 1547 },
  'Leopard':             { shoulder: 12370, pedestal: 15009, full_mount: 40464, euro_skull: 3311, bleach_only: 2881 },
  'Lion':                { shoulder: 17510, pedestal: 21235, full_mount: 58830, euro_skull: 4712, bleach_only: 4184 },
  'Nyala':               { shoulder: 8547,  pedestal: 10369, full_mount: 35607, euro_skull: 2498, bleach_only: 1547 },
  'Oribi':               { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1413, bleach_only: 1110 },
  'Ostrich':             { shoulder: 5532,  pedestal: 6713,  full_mount: 31617, euro_skull: 1413, bleach_only: 609  },
  'Reedbuck (Common)':   { shoulder: 7473,  pedestal: 9071,  full_mount: 32763, euro_skull: 1891, bleach_only: 1547 },
  'Reedbuck (Mountain)': { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1565, bleach_only: 1346 },
  'Reedbuck (Vaal)':     { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1413, bleach_only: 1110 },
  'Sable':               { shoulder: 10614, pedestal: 12874, full_mount: 48668, euro_skull: 2881, bleach_only: 2578 },
  'Serval':              { shoulder: 0,     pedestal: 0,     full_mount: 12874, euro_skull: 1413, bleach_only: 1110 },
  'Springbok':           { shoulder: 5486,  pedestal: 6658,  full_mount: 14415, euro_skull: 1680, bleach_only: 1110 },
  'Steenbok':            { shoulder: 4886,  pedestal: 5937,  full_mount: 11837, euro_skull: 1413, bleach_only: 1110 },
  'Tsessebe':            { shoulder: 6849,  pedestal: 8314,  full_mount: 19786, euro_skull: 2498, bleach_only: 1547 },
  'Warthog':             { shoulder: 5775,  pedestal: 7005,  full_mount: 15051, euro_skull: 2498, bleach_only: 1547 },
  'Waterbuck':           { shoulder: 9009,  pedestal: 10927, full_mount: 41100, euro_skull: 2498, bleach_only: 2226 },
  'Wild Cat':            { shoulder: 0,     pedestal: 0,     full_mount: 7951,  euro_skull: 1413, bleach_only: 1110 },
  'Wildebeest (Black)':  { shoulder: 8547,  pedestal: 10369, full_mount: 36183, euro_skull: 2498, bleach_only: 2226 },
  'Wildebeest (Blue)':   { shoulder: 9009,  pedestal: 10927, full_mount: 41100, euro_skull: 2615, bleach_only: 2226 },
  'Vervet Monkey':       { shoulder: 0,     pedestal: 0,     full_mount: 7951,  euro_skull: 1413, bleach_only: 1110 },
  'Zebra':               { shoulder: 8709,  pedestal: 10563, full_mount: 40731, euro_skull: 2692, bleach_only: 2226 },
};

const MOUNT_PRICE_KEY: Record<string, string> = {
  'Shoulder Mount': 'shoulder',
  'Offset Shoulder Mount': 'shoulder',
  'Pedestal Mount': 'pedestal',
  'Full Mount': 'full_mount',
  'Euro Skull': 'euro_skull',
  'Bleach Only': 'bleach_only',
};

const SPECIES_EMOJI: Record<string, string> = {
  'Buffalo': '🦬', 'Elephant': '🐘', 'Lion': '🦁', 'Leopard': '🐆', 'Giraffe': '🦒',
  'Zebra': '🦓', 'Zebra (Cape)': '🦓', 'Hippo': '🦛', 'Crocodile': '🐊', 'Impala': '🦌',
  'Kudu': '🦌', 'Warthog': '🐗', 'Wildebeest (Blue)': '🐃', 'Wildebeest (Black)': '🐃',
};
const speciesEmoji = (s: string) => SPECIES_EMOJI[s] ?? '🎯';

function getAutoPrice(species: string, mountType: string, clientType: string): number | null {
  const priceKey = MOUNT_PRICE_KEY[mountType];
  if (!priceKey) return null;
  const table = clientType === 'local' ? LOCAL_PRICE_DATA : EXPORT_PRICE_DATA;
  const row = table[species];
  if (!row) return null;
  const val = row[priceKey];
  return val && val > 0 ? val : null;
}

interface Trophy {
  id: string;
  species: string;
  mountType: string;
  quantity: number;
  tagNumber: string;
  condition: string;
  instructions: string;
  priceUsd: number | null;
  priceOverride: string;
  photos: File[];
  photoPreviews: string[];
  parts: TrophyPart[];  // physical parts for this trophy
}

function emptyTrophy(seq: number): Trophy {
  return {
    id: crypto.randomUUID(),
    species: '',
    mountType: '',
    quantity: 1,
    tagNumber: `A-${String(seq).padStart(4, '0')}`,
    condition: 'fresh',
    instructions: '',
    priceUsd: null,
    priceOverride: '',
    photos: [],
    photoPreviews: [],
    parts: [],
  };
}

export function ArrivalCheckIn({ onComplete }: ArrivalCheckInProps) {
  const { user } = useAuth();
  const { clients, createClient } = useClients();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [savedClientNumber, setSavedClientNumber] = useState('');
  const [savedHuntYear, setSavedHuntYear] = useState(new Date().getFullYear());

  // Step 1 — client
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', country: '', client_type: 'export' });

  // Step 2 — trophies
  const [trophies, setTrophies] = useState<Trophy[]>([emptyTrophy(1)]);
  const [speciesSearch, setSpeciesSearch] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [activePhotoTrophyId, setActivePhotoTrophyId] = useState<string | null>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientType = clientMode === 'search' ? (selectedClient as any)?.client_type ?? 'export' : newClient.client_type;
  const clientNumber = clientMode === 'search' ? (selectedClient as any)?.client_number ?? '' : '';
  const clientName = clientMode === 'search' ? (selectedClient?.full_name ?? '') : newClient.full_name;
  const currency = '';

  // Recalculate prices when client type switches between local/export
  useEffect(() => {
    setTrophies(prev => prev.map(t => {
      if (!t.species || !t.mountType || t.priceOverride) return t;
      const auto = getAutoPrice(t.species, t.mountType, clientType);
      return { ...t, priceUsd: auto };
    }));
  }, [clientType]);

  function updateTrophy(id: string, patch: Partial<Trophy>) {
    setTrophies(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...patch };
      if (patch.species !== undefined || patch.mountType !== undefined) {
        const auto = getAutoPrice(updated.species, updated.mountType, clientType);
        updated.priceUsd = auto;
        if (auto !== null) updated.priceOverride = '';
        // Recalculate parts whenever species or mount type changes
        if (updated.species && updated.mountType) {
          updated.parts = getPartsForTrophy(updated.species, updated.mountType);
        }
      }
      return updated;
    }));
  }

  function togglePart(trophyId: string, partCode: string) {
    setTrophies(prev => prev.map(t => {
      if (t.id !== trophyId) return t;
      const exists = t.parts.some(p => p.code === partCode);
      if (exists) {
        // Only allow removing optional parts
        return { ...t, parts: t.parts.filter(p => p.code !== partCode || p.required) };
      } else {
        // Add back an optional part (re-derive from full list and pick the one matching)
        const allParts = getPartsForTrophy(t.species, t.mountType);
        const part = allParts.find(p => p.code === partCode);
        if (!part) return t;
        return { ...t, parts: [...t.parts, part] };
      }
    }));
  }

  function addTrophy() {
    if (trophies.length >= 20) { toast.error('Maximum 20 trophies per session'); return; }
    setTrophies(prev => [...prev, emptyTrophy(prev.length + 1)]);
  }

  function removeTrophy(id: string) {
    setTrophies(prev => prev.filter(t => t.id !== id));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activePhotoTrophyId) return;
    const files = Array.from(e.target.files ?? []);
    setTrophies(prev => prev.map(t => {
      if (t.id !== activePhotoTrophyId) return t;
      const remaining = 3 - t.photos.length;
      const toAdd = files.slice(0, remaining);
      const previews = toAdd.map(f => URL.createObjectURL(f));
      return { ...t, photos: [...t.photos, ...toAdd], photoPreviews: [...t.photoPreviews, ...previews] };
    }));
    e.target.value = '';
  }

  function removePhoto(trophyId: string, idx: number) {
    setTrophies(prev => prev.map(t => {
      if (t.id !== trophyId) return t;
      const photos = t.photos.filter((_, i) => i !== idx);
      const photoPreviews = t.photoPreviews.filter((_, i) => i !== idx);
      return { ...t, photos, photoPreviews };
    }));
  }

  const totalPrice = trophies.reduce((sum, t) => {
    const p = t.priceOverride ? parseFloat(t.priceOverride) : (t.priceUsd ?? 0);
    return sum + p * t.quantity;
  }, 0);

  // Validation
  function step1Valid() {
    if (clientMode === 'search') return !!selectedClientId;
    return !!newClient.full_name.trim();
  }

  function step2Valid() {
    return trophies.length > 0 && trophies.every(t => t.species && t.mountType && t.tagNumber);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // 1. Resolve client
      let clientId = selectedClientId;
      if (clientMode === 'new') {
        const result: any = await createClient(newClient as any);
        if (result.error || !result.data) throw new Error(result.error ?? 'Failed to create client');
        clientId = result.data.id;
      }

      // 2. Create hunt
      const year = new Date().getFullYear();
      const { data: huntData, error: huntError } = await (supabase as any)
        .from('client_hunts')
        .insert({ client_id: clientId, year, status: 'active', client_type: clientType })
        .select()
        .single();
      if (huntError) throw new Error(huntError.message);
      const huntId = huntData.id;

      // 3. Upload photos and create job cards
      for (const trophy of trophies) {
        const photoPaths: string[] = [];

        for (const file of trophy.photos) {
          const ext = file.name.split('.').pop();
          const path = `${clientId}/${huntId}/${trophy.species}-${trophy.tagNumber}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('trophy-references')
            .upload(path, file, { upsert: true });
          if (!uploadError) photoPaths.push(path);
        }

        const priceUsd = trophy.priceOverride ? parseFloat(trophy.priceOverride) : trophy.priceUsd;
        const trophyIdx = trophies.indexOf(trophy) + 1;
        // Generate part tags using client number (may be empty for new clients — will be assigned by DB trigger)
        const resolvedClientNum = clientMode === 'search'
          ? ((selectedClient as any)?.client_number ?? `T${trophyIdx}`)
          : 'NEW'; // will be updated after we know the assigned number

        const partTags = trophy.parts.map(p => ({
          code: p.code,
          label: p.label,
          required: p.required,
          leather_option: p.leatherOption,
          tag: makePartTag(resolvedClientNum, trophy.species, trophyIdx, p.code),
        }));

        await (supabase as any)
          .from('hunt_documents')
          .insert({
            hunt_id: huntId,
            doc_type: 'job_card',
            title: `${trophy.species} - ${trophy.mountType} (Tag: ${trophy.tagNumber})`,
            status: 'pending',
            current_department: 'receiving',
            form_data: {
              species: trophy.species,
              mount_type: trophy.mountType,
              quantity: trophy.quantity,
              tag_number: trophy.tagNumber,
              condition: trophy.condition,
              instructions: trophy.instructions,
              price_usd: priceUsd,
              reference_photo_paths: photoPaths,
              parts: partTags,
            },
          });
      }

      // Capture client number for label printing
      let finalClientNumber = clientNumber;
      if (clientMode === 'new' && clientId) {
        const { data: newClientData } = await (supabase as any)
          .from('clients').select('client_number').eq('id', clientId).single();
        finalClientNumber = newClientData?.client_number ?? 'NEW';
      }
      setSavedClientNumber(finalClientNumber);
      setSavedHuntYear(new Date().getFullYear());

      setDone(true);
      toast.success(`Check-in complete — ${trophies.length} trophy job card${trophies.length > 1 ? 's' : ''} created`);
    } catch (err: any) {
      toast.error(err.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (done) {
    const labelTrophies = trophies.map((t, idx) => ({
      trophyIndex: idx + 1,
      species: t.species,
      mountType: t.mountType,
      tagNumber: t.tagNumber,
      parts: t.parts,
    }));

    return (
      <>
        {showLabels && (
          <TrophyLabels
            clientNumber={savedClientNumber || (clientType === 'local' ? 'L-???' : 'E-???')}
            clientName={clientName}
            huntYear={savedHuntYear}
            trophies={labelTrophies}
            onClose={() => setShowLabels(false)}
          />
        )}
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
          <h2 className="text-2xl font-bold text-white">Check-in Complete</h2>
          <p className="text-slate-400">{trophies.length} trophy{trophies.length > 1 ? ' trophies' : ''} · {trophies.reduce((n, t) => n + t.parts.length, 0)} parts tagged</p>
          {savedClientNumber && (
            <div className="bg-slate-800 rounded-xl px-6 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Client Number</p>
              <p className="text-3xl font-mono font-bold text-white tracking-widest">{savedClientNumber}</p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setShowLabels(true)}>
              <Upload className="w-4 h-4" /> Print QR Labels
            </Button>
            <Button variant="outline" onClick={onComplete}>Go to Receiving</Button>
            <Button variant="ghost" onClick={() => { setDone(false); setStep(1); setTrophies([emptyTrophy(1)]); setSelectedClientId(null); setClientSearch(''); setClientMode('search'); }}>
              New Check-in
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header / Step Indicator */}
      <div className="flex items-center gap-4 mb-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-sm hidden sm:inline ${step === s ? 'text-white font-medium' : 'text-slate-500'}`}>
              {s === 1 ? 'Client' : s === 2 ? 'Trophies' : 'Review'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-slate-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client */}
      {step === 1 && (
        <div className="bg-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Step 1 — Client</h2>

          <div className="flex gap-2">
            <Button size="sm" variant={clientMode === 'search' ? 'default' : 'outline'} onClick={() => setClientMode('search')} className={clientMode === 'search' ? 'bg-blue-600' : ''}>
              Existing Client
            </Button>
            <Button size="sm" variant={clientMode === 'new' ? 'default' : 'outline'} onClick={() => setClientMode('new')} className={clientMode === 'new' ? 'bg-blue-600' : ''}>
              + New Client
            </Button>
          </div>

          {clientMode === 'search' && (
            <div className="space-y-3">
              <Label className="text-slate-300">Search clients</Label>
              <Input
                placeholder="Type a name..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              {clientSearch.length > 0 && (
                <div className="bg-slate-900 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                  {filteredClients.length === 0
                    ? <p className="p-3 text-slate-500 text-sm">No clients found</p>
                    : filteredClients.map(c => (
                      <button
                        key={c.id}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm transition-colors ${selectedClientId === c.id ? 'bg-blue-900/40 text-blue-300' : 'text-slate-200'}`}
                        onClick={() => { setSelectedClientId(c.id); setClientSearch(c.full_name); }}
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {(c as any).country && <span className="text-slate-500 ml-2">· {(c as any).country}</span>}
                      </button>
                    ))}
                </div>
              )}
              {selectedClient && (
                <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-300 space-y-1">
                  <p><span className="text-slate-500">Name:</span> {selectedClient.full_name}</p>
                  {(selectedClient as any).email && <p><span className="text-slate-500">Email:</span> {(selectedClient as any).email}</p>}
                  {(selectedClient as any).phone && <p><span className="text-slate-500">Phone:</span> {(selectedClient as any).phone}</p>}
                </div>
              )}
            </div>
          )}

          {clientMode === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-slate-300">Full Name *</Label>
                <Input value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))} placeholder="Hunter's full name" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Email</Label>
                <Input value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Phone</Label>
                <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 0100" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Country</Label>
                <Input value={newClient.country} onChange={e => setNewClient(p => ({ ...p, country: e.target.value }))} placeholder="USA" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Client Type</Label>
                <Select value={newClient.client_type} onValueChange={(v: string) => setNewClient(p => ({ ...p, client_type: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="export">✈️ Export</SelectItem>
                    <SelectItem value="local">🇿🇦 Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!step1Valid()} onClick={() => setStep(2)}>
              Next: Add Trophies <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Trophies */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Step 2 — Add Trophies</h2>
              <Badge variant="outline" className="text-slate-400 border-slate-600">{trophies.length} / 20</Badge>
            </div>

            {trophies.map((t, idx) => {
              const autoPrice = getAutoPrice(t.species, t.mountType, clientType);
              const displayPrice = t.priceOverride ? parseFloat(t.priceOverride) : autoPrice;
              const specFilter = speciesSearch[t.id] ?? t.species;
              const filteredSpecies = SPECIES_LIST.filter(s => s.toLowerCase().includes((speciesSearch[t.id] ?? '').toLowerCase()));

              return (
                <div key={t.id} className="bg-slate-700/50 rounded-xl p-4 space-y-4 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium text-sm">Trophy {idx + 1}</span>
                    {trophies.length > 1 && (
                      <button onClick={() => removeTrophy(t.id)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Species */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Species *</Label>
                      <div className="relative">
                        <Input
                          value={speciesSearch[t.id] !== undefined ? speciesSearch[t.id] : t.species}
                          onChange={e => setSpeciesSearch(prev => ({ ...prev, [t.id]: e.target.value }))}
                          onFocus={() => { if (!speciesSearch[t.id]) setSpeciesSearch(prev => ({ ...prev, [t.id]: '' })); }}
                          onBlur={() => setTimeout(() => setSpeciesSearch(prev => { const n = { ...prev }; delete n[t.id]; return n; }), 150)}
                          placeholder="Search species..."
                          className="bg-slate-700 border-slate-600 text-white text-sm"
                        />
                        {speciesSearch[t.id] !== undefined && (
                          <div className="absolute z-20 top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg max-h-44 overflow-y-auto shadow-xl">
                            {filteredSpecies.map(s => (
                              <button key={s} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                                onMouseDown={() => { updateTrophy(t.id, { species: s }); setSpeciesSearch(prev => { const n = { ...prev }; delete n[t.id]; return n; }); }}>
                                {speciesEmoji(s)} {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mount Type */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Mount Type *</Label>
                      <Select value={t.mountType} onValueChange={(v: string) => updateTrophy(t.id, { mountType: v })}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {MOUNT_TYPES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Qty */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Quantity</Label>
                      <Input type="number" min={1} max={20} value={t.quantity} onChange={e => updateTrophy(t.id, { quantity: parseInt(e.target.value) || 1 })} className="bg-slate-700 border-slate-600 text-white text-sm" />
                    </div>

                    {/* Tag */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Tag Number *</Label>
                      <Input value={t.tagNumber} onChange={e => updateTrophy(t.id, { tagNumber: e.target.value })} placeholder="A-0042" className="bg-slate-700 border-slate-600 text-white text-sm" />
                    </div>

                    {/* Condition */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Condition</Label>
                      <Select value={t.condition} onValueChange={(v: string) => updateTrophy(t.id, { condition: v })}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Price</Label>
                      <div className="flex items-center gap-2">
                        {displayPrice !== null && !t.priceOverride
                          ? <div className="flex-1 px-3 py-2 bg-slate-600/50 rounded-md text-sm text-slate-300 border border-slate-600">{displayPrice.toLocaleString()}</div>
                          : null}
                        <Input
                          type="number"
                          placeholder={autoPrice === null ? 'Quote' : `Override ${autoPrice}`}
                          value={t.priceOverride}
                          onChange={e => updateTrophy(t.id, { priceOverride: e.target.value })}
                          className={`bg-slate-700 border-slate-600 text-white text-sm ${displayPrice !== null && !t.priceOverride ? 'w-28' : 'flex-1'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trophy Parts */}
                  {t.parts.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Trophy Parts ({t.parts.length})</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {getPartsForTrophy(t.species, t.mountType).map(p => {
                          const active = t.parts.some(tp => tp.code === p.code);
                          return (
                            <button
                              key={p.code}
                              onClick={() => !p.required && togglePart(t.id, p.code)}
                              title={p.description}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                active
                                  ? p.leatherOption && active
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-green-700 text-white border-green-600'
                                  : 'border-slate-600 text-slate-500 line-through opacity-50'
                              } ${p.required ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                            >
                              {p.label}
                              {p.leatherOption && active && <span className="ml-1 text-amber-200 text-[10px]">leather</span>}
                              {p.required && <span className="ml-1 text-[10px] opacity-60">req</span>}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-slate-500 text-[11px]">Tap optional parts to include/exclude. Amber = leather work available.</p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Pose & Instructions</Label>
                    <Textarea value={t.instructions} onChange={e => updateTrophy(t.id, { instructions: e.target.value })} placeholder="e.g. Pedestal mount facing right, ears alert..." rows={2} className="bg-slate-700 border-slate-600 text-white text-sm resize-none" />
                  </div>

                  {/* Photos */}
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs">Reference Photos (max 3)</Label>
                    <div className="flex flex-wrap gap-2">
                      {t.photoPreviews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-600">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(t.id, i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {t.photos.length < 3 && (
                        <button
                          onClick={() => { setActivePhotoTrophyId(t.id); photoInputRef.current?.click(); }}
                          className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-colors"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-xs mt-1">Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />

            <Button variant="outline" className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500" onClick={addTrophy}>
              <Plus className="w-4 h-4 mr-2" /> Add Another Trophy
            </Button>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!step2Valid()} onClick={() => setStep(3)}>
              Review <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Step 3 — Review & Submit</h2>

            <div className="bg-slate-700/40 rounded-lg p-4 space-y-1 text-sm">
              <p className="text-slate-300"><span className="text-slate-500">Client:</span> {clientMode === 'search' ? selectedClient?.full_name : newClient.full_name}</p>
              <p className="text-slate-300"><span className="text-slate-500">Trophies:</span> {trophies.length}</p>
              <p className="text-slate-300"><span className="text-slate-500">Type:</span> {clientType === 'local' ? '🇿🇦 Local' : '✈️ Export'}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500 text-left">
                    <th className="pb-2 font-medium">Trophy</th>
                    <th className="pb-2 font-medium">Mount</th>
                    <th className="pb-2 font-medium">Tag</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {trophies.map(t => {
                    const price = t.priceOverride ? parseFloat(t.priceOverride) : t.priceUsd;
                    const rowTotal = price ? price * t.quantity : null;
                    return (
                      <tr key={t.id} className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-200">{speciesEmoji(t.species)} {t.species}</td>
                        <td className="py-2 text-slate-400">{t.mountType}</td>
                        <td className="py-2 text-slate-400 font-mono text-xs">{t.tagNumber}</td>
                        <td className="py-2 text-slate-300 text-right">{t.quantity}</td>
                        <td className="py-2 text-slate-300 text-right">{rowTotal ? rowTotal.toLocaleString() : <span className="text-slate-500 italic">Quote</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-3 text-slate-400 font-medium">Total</td>
                    <td className="pt-3 text-white font-bold text-right">{totalPrice.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 min-w-48" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Saving...' : 'Save & Generate Job Cards'}
              {!submitting && <CheckCircle2 className="ml-2 w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { word, pos, richData, cefrLevel } = await req.json();
  const normalizedWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
  if (!/^[a-z][a-z -]{0,63}$/i.test(normalizedWord) || !richData) {
    return new Response(JSON.stringify({ error: 'Invalid card data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (JSON.stringify(richData).length > 65536) {
    return new Response(JSON.stringify({ error: 'Card data is too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(url, serviceRoleKey);
  const { data: existing, error: selectError } = await admin
    .from('global_dictionary')
    .select('id')
    .eq('word', normalizedWord)
    .maybeSingle();
  if (selectError) return new Response(JSON.stringify({ error: 'Could not read dictionary' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (existing) return new Response(JSON.stringify({ id: existing.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data, error } = await admin
    .from('global_dictionary')
    .insert({ word: normalizedWord, pos: pos || 'n.', meaning: JSON.stringify(richData), rich_data: richData, cefr_level: cefrLevel || 'Unranked' })
    .select('id')
    .single();
  if (error) return new Response(JSON.stringify({ error: 'Could not save dictionary card' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
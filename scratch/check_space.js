
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpace() {
  console.log('Checking table sizes...');
  
  // Note: pg_stat_user_tables is not always accessible via anon key if RLS is on or if it's restricted.
  // But we can try a simple query to see if we can get some info.
  // Actually, we might need a service role key for this, but let's try.
  
  const { data, error } = await supabase.rpc('check_table_sizes');
  
  if (error) {
    console.log('RPC check_table_sizes not found. Creating a temporary RPC to check sizes...');
    console.log('Please execute this SQL in your Supabase Editor to help me diagnose the space issue:');
    console.log(`
CREATE OR REPLACE FUNCTION check_table_sizes()
RETURNS TABLE (table_name text, total_size text, row_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    relname::text AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    n_live_tup AS row_count
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    return;
  }

  console.table(data);
}

checkSpace();

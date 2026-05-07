
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

async function test() {
  console.log('Testing RPC get_catalog_filters...');
  const { data, error } = await supabase.rpc('get_catalog_filters');
  
  if (error) {
    console.error('RPC Error:', error);
    return;
  }

  console.log('RPC Success!');
  console.log('Brands found:', data.marcas.length);
  console.log('First 5 brands:', data.marcas.slice(0, 5));
  console.log('Years found:', data.años.length);
}

test();

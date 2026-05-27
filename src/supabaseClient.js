import { createClient } from '@supabase/supabase-js'

// ⚠️ CONFIGURAR ANTES DE DESPLEGAR
// Reemplaza con los valores de tu proyecto Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oqcskptqdjqbrsuegdeu.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xY3NrcHRxZGpxYnJzdWVnZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjE3MjQsImV4cCI6MjA5NTQzNzcyNH0.Ig0fjNky8wdUAsuqZgzY-peyLjLCzF5TehFHSZfqCT4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

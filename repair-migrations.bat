@echo off
cd "c:\Users\Eng Joshuu\Desktop\freelancing\freelancing\my-freelance-app"

npx supabase migration repair --status reverted 20260124101344
npx supabase migration repair --status reverted 20260124102310
npx supabase migration repair --status reverted 20260124104407
npx supabase migration repair --status reverted 20260124111400
npx supabase migration repair --status reverted 20260124111638
npx supabase migration repair --status reverted 20260124112935
npx supabase migration repair --status reverted 20260131110520
npx supabase migration repair --status reverted 20260131111500
npx supabase migration repair --status reverted 20260131111905
npx supabase migration repair --status reverted 20260131194827
npx supabase migration repair --status reverted 20260131195546
npx supabase migration repair --status reverted 20260212113251

echo All migrations repaired!
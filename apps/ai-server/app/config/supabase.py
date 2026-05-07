from supabase import create_client, Client
from .settings import settings

# Admin client with service role key
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)
